import 'dotenv/config'
import mongoose from 'mongoose'
import { ClassSession, Event, User } from '../models/index.js'
import { connectDatabase } from '../config/database.js'
import { scheduleProgramEmails } from '../services/programEmails.js'

try {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured in backend/.env.')
  await connectDatabase()
  const admin = await User.findOne({ email: (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase(), role: { $in: ['ADMIN', 'SUPER_ADMIN'] } })
  if (!admin) throw new Error('Configured administrator account was not found; no reminder campaigns were created.')

  const [events, classes] = await Promise.all([
    Event.find({ status: 'PUBLISHED', startsAt: { $gt: new Date() } }),
    ClassSession.find({ isPublished: true, startsAt: { $gt: new Date() } }),
  ])
  for (const event of events) await scheduleProgramEmails(event, admin, 'event', false)
  for (const item of classes) await scheduleProgramEmails(item, admin, 'class', false)
  console.info(`Queued reminders for ${events.length} upcoming event(s) and ${classes.length} upcoming class(es).`)
} finally {
  await mongoose.disconnect()
}
