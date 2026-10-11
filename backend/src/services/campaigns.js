import { EmailCampaign, Notification, User } from '../models/index.js'
import { sendEmail } from './email.js'

async function deliverEmail(user, campaign) {
  const result = await sendEmail({ to: user.email, subject: campaign.subject, text: campaign.body })
  if (!result.sent) throw new Error(result.reason)
}

export async function dispatchCampaign(campaignId) {
  const campaign = await EmailCampaign.findOneAndUpdate(
    { _id: campaignId, status: 'SCHEDULED' },
    { status: 'SENDING' },
    { new: true },
  )
  if (!campaign) return
  const recipients = await User.find({ status: 'ACTIVE', membershipStatus: 'ACTIVE' }).select('_id email')
  campaign.recipients = recipients.length
  if (campaign.sendInApp && recipients.length) {
    await Notification.insertMany(recipients.map(user => ({ user: user._id, title: campaign.title, message: campaign.body, type: 'announcement', link: '/dashboard/notifications' })), { ordered: false })
  }
  let delivered = 0
  let failures = 0
  if (campaign.sendEmail) {
    for (let offset = 0; offset < recipients.length; offset += 5) {
      const results = await Promise.allSettled(recipients.slice(offset, offset + 5).map(user => deliverEmail(user, campaign)))
      delivered += results.filter(result => result.status === 'fulfilled').length
      failures += results.filter(result => result.status === 'rejected').length
    }
  }
  campaign.emailSent = delivered
  campaign.status = failures ? (delivered || campaign.sendInApp ? 'PARTIAL' : 'FAILED') : 'SENT'
  campaign.failureMessage = failures ? `${failures} email delivery attempt(s) failed. Review provider configuration and recipient addresses.` : ''
  await campaign.save()
}

export async function dispatchDueCampaigns() {
  const due = await EmailCampaign.find({ status: 'SCHEDULED', scheduledAt: { $lte: new Date() } }).select('_id').limit(10)
  for (const campaign of due) await dispatchCampaign(campaign._id)
}
