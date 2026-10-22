import { Router } from 'express'
import { z } from 'zod'
import { allowRoles, requireActiveMember, requireAuth } from '../middleware/auth.js'
import { asyncRoute, parse, publicUser } from '../utils/http.js'
import { AuditLog, ClassSession, CommissionLedger, CommissionRule, CommunityPost, Course, Enrollment, Event, EventRegistration, Membership, Notification, Payment, Referral, ServiceRequest, SystemSetting, User, Withdrawal } from '../models/index.js'
import { audit } from '../services/audit.js'
import { saveSetting, setting } from '../services/settings.js'
import { notify, admins, active, asId, pageArgs, queryEnum } from './routeHelpers.js'
import { initiateB2CPayment, normalizeKenyanPhone } from '../integrations/mpesa/daraja.js'
import { timingSafeEqual } from 'node:crypto'

const router = Router()

function validB2CCallback(req) {
  const expected = process.env.MPESA_B2C_CALLBACK_TOKEN || ''
  const received = typeof req.query.token === 'string' ? req.query.token : ''
  const expectedBuffer = Buffer.from(expected)
  const receivedBuffer = Buffer.from(received)
  return Boolean(expected && expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer))
}

router.post('/withdrawals/mpesa/b2c-result', asyncRoute(async (req, res) => {
  if (!validB2CCallback(req)) return res.status(401).json({ ResultCode: 1, ResultDesc: 'Unauthorized callback.' })
  const result = req.body?.Result
  const originatorId = result?.OriginatorConversationID
  if (typeof originatorId !== 'string' || originatorId.length > 100) return res.status(400).json({ ResultCode: 1, ResultDesc: 'Invalid callback.' })
  const withdrawal = await Withdrawal.findOne({ providerOriginatorConversationId: originatorId, status: 'PROCESSING' })
  if (!withdrawal) return res.json({ ResultCode: 0, ResultDesc: 'Callback received.' })
  withdrawal.providerResultCode = String(result.ResultCode)
  withdrawal.providerResultDescription = String(result.ResultDesc || '').slice(0, 300)
  if (String(result.ResultCode) === '0') {
    const params = result.ResultParameters?.ResultParameter || []
    const metadata = Object.fromEntries(params.filter(item => item && typeof item.Key === 'string').map(item => [item.Key, item.Value]))
    withdrawal.providerTransactionId = typeof metadata.TransactionID === 'string' ? metadata.TransactionID : (typeof metadata.TransactionReceipt === 'string' ? metadata.TransactionReceipt : undefined)
    withdrawal.status = 'PAID'
  } else {
    withdrawal.status = 'APPROVED'
  }
  withdrawal.processedAt = new Date()
  await withdrawal.save()
  await notify(withdrawal.user, withdrawal.status === 'PAID' ? 'Withdrawal paid' : 'Withdrawal payout failed', withdrawal.status === 'PAID' ? `KES ${withdrawal.amount.toLocaleString()} was sent to your M-Pesa number.` : 'Your payout did not complete. The approved balance remains available for another attempt.', 'withdrawal')
  res.json({ ResultCode: 0, ResultDesc: 'Callback received.' })
}))
router.post('/withdrawals/mpesa/b2c-timeout', asyncRoute(async (req, res) => {
  if (!validB2CCallback(req)) return res.status(401).json({ ResultCode: 1, ResultDesc: 'Unauthorized callback.' })
  const originatorId = req.body?.Result?.OriginatorConversationID || req.body?.OriginatorConversationID
  if (typeof originatorId === 'string' && originatorId.length <= 100) {
    await Withdrawal.updateOne({ providerOriginatorConversationId: originatorId, status: 'PROCESSING' }, { $set: { status: 'APPROVED', providerResultDescription: 'Daraja payout request timed out; reconcile before retrying.', processedAt: new Date() } })
  }
  res.json({ ResultCode: 0, ResultDesc: 'Callback received.' })
}))

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
router.get('/withdrawals/admin', requireAuth, admins, asyncRoute(async (req, res) => { const status = queryEnum(req.query, 'status', ['PENDING', 'APPROVED', 'PROCESSING', 'PAID', 'REJECTED', 'CANCELLED', 'ALL']); const filter = status === 'ALL' ? {} : { status }; res.json({ withdrawals: await Withdrawal.find(filter).populate('user', 'fullName username phone').sort({ createdAt: -1 }).limit(100) }) }))
router.patch('/withdrawals/admin/:id/status', requireAuth, admins, asyncRoute(async (req, res) => {
  const { status, note = '' } = parse(z.object({ status: z.enum(['APPROVED', 'REJECTED']), note: z.string().max(300).optional() }), req.body)
  const withdrawal = await Withdrawal.findById(req.params.id)
  const allowed = { PENDING: ['APPROVED', 'REJECTED'] }
  if (!withdrawal || !allowed[withdrawal.status]?.includes(status)) return res.status(409).json({ message: 'This withdrawal cannot move to that status.' })
  withdrawal.status = status; withdrawal.note = note; withdrawal.processedBy = req.user._id; withdrawal.processedAt = new Date(); await withdrawal.save(); await audit(req, `withdrawal.${status.toLowerCase()}`, 'Withdrawal', withdrawal.id, { amount: withdrawal.amount, note }); await notify(withdrawal.user, 'Withdrawal updated', `Your withdrawal request is now ${status.toLowerCase()}.`, 'withdrawal'); res.json({ withdrawal })
}))

router.post('/withdrawals/admin/:id/pay', requireAuth, admins, asyncRoute(async (req, res) => {
  const environment = process.env.MPESA_ENVIRONMENT
  if (!['sandbox', 'production'].includes(environment) || (environment === 'production' && process.env.MPESA_ALLOW_PRODUCTION_PAYOUTS !== 'true')) return res.status(409).json({ message: 'Automated production payouts are disabled. Complete sandbox verification, obtain a Safaricom B2C shortcode and enable MPESA_ALLOW_PRODUCTION_PAYOUTS to proceed.' })
  const withdrawal = await Withdrawal.findById(req.params.id)
  if (!withdrawal || withdrawal.status !== 'APPROVED') return res.status(409).json({ message: 'Approve this request before sending a payout.' })
  const phone = normalizeKenyanPhone(withdrawal.phoneNumber)
  if (!phone) return res.status(400).json({ message: 'The saved payout number is invalid.' })
  const previousAttempt = await Withdrawal.findOne({ _id: { $ne: withdrawal._id }, providerOriginatorConversationId: { $exists: true }, user: withdrawal.user, amount: withdrawal.amount, status: 'PROCESSING' })
  if (previousAttempt) return res.status(409).json({ message: 'Another payout for this member and amount is still processing.' })
  try {
    const payout = await initiateB2CPayment({ phone, amount: withdrawal.amount, reference: withdrawal.id.slice(-8) })
    withdrawal.status = 'PROCESSING'
    withdrawal.providerOriginatorConversationId = payout.originatorConversationId
    withdrawal.providerConversationId = payout.ConversationID
    withdrawal.providerResultDescription = payout.ResponseDescription || 'Daraja accepted the payout request; awaiting its result callback.'
    withdrawal.processedBy = req.user._id
    withdrawal.processedAt = new Date()
    await withdrawal.save()
    await audit(req, 'withdrawal.b2c.send', 'Withdrawal', withdrawal.id, { amount: withdrawal.amount, phone: `${phone.slice(0, 3)}******${phone.slice(-2)}`, conversationId: payout.ConversationID })
    res.status(202).json({ withdrawal, message: `Daraja ${environment} accepted the payout request. Final status will arrive by callback.` })
  } catch (error) {
    res.status(503).json({ message: error.message })
  }
}))

export default router
