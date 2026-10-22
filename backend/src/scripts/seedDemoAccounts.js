import 'dotenv/config'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { CommissionLedger, CommissionRule, Membership, Payment, Referral, User } from '../models/index.js'
import { connectDatabase } from '../config/database.js'
import { setting } from '../services/settings.js'
import { seedCommissionRules } from '../services/membership.js'

const demoPassword = process.env.DEMO_MEMBER_PASSWORD
if (!process.env.MONGODB_URI) {
  console.error('Set MONGODB_URI in the backend private environment before creating demo records.')
  process.exit(1)
}

const marker = 'DEMO FIXTURE — simulated payment; no real funds moved.'
const definitions = [
  { key: '01', fullName: 'Demo Member One', username: 'demo_member_01', parent: null },
  { key: '02', fullName: 'Demo Member Two', username: 'demo_member_02', parent: '01' },
  { key: '03', fullName: 'Demo Member Three', username: 'demo_member_03', parent: '01' },
  { key: '04', fullName: 'Demo Member Four', username: 'demo_member_04', parent: '02' },
  { key: '05', fullName: 'Demo Member Five', username: 'demo_member_05', parent: '04' },
]
const emailFor = key => `wabwire.demo${key}@example.com`

await connectDatabase()
try {
  const adminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase()
  const admin = adminEmail ? await User.findOne({ email: adminEmail, role: 'SUPER_ADMIN' }) : null
  if (!admin) throw new Error('The configured SUPER_ADMIN_EMAIL account must exist before seeding demo records.')

  await seedCommissionRules()
  const commissionRules = await CommissionRule.find({ active: true }).sort({ level: 1 })
  const ruleByLevel = new Map(commissionRules.map(rule => [rule.level, rule]))
  const membershipFee = Number(await setting('membershipFeeKes', Number(process.env.MEMBERSHIP_FEE_KES || 5000)))
  const users = new Map()
  const now = new Date()

  for (const definition of definitions) {
    const email = emailFor(definition.key)
    let user = await User.findOne({ email })
    if (user && !user.isDemo) throw new Error(`Refusing to overwrite an existing non-demo account: ${email}`)
    if (!user && !demoPassword) throw new Error('Demo accounts already in the database retain their existing passwords. Set DEMO_MEMBER_PASSWORD only if you intentionally need to create a missing demo account.')

    const referredBy = definition.parent ? users.get(definition.parent)?._id : null
    if (definition.parent && !referredBy) throw new Error(`Missing demo referral parent for account ${definition.key}.`)
    const referralCode = `WAB-DEMO-${definition.key}`
    if (user) {
      user.set({ fullName: definition.fullName, username: definition.username, role: 'USER', isDemo: true, status: 'ACTIVE', membershipStatus: 'ACTIVE', emailVerifiedAt: now, emailVerificationTokenHash: undefined, emailVerificationExpiresAt: undefined, passwordResetTokenHash: undefined, passwordResetExpiresAt: undefined, referralCode, referredBy })
      await user.save()
    } else {
      const passwordHash = await bcrypt.hash(demoPassword, 12)
      user = await User.create({
        fullName: definition.fullName,
        username: definition.username,
        email,
        passwordHash,
        role: 'USER',
        isDemo: true,
        status: 'ACTIVE',
        membershipStatus: 'ACTIVE',
        emailVerifiedAt: now,
        referralCode,
        referredBy,
        acceptedPolicies: ['terms', 'privacy', 'membership', 'referral'].map(name => ({ name, version: 'demo', acceptedAt: now })),
      })
    }
    users.set(definition.key, user)
  }

  const paymentIds = []
  for (const definition of definitions) {
    const user = users.get(definition.key)
    const receipt = `DEMO${definition.key}0001`
    const payment = await Payment.findOneAndUpdate(
      { user: user._id, providerResultDescription: marker },
      { $set: {
        user: user._id,
        amount: membershipFee,
        currency: 'KES',
        method: 'MPESA_PAYBILL',
        status: 'VERIFIED',
        phoneNumber: 'DEMO ACCOUNT',
        accountReference: user.referralCode,
        mpesaReceiptNumber: receipt,
        providerResultCode: '0',
        providerResultDescription: marker,
        transactionDate: now,
        verifiedAt: now,
        verifiedBy: admin._id,
      } },
      { upsert: true, new: true, runValidators: true },
    )
    paymentIds.push(payment._id)
    await Membership.findOneAndUpdate(
      { user: user._id },
      { $set: { user: user._id, payment: payment._id, amount: membershipFee, status: 'ACTIVE', activationMethod: 'PAYMENT', activatedBy: admin._id, activatedAt: now } },
      { upsert: true, new: true, runValidators: true },
    )

    if (definition.parent) {
      const parent = users.get(definition.parent)
      await Referral.findOneAndUpdate(
        { referredUser: user._id },
        { $set: { referrer: parent._id, referredUser: user._id, referralCode: parent.referralCode, level: 1, status: 'ELIGIBLE' } },
        { upsert: true, new: true, runValidators: true },
      )
    }
  }

  // Reset only demo payment commissions, leaving every real member ledger intact.
  await CommissionLedger.deleteMany({ payment: { $in: paymentIds }, type: 'COMMISSION' })
  for (const definition of definitions) {
    const sourceMember = users.get(definition.key)
    const payment = await Payment.findOne({ user: sourceMember._id, providerResultDescription: marker })
    let child = sourceMember
    for (let level = 1; level <= 3 && child.referredBy; level += 1) {
      const beneficiary = await User.findById(child.referredBy)
      const rule = ruleByLevel.get(level)
      if (!beneficiary || !rule) break
      await CommissionLedger.create({ beneficiary: beneficiary._id, sourceMember: sourceMember._id, payment: payment._id, level, amount: rule.amount, currency: rule.currency, status: 'PENDING', type: 'COMMISSION' })
      child = beneficiary
    }
  }

  console.info(`Seeded ${definitions.length} verified demo members and pending referral payouts.`)
  for (const definition of definitions) console.info(`${definition.fullName}: ${emailFor(definition.key)} (${definition.username})`)
} finally {
  await mongoose.disconnect()
}
