import { EmailCampaign, Notification, User } from '../models/index.js'

async function deliverEmail(user, campaign) {
  const key = process.env.EMAIL_API_KEY
  const from = process.env.EMAIL_FROM
  if (!key || !from) throw new Error('Email delivery is not configured.')
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [user.email], subject: campaign.subject, text: campaign.body }),
  })
  if (!response.ok) throw new Error(`Email provider returned ${response.status}.`)
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
  let delivered = 0
  let failures = 0
  for (const user of recipients) {
    if (campaign.sendInApp) {
      await Notification.create({ user: user._id, title: campaign.title, message: campaign.body, type: 'announcement', link: '/dashboard/notifications' })
    }
    if (campaign.sendEmail) {
      try { await deliverEmail(user, campaign); delivered += 1 } catch { failures += 1 }
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
