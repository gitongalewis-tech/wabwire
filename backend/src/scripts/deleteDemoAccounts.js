import 'dotenv/config'
import mongoose from 'mongoose'
import { AuditLog, CommunityPost, CommissionLedger, Enrollment, EventRegistration, Membership, Notification, Payment, Referral, ReferralMessage, ServiceRequest, User, Withdrawal } from '../models/index.js'
import { connectDatabase } from '../config/database.js'

if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI in backend/.env first.')
await connectDatabase()
try {
  const users = await User.find({ isDemo: true }).select('_id')
  const userIds = users.map(user => user._id)
  if (!userIds.length) {
    console.info('No demo accounts found; nothing was deleted.')
  } else {
    const payments = await Payment.find({ user: { $in: userIds } }).select('_id')
    const paymentIds = payments.map(payment => payment._id)
    await Promise.all([
      CommissionLedger.deleteMany({ $or: [{ beneficiary: { $in: userIds } }, { sourceMember: { $in: userIds } }, { payment: { $in: paymentIds } }] }),
      Membership.deleteMany({ user: { $in: userIds } }),
      Payment.deleteMany({ user: { $in: userIds } }),
      Referral.deleteMany({ $or: [{ referrer: { $in: userIds } }, { referredUser: { $in: userIds } }] }),
      Withdrawal.deleteMany({ user: { $in: userIds } }),
      Enrollment.deleteMany({ user: { $in: userIds } }),
      EventRegistration.deleteMany({ user: { $in: userIds } }),
      Notification.deleteMany({ user: { $in: userIds } }),
      ReferralMessage.deleteMany({ $or: [{ groupOwner: { $in: userIds } }, { sender: { $in: userIds } }] }),
      ServiceRequest.deleteMany({ user: { $in: userIds } }),
      CommunityPost.deleteMany({ author: { $in: userIds } }),
      CommunityPost.updateMany(
        { $or: [{ likes: { $in: userIds } }, { 'comments.author': { $in: userIds } }, { 'reports.reporter': { $in: userIds } }] },
        { $pull: { likes: { $in: userIds }, comments: { author: { $in: userIds } }, reports: { reporter: { $in: userIds } } } },
      ),
      AuditLog.deleteMany({ actor: { $in: userIds } }),
    ])
    await User.deleteMany({ _id: { $in: userIds }, isDemo: true })
    console.info(`Deleted ${userIds.length} demo accounts and their demo activity. Real member records were left intact.`)
  }
} finally {
  await mongoose.disconnect()
}
