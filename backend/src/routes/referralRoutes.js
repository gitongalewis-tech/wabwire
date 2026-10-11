import { Router } from 'express'
import { z } from 'zod'
import { allowRoles, requireActiveMember, requireAuth } from '../middleware/auth.js'
import { asyncRoute, parse, publicUser } from '../utils/http.js'
import { AuditLog, ClassSession, CommissionLedger, CommissionRule, CommunityPost, Course, Enrollment, Event, EventRegistration, Membership, Notification, Payment, Referral, ServiceRequest, SystemSetting, User, Withdrawal } from '../models/index.js'
import { audit } from '../services/audit.js'
import { saveSetting, setting } from '../services/settings.js'
import { notify, admins, active, asId, pageArgs, queryEnum } from './routeHelpers.js'

const router = Router()

// Referral tree and ledger
router.get('/referrals/mine', ...active, asyncRoute(async (req, res) => {
  const referrals = await Referral.find({ referrer: req.user._id }).populate('referredUser', 'fullName username membershipStatus referralCode createdAt').sort({ createdAt: -1 })
  res.json({ referralCode: req.user.referralCode, referralLink: `${process.env.PUBLIC_SITE_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/register?ref=${req.user.referralCode}`, referrals })
}))
router.get('/referrals/tree', ...active, asyncRoute(async (req, res) => {
  const levels = []; let parents = [req.user._id]
  for (let level = 1; level <= 3 && parents.length; level += 1) {
    const users = await User.find({ referredBy: { $in: parents } }).select('fullName username membershipStatus createdAt referredBy').sort({ createdAt: 1 }).limit(300)
    levels.push(users.map(user => ({ id: user.id, name: user.fullName, username: user.username, membershipStatus: user.membershipStatus, joinedAt: user.createdAt, parentId: asId(user.referredBy), level })))
    parents = users.map(user => user._id)
  }
  res.json({ root: { id: req.user.id, name: req.user.fullName, username: req.user.username }, levels })
}))
router.get('/commissions/mine', ...active, asyncRoute(async (req, res) => {
  const entries = await CommissionLedger.find({ beneficiary: req.user._id }).populate('sourceMember', 'fullName username').populate('payment', 'amount mpesaReceiptNumber').sort({ createdAt: -1 })
  res.json({ entries })
}))
router.get('/leaderboard', ...active, asyncRoute(async (_req, res) => {
  const scoring = await setting('leaderboardScoring', { directReferral: 10, levelTwoReferral: 5, courseCompletion: 50, eventAttendance: 10, communityPost: 1 })
  const rows = await User.aggregate([
    { $match: { membershipStatus: 'ACTIVE', role: 'USER' } },
    { $lookup: { from: 'users', let: { uid: '$_id' }, pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$referredBy', '$$uid'] }, { $eq: ['$role', 'USER'] }, { $eq: ['$membershipStatus', 'ACTIVE'] }] } } }, { $count: 'count' }], as: 'directReferralStats' } },
    { $lookup: { from: 'users', let: { uid: '$_id' }, pipeline: [
      { $match: { $expr: { $and: [{ $eq: ['$referredBy', '$$uid'] }, { $eq: ['$role', 'USER'] }, { $eq: ['$membershipStatus', 'ACTIVE'] }] } } },
      { $lookup: { from: 'users', let: { parentId: '$_id' }, pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$referredBy', '$$parentId'] }, { $eq: ['$role', 'USER'] }, { $eq: ['$membershipStatus', 'ACTIVE'] }] } } }, { $count: 'count' }], as: 'children' } },
      { $project: { count: { $ifNull: [{ $first: '$children.count' }, 0] } } },
      { $group: { _id: null, count: { $sum: '$count' } } },
    ], as: 'levelTwoReferralStats' } },
    { $lookup: { from: 'enrollments', let: { uid: '$_id' }, pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$user', '$$uid'] }, { $ne: ['$completedAt', null] }] } } }, { $count: 'count' }], as: 'courseStats' } },
    { $lookup: { from: 'eventregistrations', let: { uid: '$_id' }, pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$user', '$$uid'] }, { $eq: ['$status', 'ATTENDED'] }] } } }, { $count: 'count' }], as: 'eventStats' } },
    { $lookup: { from: 'communityposts', let: { uid: '$_id' }, pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$author', '$$uid'] }, { $eq: ['$removedAt', null] }] } } }, { $count: 'count' }], as: 'postStats' } },
    { $addFields: { referrals: { $ifNull: [{ $first: '$directReferralStats.count' }, 0] }, levelTwoReferrals: { $ifNull: [{ $first: '$levelTwoReferralStats.count' }, 0] }, courses: { $ifNull: [{ $first: '$courseStats.count' }, 0] }, events: { $ifNull: [{ $first: '$eventStats.count' }, 0] }, posts: { $ifNull: [{ $first: '$postStats.count' }, 0] } } },
    { $addFields: { points: { $add: [{ $multiply: ['$referrals', Number(scoring.directReferral ?? 10)] }, { $multiply: ['$levelTwoReferrals', Number(scoring.levelTwoReferral ?? 5)] }, { $multiply: ['$courses', Number(scoring.courseCompletion ?? 50)] }, { $multiply: ['$events', Number(scoring.eventAttendance ?? 0)] }, { $multiply: ['$posts', Number(scoring.communityPost ?? 0)] }] } } },
    { $sort: { points: -1, createdAt: 1 } }, { $limit: 25 },
    { $project: { displayName: '$username', points: 1, referrals: 1, levelTwoReferrals: 1, courses: 1, events: 1, _id: 0 } },
  ])
  res.json({ leaderboard: rows, scoring })
}))
router.get('/commissions/rules', requireAuth, admins, asyncRoute(async (_req, res) => res.json({ rules: await CommissionRule.find().sort({ level: 1 }) })))
router.put('/commissions/rules/:level', requireAuth, allowRoles('SUPER_ADMIN'), asyncRoute(async (req, res) => {
  const level = Number(req.params.level); if (![1, 2, 3].includes(level)) return res.status(400).json({ message: 'Commission level must be between 1 and 3.' })
  const data = parse(z.object({ amount: z.coerce.number().int().min(0).max(1000000), active: z.boolean() }), req.body)
  const rule = await CommissionRule.findOneAndUpdate({ level }, { ...data, currency: 'KES' }, { upsert: true, new: true }); await audit(req, 'commission.rule.update', 'CommissionRule', rule.id, data); res.json({ rule })
}))
router.get('/commissions/admin', requireAuth, admins, asyncRoute(async (req, res) => {
  const { limit, skip, page } = pageArgs(req.query); const status = queryEnum(req.query, 'status', ['PENDING', 'APPROVED', 'PAID', 'REVERSED', 'ALL']); const filter = status !== 'ALL' ? { status } : {}
  const [entries, total] = await Promise.all([CommissionLedger.find(filter).populate('beneficiary', 'fullName username phone').populate('sourceMember', 'fullName username').populate('payment', 'amount mpesaReceiptNumber').sort({ createdAt: -1 }).skip(skip).limit(limit), CommissionLedger.countDocuments(filter)])
  res.json({ entries, total, page })
}))
router.patch('/commissions/admin/:id/status', requireAuth, admins, asyncRoute(async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(['APPROVED', 'PAID', 'REVERSED']) }), req.body)
  const entry = await CommissionLedger.findById(req.params.id)
  const allowed = { PENDING: ['APPROVED', 'REVERSED'], APPROVED: ['PAID', 'REVERSED'] }
  if (!entry || !allowed[entry.status]?.includes(status)) return res.status(409).json({ message: 'This commission cannot move to that status.' })
  if (status === 'APPROVED') {
    const payment = await Payment.findById(entry.payment).select('status')
    if (!payment || payment.status !== 'VERIFIED') return res.status(409).json({ message: 'Only commissions from verified membership payments can be authorized.' })
  }
  entry.status = status; if (status === 'APPROVED') { entry.approvedBy = req.user._id; entry.approvedAt = new Date() } if (status === 'PAID') entry.paidAt = new Date(); await entry.save()
  await audit(req, `commission.${status.toLowerCase()}`, 'CommissionLedger', entry.id, { amount: entry.amount, beneficiary: entry.beneficiary }); await notify(entry.beneficiary, 'Commission updated', `A commission entry is now ${status.toLowerCase()}.`, 'commission', '/dashboard/commissions'); res.json({ entry })
}))

export default router
