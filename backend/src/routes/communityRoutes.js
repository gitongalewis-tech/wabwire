import { Router } from 'express'
import { z } from 'zod'
import { allowRoles, requireActiveMember, requireAuth } from '../middleware/auth.js'
import { asyncRoute, parse, publicUser } from '../utils/http.js'
import { AuditLog, ClassSession, CommissionLedger, CommissionRule, CommunityPost, Course, Enrollment, Event, EventRegistration, Membership, Notification, Payment, Referral, ReferralMessage, ServiceRequest, SystemSetting, User, Withdrawal } from '../models/index.js'
import { audit } from '../services/audit.js'
import { saveSetting, setting } from '../services/settings.js'
import { notify, admins, active, asId, pageArgs } from './routeHelpers.js'

const router = Router()

// A private conversation shared by one inviter and their direct invitees.
async function referralGroupFor(user) {
  const ownerId = user.referredBy || user._id
  const owner = await User.findById(ownerId).select('fullName username')
  if (!owner) return null
  const invitees = await User.find({ referredBy: ownerId }).select('fullName username').sort({ createdAt: 1 }).limit(500)
  const participants = [owner, ...invitees]
  return { ownerId, participants }
}

router.get('/referral-chat', ...active, asyncRoute(async (req, res) => {
  const group = await referralGroupFor(req.user)
  if (!group || !group.participants.some(person => asId(person._id) === req.user.id)) return res.status(403).json({ message: 'You are not part of this referral group.' })
  const messages = await ReferralMessage.find({ groupOwner: group.ownerId }).sort({ createdAt: -1 }).limit(100).populate('sender', 'fullName username')
  res.json({ participants: group.participants, messages: messages.reverse() })
}))
router.post('/referral-chat', ...active, asyncRoute(async (req, res) => {
  const { body } = parse(z.object({ body: z.string().trim().min(1).max(2000) }), req.body)
  const group = await referralGroupFor(req.user)
  if (!group || !group.participants.some(person => asId(person._id) === req.user.id)) return res.status(403).json({ message: 'You are not part of this referral group.' })
  const message = await ReferralMessage.create({ groupOwner: group.ownerId, sender: req.user._id, body })
  await message.populate('sender', 'fullName username')
  res.status(201).json({ message })
}))

// Community moderation
router.get('/community', ...active, asyncRoute(async (_req, res) => res.json({ posts: await CommunityPost.find({ removedAt: null }).populate('author', 'fullName username role').populate('comments.author', 'fullName username').sort({ pinned: -1, createdAt: -1 }).limit(100) })))
router.post('/community', ...active, asyncRoute(async (req, res) => { const { body } = parse(z.object({ body: z.string().trim().min(2).max(4000) }), req.body); const post = await CommunityPost.create({ author: req.user._id, body }); res.status(201).json({ post: await post.populate('author', 'fullName username') }) }))
router.post('/community/:id/comments', ...active, asyncRoute(async (req, res) => { const { body } = parse(z.object({ body: z.string().trim().min(1).max(1000) }), req.body); const post = await CommunityPost.findOne({ _id: req.params.id, removedAt: null }); if (!post) return res.status(404).json({ message: 'Post not found.' }); post.comments.push({ author: req.user._id, body }); await post.save(); await post.populate('comments.author', 'fullName username'); res.status(201).json({ comments: post.comments }) }))
router.post('/community/:id/like', ...active, asyncRoute(async (req, res) => { const post = await CommunityPost.findOne({ _id: req.params.id, removedAt: null }); if (!post) return res.status(404).json({ message: 'Post not found.' }); const existing = post.likes.some(id => asId(id) === req.user.id); if (existing) post.likes.pull(req.user._id); else post.likes.addToSet(req.user._id); await post.save(); res.json({ likes: post.likes.length, liked: !existing }) }))
router.post('/community/:id/report', ...active, asyncRoute(async (req, res) => { const { reason } = parse(z.object({ reason: z.string().trim().min(5).max(300) }), req.body); const post = await CommunityPost.findOne({ _id: req.params.id, removedAt: null }); if (!post) return res.status(404).json({ message: 'Post not found.' }); if (!post.reports.some(report => asId(report.reporter) === req.user.id)) post.reports.push({ reporter: req.user._id, reason }); await post.save(); res.status(201).json({ message: 'Report sent to moderators.' }) }))
router.delete('/community/:id', requireAuth, asyncRoute(async (req, res) => { const post = await CommunityPost.findOne({ _id: req.params.id, removedAt: null }); if (!post) return res.status(404).json({ message: 'Post not found.' }); if (asId(post.author) !== req.user.id && !['ADMIN', 'SUPER_ADMIN', 'MODERATOR'].includes(req.user.role)) return res.status(403).json({ message: 'You can only remove your own post.' }); post.removedAt = new Date(); await post.save(); res.json({ message: 'Post removed.' }) }))
router.get('/community/admin/reports', requireAuth, allowRoles('ADMIN', 'SUPER_ADMIN', 'MODERATOR'), asyncRoute(async (_req, res) => res.json({ posts: await CommunityPost.find({ 'reports.0': { $exists: true }, removedAt: null }).populate('author', 'fullName username').populate('reports.reporter', 'fullName username').sort({ updatedAt: -1 }) })))
router.get('/community/admin/posts', requireAuth, allowRoles('ADMIN', 'SUPER_ADMIN', 'MODERATOR'), asyncRoute(async (_req, res) => res.json({ posts: await CommunityPost.find().populate('author', 'fullName username role').populate('comments.author', 'fullName username').populate('reports.reporter', 'fullName username').sort({ pinned: -1, createdAt: -1 }).limit(250) })))
router.get('/community/admin/chats', requireAuth, allowRoles('ADMIN', 'SUPER_ADMIN'), asyncRoute(async (_req, res) => {
  const messages = await ReferralMessage.find().populate('sender', 'fullName username').populate('groupOwner', 'fullName username').sort({ createdAt: -1 }).limit(500)
  res.json({ messages: messages.reverse() })
}))
router.patch('/community/admin/:id/pin', requireAuth, allowRoles('ADMIN', 'SUPER_ADMIN', 'MODERATOR'), asyncRoute(async (req, res) => { const { pinned } = parse(z.object({ pinned: z.boolean() }), req.body); const post = await CommunityPost.findByIdAndUpdate(req.params.id, { pinned }, { new: true }); if (!post) return res.status(404).json({ message: 'Post not found.' }); await audit(req, 'community.post.pin', 'CommunityPost', post.id, { pinned }); res.json({ post }) }))

export default router
