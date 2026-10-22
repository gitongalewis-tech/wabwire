import { EmailCampaign } from '../models/index.js'
import { dispatchCampaign } from './campaigns.js'

const publicUrl = () => (process.env.PUBLIC_SITE_URL || '').replace(/\/$/, '')

async function saveProgramCampaign(program, admin, type, purpose, scheduledAt) {
  const isEvent = type === 'event'
  const title = program.title
  const date = new Date(program.startsAt).toLocaleString('en-KE', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Africa/Nairobi' })
  const detailPath = isEvent ? '/dashboard/events' : '/dashboard/classes'
  const heading = purpose === 'reminder' ? `Reminder: ${title} is coming up` : `New ${isEvent ? 'event' : 'class'}: ${title}`
  const body = `${purpose === 'reminder' ? 'This is a reminder about an upcoming Wabwire programme.' : 'A new Wabwire programme has been scheduled.'}\n\n${title}\n${program.description || ''}\nDate: ${date}\n${program.location ? `Location: ${program.location}\n` : ''}${program.meetingUrl ? `Join: ${program.meetingUrl}\n` : ''}Details: ${publicUrl()}${detailPath}`
  const filter = { sourceType: type, sourceId: program._id, purpose }
  const campaign = await EmailCampaign.findOneAndUpdate(filter, {
    $set: { title: heading.slice(0, 180), subject: heading.slice(0, 200), body: body.slice(0, 10000), audienceType: type === 'class' && program.course ? 'course-enrollees' : 'active-members', audienceId: type === 'class' && program.course ? program.course._id || program.course : undefined, sendInApp: true, sendEmail: Boolean(process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY), scheduledAt, status: 'SCHEDULED', failureMessage: '', createdBy: admin._id },
    $setOnInsert: filter,
  }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true })
  return campaign
}

export async function scheduleProgramEmails(program, admin, type, announce = false) {
  if (!['event', 'class'].includes(type) || program.status === 'CANCELLED' || (type === 'event' && program.status !== 'PUBLISHED') || (type === 'class' && program.isPublished === false)) {
    await EmailCampaign.updateOne({ sourceType: type, sourceId: program._id, purpose: 'reminder', status: 'SCHEDULED' }, { $set: { status: 'CANCELLED' } })
    return
  }

  if (announce) {
    const announcement = await saveProgramCampaign(program, admin, type, 'announcement', new Date())
    await dispatchCampaign(announcement._id)
  }
  if (new Date(program.startsAt).getTime() <= Date.now()) {
    await EmailCampaign.updateOne({ sourceType: type, sourceId: program._id, purpose: 'reminder', status: 'SCHEDULED' }, { $set: { status: 'CANCELLED' } })
    return
  }
  const reminderAt = new Date(Math.max(Date.now(), new Date(program.startsAt).getTime() - 24 * 60 * 60 * 1000))
  await saveProgramCampaign(program, admin, type, 'reminder', reminderAt)
}
