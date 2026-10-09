import { Router } from 'express'
import { z } from 'zod'
import { allowRoles, requireActiveMember, requireAuth } from '../middleware/auth.js'
import { asyncRoute, parse, publicUser } from '../utils/http.js'
import { AuditLog, ClassSession, CommissionLedger, CommissionRule, CommunityPost, Course, Enrollment, Event, EventRegistration, Membership, Notification, Payment, Referral, ServiceRequest, SystemSetting, User, Withdrawal } from '../models/index.js'
import { audit } from '../services/audit.js'
import { saveSetting, setting } from '../services/settings.js'
import { notify, admins, active, asId, pageArgs } from './routeHelpers.js'

const router = Router()

// Account profile
router.patch('/users/me', requireAuth, asyncRoute(async (req, res) => {
  const changes = parse(z.object({ fullName: z.string().trim().min(2).max(120).optional(), phone: z.string().trim().max(40).optional(), county: z.string().trim().max(80).optional(), country: z.string().trim().max(80).optional() }).strict(), req.body)
  Object.assign(req.user, changes); await req.user.save(); res.json({ user: publicUser(req.user) })
}))
router.get('/users/admin', requireAuth, admins, asyncRoute(async (req, res) => {
  const { limit, skip } = pageArgs(req.query); const q = String(req.query.q || '').trim()
  const filter = q ? { $or: [{ fullName: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }, { email: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }, { username: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }] } : {}
  if (req.query.status && req.query.status !== 'ALL') filter.membershipStatus = req.query.status
  const [users, total] = await Promise.all([User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).skip(skip).limit(limit), User.countDocuments(filter)])
  res.json({ users, total, page: Number(req.query.page || 1), limit })
}))
router.patch('/users/admin/:id/status', requireAuth, admins, asyncRoute(async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING']) }), req.body)
  const user = await User.findById(req.params.id)
  if (!user) return res.status(404).json({ message: 'Member not found.' })
  if (user.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ message: 'Only a super administrator can update this account.' })
  if (status === 'SUSPENDED') { user.status = 'SUSPENDED'; user.membershipStatus = 'SUSPENDED' }
  else if (status === 'ACTIVE' && user.membershipStatus === 'SUSPENDED') { const paidMembership = await Membership.exists({ user: user._id, status: 'ACTIVE' }); if (!paidMembership) return res.status(409).json({ message: 'Membership can only be activated by verified payment.' }); user.status = 'ACTIVE'; user.membershipStatus = 'ACTIVE' }
  else if (status === 'ACTIVE' && user.membershipStatus !== 'ACTIVE') return res.status(409).json({ message: 'Membership can only be activated by verified payment.' })
  else user.status = status
  await user.save()
  await audit(req, 'member.status.update', 'User', user.id, { status }); res.json({ user: publicUser(user) })
}))

export default router
