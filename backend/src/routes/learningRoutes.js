import { Router } from 'express'
import { z } from 'zod'
import { allowRoles, requireActiveMember, requireAuth } from '../middleware/auth.js'
import { asyncRoute, parse, publicUser } from '../utils/http.js'
import { AuditLog, ClassSession, CommissionLedger, CommissionRule, CommunityPost, Course, Enrollment, Event, EventRegistration, Membership, Notification, Payment, Referral, ServiceRequest, SystemSetting, User, Withdrawal } from '../models/index.js'
import { audit } from '../services/audit.js'
import { saveSetting, setting } from '../services/settings.js'
import { notify, admins, active, asId, pageArgs } from './routeHelpers.js'

const router = Router()
const lessonSchema = z.object({ title: z.string().trim().min(2).max(150), description: z.string().max(1000).optional(), videoUrl: z.string().url().optional().or(z.literal('')), resourceUrl: z.string().url().optional().or(z.literal('')), durationMinutes: z.coerce.number().int().min(0).optional() }).strict()
const moduleSchema = z.object({ title: z.string().trim().min(2).max(150), lessons: z.array(lessonSchema).optional() }).strict()

// Learning: published courses are public to inspect; enrollment and lessons require active membership.
router.get('/courses', asyncRoute(async (_req, res) => res.json({ courses: await Course.find({ isPublished: true }).select('-modules').populate('instructor', 'fullName').sort({ createdAt: -1 }) })))
router.get('/courses/admin', requireAuth, admins, asyncRoute(async (_req, res) => res.json({ courses: await Course.find().populate('instructor', 'fullName').sort({ createdAt: -1 }) })))
router.post('/courses/admin', requireAuth, admins, asyncRoute(async (req, res) => {
  const data = parse(z.object({ title: z.string().trim().min(3).max(150), description: z.string().trim().min(10).max(3000), category: z.string().max(100).optional(), isPublished: z.boolean().optional(), modules: z.array(moduleSchema).max(100).optional() }).strict(), req.body)
  const slug = `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-5)}`
  const course = await Course.create({ ...data, slug, instructor: req.user._id }); await audit(req, 'course.create', 'Course', course.id); res.status(201).json({ course })
}))
router.patch('/courses/admin/:id', requireAuth, admins, asyncRoute(async (req, res) => {
  const data = parse(z.object({ title: z.string().trim().min(3).max(150).optional(), description: z.string().trim().min(10).max(3000).optional(), category: z.string().max(100).optional(), isPublished: z.boolean().optional(), modules: z.array(moduleSchema).max(100).optional() }).strict(), req.body)
  const course = await Course.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true }); if (!course) return res.status(404).json({ message: 'Course not found.' }); await audit(req, 'course.update', 'Course', course.id, data); res.json({ course })
}))
router.post('/courses/:id/enroll', ...active, asyncRoute(async (req, res) => {
  const course = await Course.findOne({ _id: req.params.id, isPublished: true }); if (!course) return res.status(404).json({ message: 'Course not found.' })
  const enrollment = await Enrollment.findOneAndUpdate({ user: req.user._id, course: course._id }, { $setOnInsert: { user: req.user._id, course: course._id } }, { upsert: true, new: true }); res.status(201).json({ enrollment })
}))
router.get('/courses/mine', ...active, asyncRoute(async (req, res) => res.json({ enrollments: await Enrollment.find({ user: req.user._id }).populate('course', 'title description category modules thumbnailUrl').sort({ createdAt: -1 }) })))
router.get('/courses/certificates/mine', ...active, asyncRoute(async (req, res) => { const completed = await Enrollment.find({ user: req.user._id, completedAt: { $ne: null } }).populate('course', 'title category'); res.json({ certificates: completed.map(item => ({ id: `WAB-${req.user.id.slice(-6).toUpperCase()}-${item.course.id.slice(-6).toUpperCase()}`, course: item.course, issuedAt: item.completedAt, memberName: req.user.fullName })) }) }))
router.post('/courses/:courseId/lessons/:lessonKey/complete', ...active, asyncRoute(async (req, res) => {
  const enrollment = await Enrollment.findOne({ user: req.user._id, course: req.params.courseId }); if (!enrollment) return res.status(404).json({ message: 'Enroll in this course first.' })
  const course = await Course.findById(req.params.courseId); if (!course?.isPublished) return res.status(404).json({ message: 'Course not found.' })
  const [moduleIndex, lessonIndex] = req.params.lessonKey.split('.').map(Number)
  if (!course.modules[moduleIndex]?.lessons[lessonIndex]) return res.status(404).json({ message: 'Lesson not found.' })
  const key = `${moduleIndex}.${lessonIndex}`; if (!enrollment.completedLessons.includes(key)) enrollment.completedLessons.push(key)
  const total = course.modules.reduce((sum, item) => sum + item.lessons.length, 0); enrollment.progressPercent = total ? Math.round(enrollment.completedLessons.length / total * 100) : 0; if (enrollment.progressPercent === 100) enrollment.completedAt = new Date(); await enrollment.save(); res.json({ enrollment })
}))
router.get('/classes/mine', ...active, asyncRoute(async (_req, res) => res.json({ classes: await ClassSession.find({ isPublished: true, startsAt: { $gte: new Date(Date.now() - 86400000) } }).populate('course', 'title').populate('instructor', 'fullName').sort({ startsAt: 1 }).limit(100) })))
router.get('/classes/admin', requireAuth, admins, asyncRoute(async (_req, res) => res.json({ classes: await ClassSession.find().populate('course', 'title').populate('instructor', 'fullName').sort({ startsAt: -1 }).limit(100) })))
router.post('/classes/admin', requireAuth, admins, asyncRoute(async (req, res) => { const data = parse(z.object({ title: z.string().min(3).max(150), course: z.string().optional(), instructor: z.string().optional(), startsAt: z.coerce.date(), endsAt: z.coerce.date().optional(), meetingUrl: z.string().url().optional().or(z.literal('')), location: z.string().max(200).optional(), description: z.string().max(2000).optional(), isPublished: z.boolean().optional() }), req.body); const item = await ClassSession.create(data); await audit(req, 'class.create', 'ClassSession', item.id); res.status(201).json({ class: item }) }))

export default router
