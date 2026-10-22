import { Router } from 'express'
import { z } from 'zod'
import { allowRoles, requireActiveMember, requireAuth } from '../middleware/auth.js'
import { asyncRoute, parse, publicUser } from '../utils/http.js'
import { AuditLog, ClassSession, CommissionLedger, CommissionRule, CommunityPost, Course, Enrollment, Event, EventRegistration, Membership, Notification, Payment, Referral, ServiceRequest, SystemSetting, User, Withdrawal } from '../models/index.js'
import { audit } from '../services/audit.js'
import { saveSetting, setting } from '../services/settings.js'
import { notify, admins, active, asId, pageArgs } from './routeHelpers.js'
import { testMembershipAccess } from '../utils/testMode.js'
import { scheduleProgramEmails } from '../services/programEmails.js'

const router = Router()

// Events
router.get('/events', asyncRoute(async (_req, res) => res.json({ events: await Event.find({ status: 'PUBLISHED' }).select('-meetingUrl').sort({ startsAt: 1 }) })))
router.get('/events/admin', requireAuth, admins, asyncRoute(async (_req, res) => res.json({ events: await Event.find().sort({ startsAt: -1 }) })))
router.get('/events/admin/:id/attendees', requireAuth, admins, asyncRoute(async (req, res) => { const registrations = await EventRegistration.find({ event: req.params.id }).populate('user', 'fullName username email').sort({ createdAt: -1 }); res.json({ registrations }) }))
router.get('/events/mine', ...active, asyncRoute(async (req, res) => res.json({ registrations: await EventRegistration.find({ user: req.user._id }).populate('event').sort({ createdAt: -1 }) })))
router.get('/events/:id/member', ...active, asyncRoute(async (req, res) => { const event = await Event.findOne({ _id: req.params.id, status: 'PUBLISHED' }); if (!event || (event.membersOnly && req.user.membershipStatus !== 'ACTIVE' && !testMembershipAccess)) return res.status(404).json({ message: 'Event not found.' }); res.json({ event }) }))
router.get('/events/:id', asyncRoute(async (req, res) => { const event = await Event.findOne({ _id: req.params.id, status: 'PUBLISHED' }).select('-meetingUrl'); if (!event) return res.status(404).json({ message: 'Event not found.' }); res.json({ event }) }))
router.post('/events/admin', requireAuth, admins, asyncRoute(async (req, res) => {
  const data = parse(z.object({ title: z.string().trim().min(3).max(180), description: z.string().trim().min(10).max(5000), startsAt: z.coerce.date(), endsAt: z.coerce.date().optional(), location: z.string().max(200).optional(), meetingUrl: z.string().url().optional().or(z.literal('')), imageUrl: z.string().url().optional().or(z.literal('')), membersOnly: z.boolean().optional(), status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED']).optional(), capacity: z.coerce.number().int().positive().optional() }), req.body)
  const event = await Event.create({ ...data, slug: `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-5)}` })
  await audit(req, 'event.create', 'Event', event.id)
  if (event.status === 'PUBLISHED') await scheduleProgramEmails(event, req.user, 'event', true)
  res.status(201).json({ event })
}))
router.patch('/events/admin/:id', requireAuth, admins, asyncRoute(async (req, res) => {
  const data = parse(z.object({ title: z.string().min(3).max(180).optional(), description: z.string().min(10).max(5000).optional(), startsAt: z.coerce.date().optional(), endsAt: z.coerce.date().optional(), location: z.string().max(200).optional(), meetingUrl: z.string().url().optional().or(z.literal('')), imageUrl: z.string().url().optional().or(z.literal('')), membersOnly: z.boolean().optional(), status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED']).optional(), capacity: z.coerce.number().int().positive().optional() }).strict(), req.body)
  const previous = await Event.findById(req.params.id)
  if (!previous) return res.status(404).json({ message: 'Event not found.' })
  const event = await Event.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true })
  await audit(req, 'event.update', 'Event', event.id, data)
  const changed = Object.keys(data).some(key => String(previous[key] ?? '') !== String(data[key] ?? ''))
  if (changed) await scheduleProgramEmails(event, req.user, 'event', previous.status !== 'PUBLISHED' && event.status === 'PUBLISHED')
  res.json({ event })
}))
router.post('/events/:id/register', requireAuth, asyncRoute(async (req, res) => { const event = await Event.findOne({ _id: req.params.id, status: 'PUBLISHED' }); if (!event) return res.status(404).json({ message: 'Event not found.' }); if (event.membersOnly && req.user.membershipStatus !== 'ACTIVE' && !testMembershipAccess) return res.status(403).json({ message: 'An active membership is required.' }); if (event.capacity && await EventRegistration.countDocuments({ event: event._id, status: 'REGISTERED' }) >= event.capacity) return res.status(409).json({ message: 'This event is full.' }); const registration = await EventRegistration.findOneAndUpdate({ event: event._id, user: req.user._id }, { $set: { status: 'REGISTERED' } }, { upsert: true, new: true }); res.status(201).json({ registration }) }))

export default router
