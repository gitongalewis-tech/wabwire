import { Router } from 'express'
import { z } from 'zod'
import { requireActiveMember, requireAuth, allowRoles } from '../middleware/auth.js'
import { asyncRoute, parse } from '../utils/http.js'
import { Payment, User } from '../models/index.js'
import { initiateStkPush, normalizeKenyanPhone, queryStkPush } from '../integrations/mpesa/daraja.js'
import { activateVerifiedMembership } from '../services/membership.js'
import { audit } from '../services/audit.js'
import { setting } from '../services/settings.js'
import { pageArgs, queryEnum } from './routeHelpers.js'

const router = Router()
router.get('/membership/config', asyncRoute(async (_req, res) => res.json({ amount: Number(await setting('membershipFeeKes', Number(process.env.MEMBERSHIP_FEE_KES || 5000))), currency: 'KES', paybill: await setting('mpesaPaybill', process.env.MPESA_PAYBILL || ''), accountReferenceLabel: process.env.MPESA_ACCOUNT_REFERENCE || 'WABWIRE' })))

router.post('/membership/stk', requireAuth, asyncRoute(async (req, res) => {
  if (req.user.membershipStatus === 'ACTIVE') return res.status(409).json({ message: 'Your membership is already active.' })
  const { phone } = parse(z.object({ phone: z.string().min(9).max(20) }), req.body)
  const normalizedPhone = normalizeKenyanPhone(phone)
  if (!normalizedPhone) return res.status(400).json({ message: 'Enter a valid Kenyan mobile number, such as 0712345678.' })
  const existingPending = await Payment.findOne({ user: req.user._id, method: 'MPESA_STK', status: 'PENDING', createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) } })
  if (existingPending) return res.status(409).json({ message: 'A recent M-Pesa request is still pending. Check your phone or wait before trying again.', paymentId: existingPending.id })
  const amount = Number(await setting('membershipFeeKes', Number(process.env.MEMBERSHIP_FEE_KES || 5000)))
  const payment = await Payment.create({ user: req.user._id, amount, method: 'MPESA_STK', status: 'PENDING', phoneNumber: normalizedPhone, accountReference: req.user.referralCode, idempotencyKey: `membership-${req.user.id}-${Date.now()}` })
  try {
    const result = await initiateStkPush({ phone: normalizedPhone, amount, accountReference: req.user.referralCode, description: 'Wabwire membership' })
    payment.merchantRequestId = result.MerchantRequestID
    payment.checkoutRequestId = result.CheckoutRequestID
    await payment.save()
    res.status(202).json({ paymentId: payment.id, status: 'PENDING', message: result.CustomerMessage || 'Check your phone and enter your M-Pesa PIN to complete payment.' })
  } catch (error) {
    payment.status = 'FAILED'; payment.providerResultDescription = error.message; await payment.save()
    res.status(503).json({ message: error.message })
  }
}))

router.post('/membership/manual', requireAuth, asyncRoute(async (req, res) => {
  if (req.user.membershipStatus === 'ACTIVE') return res.status(409).json({ message: 'Your membership is already active.' })
  const data = parse(z.object({ phone: z.string().min(9).max(20), receipt: z.string().trim().min(6).max(30).regex(/^[A-Za-z0-9]+$/), amount: z.coerce.number().int().positive() }), req.body)
  const amount = Number(await setting('membershipFeeKes', Number(process.env.MEMBERSHIP_FEE_KES || 5000)))
  if (data.amount !== amount) return res.status(400).json({ message: `Enter the membership fee of KES ${amount.toLocaleString()}.` })
  const existing = await Payment.findOne({ mpesaReceiptNumber: data.receipt.toUpperCase() })
  if (existing) return res.status(409).json({ message: 'That M-Pesa receipt has already been submitted.' })
  const payment = await Payment.create({ user: req.user._id, amount, method: 'MPESA_PAYBILL', status: 'PENDING', phoneNumber: normalizeKenyanPhone(data.phone) || data.phone, accountReference: req.user.referralCode, mpesaReceiptNumber: data.receipt.toUpperCase() })
  res.status(201).json({ paymentId: payment.id, status: payment.status, message: 'Your payment is pending verification by the Wabwire team.' })
}))

router.get('/mine', requireAuth, asyncRoute(async (req, res) => {
  const payments = await Payment.find({ user: req.user._id }).sort({ createdAt: -1 }).select('-providerCallback')
  res.json({ payments })
}))

router.post('/mpesa/callback', asyncRoute(async (req, res) => {
  const callback = req.body?.Body?.stkCallback
  if (typeof callback?.CheckoutRequestID !== 'string' || callback.CheckoutRequestID.length < 1 || callback.CheckoutRequestID.length > 100 || !/^[A-Za-z0-9_-]+$/.test(callback.CheckoutRequestID)) return res.status(400).json({ ResultCode: 1, ResultDesc: 'Invalid callback.' })
  const items = callback.CallbackMetadata?.Item || []
  if (!Number.isSafeInteger(Number(callback.ResultCode)) || !Array.isArray(items) || items.length > 20 || items.some(item => !item || typeof item !== 'object' || typeof item.Name !== 'string' || item.Name.length > 80)) return res.status(400).json({ ResultCode: 1, ResultDesc: 'Invalid callback.' })
  const payment = await Payment.findOne({ checkoutRequestId: callback.CheckoutRequestID })
  if (!payment || payment.status !== 'PENDING') return res.json({ ResultCode: 0, ResultDesc: 'Callback received.' })
  const metadata = Object.fromEntries(items.map(item => [item.Name, item.Value]))
  payment.providerResultCode = String(callback.ResultCode)
  payment.providerResultDescription = callback.ResultDesc || ''
  payment.providerCallback = callback
  if (Number(callback.ResultCode) !== 0) {
    payment.status = 'FAILED'; await payment.save()
    return res.json({ ResultCode: 0, ResultDesc: 'Callback received.' })
  }
  const callbackPhone = metadata.PhoneNumber ? String(metadata.PhoneNumber) : ''
  if (Number(metadata.Amount) !== Number(payment.amount) || !metadata.MpesaReceiptNumber || (callbackPhone && callbackPhone !== payment.phoneNumber)) {
    payment.providerResultDescription = 'Callback amount, phone or receipt did not match the pending payment.'
    await payment.save()
    return res.json({ ResultCode: 0, ResultDesc: 'Callback received for review.' })
  }
  const providerStatus = await queryStkPush(payment.checkoutRequestId)
  if (String(providerStatus.ResultCode) !== '0') {
    payment.providerResultDescription = providerStatus.ResultDesc || 'M-Pesa status query has not confirmed a completed payment.'
    await payment.save()
    return res.json({ ResultCode: 0, ResultDesc: 'Payment status is not confirmed yet.' })
  }
  payment.mpesaReceiptNumber = String(metadata.MpesaReceiptNumber).toUpperCase()
  payment.transactionDate = metadata.TransactionDate ? new Date(String(metadata.TransactionDate).replace(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, '$1-$2-$3T$4:$5:$6Z')) : new Date()
  await payment.save()
  await activateVerifiedMembership(payment._id)
  res.json({ ResultCode: 0, ResultDesc: 'Callback received.' })
}))

router.get('/admin', requireAuth, allowRoles('ADMIN', 'SUPER_ADMIN'), asyncRoute(async (req, res) => {
  const status = queryEnum(req.query, 'status', ['PENDING', 'VERIFIED', 'FAILED', 'REJECTED', 'CANCELLED', 'ALL'], 'PENDING')
  const { page, limit, skip } = pageArgs(req.query)
  const filter = status === 'ALL' ? {} : { status }
  const [payments, total] = await Promise.all([Payment.find(filter).populate('user', 'fullName username email referralCode').sort({ createdAt: -1 }).limit(limit).skip(skip).select('-providerCallback'), Payment.countDocuments(filter)])
  res.json({ payments, total, page })
}))

router.post('/admin/:id/verify', requireAuth, allowRoles('ADMIN', 'SUPER_ADMIN'), asyncRoute(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
  if (!payment) return res.status(404).json({ message: 'Payment not found.' })
  if (payment.method !== 'MPESA_PAYBILL' || payment.status !== 'PENDING') return res.status(409).json({ message: 'Only pending manual paybill submissions can be verified here.' })
  const duplicate = await Payment.findOne({ mpesaReceiptNumber: payment.mpesaReceiptNumber, _id: { $ne: payment._id }, status: 'VERIFIED' })
  if (duplicate) return res.status(409).json({ message: 'This receipt has already been verified on another payment.' })
  await activateVerifiedMembership(payment._id, req.user._id)
  await audit(req, 'payment.manual.verify', 'Payment', payment.id, { receipt: payment.mpesaReceiptNumber, amount: payment.amount })
  res.json({ message: 'Payment verified and membership activated.' })
}))

router.post('/admin/:id/reject', requireAuth, allowRoles('ADMIN', 'SUPER_ADMIN'), asyncRoute(async (req, res) => {
  const { reason } = parse(z.object({ reason: z.string().trim().min(4).max(300) }), req.body)
  const payment = await Payment.findById(req.params.id)
  if (!payment || payment.status !== 'PENDING' || payment.method !== 'MPESA_PAYBILL') return res.status(404).json({ message: 'Pending manual payment not found.' })
  payment.status = 'REJECTED'; payment.providerResultDescription = reason; payment.verifiedBy = req.user._id; payment.verifiedAt = new Date(); await payment.save()
  await audit(req, 'payment.manual.reject', 'Payment', payment.id, { reason })
  res.json({ message: 'Payment submission rejected.' })
}))

export default router
