import 'dotenv/config'
import mongoose from 'mongoose'
import { Event } from '../models/index.js'
import { connectDatabase } from '../config/database.js'

const startsAt = new Date('2026-10-20T07:00:00.000Z') // 10:00 AM East Africa Time
const endsAt = new Date('2026-10-20T09:00:00.000Z')

try {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured in backend/.env.')
  await connectDatabase()
  const event = await Event.findOneAndUpdate(
    { slug: 'wabwire-global-innovations-launch-2026' },
    { $setOnInsert: {
      title: 'Wabwire Global Innovations Company Launch',
      slug: 'wabwire-global-innovations-launch-2026',
      description: 'Join us as we introduce Wabwire Global Innovations, share our vision, and connect with the people building our community. The launch is scheduled for October 20, 2026 at 10:00 AM East Africa Time. Venue and attendance details will be announced soon.',
      imageUrl: '/images/events/wabwire-company-launch.svg',
      startsAt,
      endsAt,
      location: 'Kenya · Venue details to be announced',
      membersOnly: false,
      status: 'PUBLISHED',
    } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
  console.info(`Launch event is available: ${event.title} (${event.startsAt.toISOString()})`)
} finally {
  await mongoose.disconnect()
}
