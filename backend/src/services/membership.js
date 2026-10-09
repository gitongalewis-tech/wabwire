import mongoose from 'mongoose'
import { CommissionLedger, CommissionRule, Membership, Notification, Payment, Referral, User } from '../models/index.js'

export async function activateVerifiedMembership(paymentId, verifiedBy = null) {
  const session = await mongoose.startSession()
  let activated = false
  try {
    await session.withTransaction(async () => {
      const payment = await Payment.findById(paymentId).session(session)
      if (!payment || payment.status === 'VERIFIED') return
      if (payment.status !== 'PENDING') throw new Error('Only a pending payment can be verified.')
      payment.status = 'VERIFIED'
      payment.verifiedAt = new Date()
      if (verifiedBy) payment.verifiedBy = verifiedBy
      await payment.save({ session })

      const user = await User.findById(payment.user).session(session)
      if (!user) throw new Error('The payment account could not be found.')
      user.status = 'ACTIVE'
      user.membershipStatus = 'ACTIVE'
      await user.save({ session })
      await Membership.findOneAndUpdate({ user: user._id }, { user: user._id, payment: payment._id, amount: payment.amount, status: 'ACTIVE', activatedAt: new Date() }, { upsert: true, new: true, session })

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
      activated = true
    })
  } finally { await session.endSession() }
  return activated
}

export async function seedCommissionRules() {
  const defaults = [{ level: 1, amount: 2000 }, { level: 2, amount: 1000 }, { level: 3, amount: 500 }]
  for (const rule of defaults) await CommissionRule.updateOne({ level: rule.level }, { $setOnInsert: { ...rule, active: true, currency: 'KES' } }, { upsert: true })
}
