import { Router } from 'express'
import { z } from 'zod'
import { allowRoles, requireActiveMember, requireAuth } from '../middleware/auth.js'
import { asyncRoute, parse, publicUser } from '../utils/http.js'
import { AuditLog, ClassSession, CommissionLedger, CommissionRule, CommunityPost, Course, Enrollment, Event, EventRegistration, Membership, Notification, Payment, Referral, ServiceRequest, SystemSetting, User, Withdrawal } from '../models/index.js'
import { audit } from '../services/audit.js'
import { saveSetting, setting } from '../services/settings.js'
import { notify, admins, active, asId, pageArgs } from './routeHelpers.js'

const router = Router()

// Withdrawals: available = approved commissions less requested/paid withdrawals
async function withdrawalBalance(userId) {
  const [commissions, withdrawals] = await Promise.all([CommissionLedger.aggregate([{ $match: { beneficiary: userId, status: { $in: ['APPROVED', 'PAID'] }, type: 'COMMISSION' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]), Withdrawal.aggregate([{ $match: { user: userId, status: { $in: ['PENDING', 'APPROVED', 'PROCESSING', 'PAID'] } } }, { $group: { _id: null, total: { $sum: '$amount' } } }])])
  return Math.max((commissions[0]?.total || 0) - (withdrawals[0]?.total || 0), 0)
}
router.get('/withdrawals/mine', ...active, asyncRoute(async (req, res) => res.json({ available: await withdrawalBalance(req.user._id), withdrawals: await Withdrawal.find({ user: req.user._id }).sort({ createdAt: -1 }) })))
router.post('/withdrawals/mine', ...active, asyncRoute(async (req, res) => {
  const data = parse(z.object({ amount: z.coerce.number().int().positive(), phoneNumber: z.string().trim().min(9).max(40) }), req.body)
  const available = await withdrawalBalance(req.user._id)
  if (data.amount > available) return res.status(400).json({ message: `Your available balance is KES ${available.toLocaleString()}.` })
  const withdrawal = await Withdrawal.create({ user: req.user._id, ...data }); await audit(req, 'withdrawal.request', 'Withdrawal', withdrawal.id, { amount: data.amount }); res.status(201).json({ withdrawal })
}))
router.get('/withdrawals/admin', requireAuth, admins, asyncRoute(async (req, res) => { const filter = req.query.status && req.query.status !== 'ALL' ? { status: req.query.status } : {}; res.json({ withdrawals: await Withdrawal.find(filter).populate('user', 'fullName username phone').sort({ createdAt: -1 }).limit(100) }) }))
router.patch('/withdrawals/admin/:id/status', requireAuth, admins, asyncRoute(async (req, res) => {
  const { status, note = '' } = parse(z.object({ status: z.enum(['APPROVED', 'PROCESSING', 'PAID', 'REJECTED']), note: z.string().max(300).optional() }), req.body)
  const withdrawal = await Withdrawal.findById(req.params.id)
  const allowed = { PENDING: ['APPROVED', 'REJECTED'], APPROVED: ['PROCESSING', 'PAID', 'REJECTED'], PROCESSING: ['PAID', 'REJECTED'] }
  if (!withdrawal || !allowed[withdrawal.status]?.includes(status)) return res.status(409).json({ message: 'This withdrawal cannot move to that status.' })
  withdrawal.status = status; withdrawal.note = note; withdrawal.processedBy = req.user._id; withdrawal.processedAt = new Date(); await withdrawal.save(); await audit(req, `withdrawal.${status.toLowerCase()}`, 'Withdrawal', withdrawal.id, { amount: withdrawal.amount, note }); await notify(withdrawal.user, 'Withdrawal updated', `Your withdrawal request is now ${status.toLowerCase()}.`, 'withdrawal'); res.json({ withdrawal })
}))

export default router
