import mongoose from 'mongoose'
import { CommissionLedger, CommissionRule, Membership, Notification, Payment, Referral, ServiceRequest, User } from '../models/index.js'
import { sendPaymentConfirmedEmail } from './email.js'
import { setting } from './settings.js'

export async function activateVerifiedMembership(paymentId, verifiedBy = null) {
  const session = await mongoose.startSession()
  let verified = false
  try {
    await session.withTransaction(async () => {
      const payment = await Payment.findById(paymentId).session(session)
      if (!payment || payment.status === 'VERIFIED') return
      if (payment.status !== 'PENDING') throw new Error('Only a pending payment can be verified.')
      payment.status = 'VERIFIED'
      payment.verifiedAt = new Date()
      if (verifiedBy) payment.verifiedBy = verifiedBy
      await payment.save({ session })
      verified = true

      // Service invoices are tracked independently and never activate membership.
      if (payment.purpose === 'SERVICE') {
        if (!payment.serviceRequest) throw new Error('The service invoice linked to this payment is missing.')
        const serviceRequest = await ServiceRequest.findOne({ _id: payment.serviceRequest, user: payment.user }).session(session)
        if (!serviceRequest?.quotedAmount) throw new Error('The quoted service amount is missing.')
        const totals = await Payment.aggregate([{ $match: { serviceRequest: serviceRequest._id, status: 'VERIFIED', purpose: 'SERVICE' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]).session(session)
        serviceRequest.paidAmount = totals[0]?.total || 0
        serviceRequest.paymentStatus = serviceRequest.paidAmount >= serviceRequest.quotedAmount ? 'PAID' : 'PARTIAL'
        if (serviceRequest.paymentStatus === 'PAID' && serviceRequest.status === 'QUOTED') serviceRequest.status = 'APPROVED'
        await serviceRequest.save({ session })
        return
      }

      const user = await User.findById(payment.user).session(session)
      if (!user) throw new Error('The payment account could not be found.')
      const targetAmount = Number(await setting('membershipFeeKes', Number(process.env.MEMBERSHIP_FEE_KES || 5000)))
      const aggregate = await Payment.aggregate([
        { $match: { user: user._id, status: 'VERIFIED', purpose: { $ne: 'SERVICE' } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).session(session)
      const totalPaid = aggregate[0]?.total || 0
      const existingMembership = await Membership.findOne({ user: user._id }).session(session)
      if (existingMembership?.status === 'ACTIVE') return
      if (totalPaid < targetAmount) {
        await Membership.findOneAndUpdate({ user: user._id }, { $set: { amount: targetAmount, status: 'PENDING' }, $setOnInsert: { user: user._id } }, { upsert: true, new: true, session })
        return
      }
      user.status = 'ACTIVE'
      user.membershipStatus = 'ACTIVE'
      await user.save({ session })
      await Membership.findOneAndUpdate({ user: user._id }, { user: user._id, payment: payment._id, amount: targetAmount, status: 'ACTIVE', activationMethod: 'PAYMENT', activatedBy: verifiedBy || undefined, activatedAt: new Date() }, { upsert: true, new: true, session })

      let child = user
      for (let level = 1; level <= 3 && child.referredBy; level += 1) {
        const beneficiary = await User.findById(child.referredBy).session(session)
        if (!beneficiary) break
        const rule = await CommissionRule.findOne({ level, active: true, $or: [{ effectiveFrom: null }, { effectiveFrom: { $lte: new Date() } }], $and: [{ $or: [{ effectiveTo: null }, { effectiveTo: { $gte: new Date() } }] }] }).session(session)
        if (rule && beneficiary.membershipStatus === 'ACTIVE') {
          await CommissionLedger.updateOne({ payment: payment._id, beneficiary: beneficiary._id, level, type: 'COMMISSION' }, { $setOnInsert: { payment: payment._id, beneficiary: beneficiary._id, sourceMember: user._id, level, amount: rule.amount, currency: rule.currency, status: 'PENDING', type: 'COMMISSION' } }, { upsert: true, session })
        }
        child = beneficiary
      }
      await Referral.updateOne({ referredUser: user._id }, { $set: { status: 'ELIGIBLE' } }, { session })
      await Notification.create([{ user: user._id, title: 'Membership activated', message: 'Your payment was verified and your member access is active.', type: 'membership' }], { session })
    })
  } finally { await session.endSession() }
  if (verified) {
    try {
      const receipt = await Payment.findById(paymentId).populate('user', 'fullName email membershipStatus').populate('serviceRequest', 'service')
      if (receipt?.user) await sendPaymentConfirmedEmail(receipt.user, receipt)
    } catch (error) { console.error('Payment confirmation email failed:', error.message) }
  }
  return activated
}

export async function seedCommissionRules() {
  const defaults = [{ level: 1, amount: 2000 }, { level: 2, amount: 1000 }, { level: 3, amount: 500 }]
  for (const rule of defaults) await CommissionRule.updateOne({ level: rule.level }, { $setOnInsert: { ...rule, active: true, currency: 'KES' } }, { upsert: true })
}
