import { Router } from 'express'
import { z } from 'zod'
import { allowRoles, requireActiveMember, requireAuth } from '../middleware/auth.js'
import { asyncRoute, parse, publicUser } from '../utils/http.js'
import { AuditLog, ClassSession, CommissionLedger, CommissionRule, CommunityPost, Course, Enrollment, Event, EventRegistration, Membership, Notification, Payment, Referral, ServiceRequest, SystemSetting, User, Withdrawal } from '../models/index.js'
import { audit } from '../services/audit.js'
import { saveSetting, setting } from '../services/settings.js'
import { notify, admins, active, asId, pageArgs, queryEnum, queryText } from './routeHelpers.js'

const router = Router()

// Account profile
router.patch('/users/me', requireAuth, asyncRoute(async (req, res) => {
  const changes = parse(z.object({ fullName: z.string().trim().min(2).max(120).optional(), phone: z.string().trim().max(40).optional(), county: z.string().trim().max(80).optional(), country: z.string().trim().max(80).optional() }).strict(), req.body)
  Object.assign(req.user, changes); await req.user.save(); res.json({ user: publicUser(req.user) })
}))
router.get('/users/admin', requireAuth, admins, asyncRoute(async (req, res) => {
  const { limit, skip, page } = pageArgs(req.query); const q = queryText(req.query, 'q', 100)
  const filter = q ? { $or: [{ fullName: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }, { email: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }, { username: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }] } : {}
  const status = queryEnum(req.query, 'status', ['ACTIVE', 'PENDING', 'SUSPENDED'])
  if (status !== 'ALL') filter.membershipStatus = status
  const [users, total] = await Promise.all([User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).skip(skip).limit(limit), User.countDocuments(filter)])
  res.json({ users, total, page, limit })
}))
router.patch('/users/admin/:id/status', requireAuth, admins, asyncRoute(async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING']) }), req.body)
  const user = await User.findById(req.params.id)
  if (!user) return res.status(404).json({ message: 'Member not found.' })
  if (user.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ message: 'Only a super administrator can update this account.' })
  if (user.role !== 'USER') return res.status(400).json({ message: 'Only member accounts can be activated from this screen.' })
  if (status === 'SUSPENDED') {
    user.status = 'SUSPENDED'
    user.membershipStatus = 'SUSPENDED'
    await user.save()
    await audit(req, 'member.status.update', 'User', user.id, { status })
    return res.json({ user: publicUser(user) })
  }
  if (status === 'PENDING') return res.status(400).json({ message: 'Membership status can only be set to active or suspended by an administrator.' })
  const membership = await Membership.findOne({ user: user._id })
  const targetAmount = Number(await setting('membershipFeeKes', Number(process.env.MEMBERSHIP_FEE_KES || 5000)))
  const verifiedPayments = await Payment.aggregate([{ $match: { user: user._id, status: 'VERIFIED', purpose: { $ne: 'SERVICE' } } }, { $group: { _id: null, total: { $sum: '$amount' } } }])
  const alreadyPaid = (verifiedPayments[0]?.total || 0) >= targetAmount
  if (!alreadyPaid) return res.status(409).json({ message: 'The membership activation threshold has not been reached with verified payments. Review the payment ledger before granting access.' })
  const activatedAt = membership?.activatedAt || new Date()
  if (membership) {
    membership.status = 'ACTIVE'
    membership.amount = membership.amount || targetAmount
    membership.activatedAt = activatedAt
    membership.activationMethod = 'PAYMENT'
    await membership.save()
  } else {
    await Membership.create({ user: user._id, amount: targetAmount, status: 'ACTIVE', activationMethod: 'PAYMENT', activatedAt })
  }
  user.status = 'ACTIVE'
  user.membershipStatus = 'ACTIVE'
  await user.save()
  await audit(req, 'member.status.restore', 'User', user.id, { status, activationMethod: 'PAYMENT' })
  await Notification.create({ user: user._id, title: 'Membership access restored', message: 'Your member access has been restored based on your verified payment history.', type: 'membership', link: '/dashboard' })
  res.json({ user: publicUser(user), activationMethod: 'PAYMENT' })
}))

export default router
