import { Router } from 'express'
import { z } from 'zod'
import { allowRoles, requireAuth } from '../middleware/auth.js'
import { Course, EmailCampaign, EmailTemplate, Event } from '../models/index.js'
import { audit } from '../services/audit.js'
import { dispatchCampaign } from '../services/campaigns.js'
import { asyncRoute, parse } from '../utils/http.js'

const router = Router()
const admins = allowRoles('ADMIN', 'SUPER_ADMIN')

router.get('/communications/templates', requireAuth, admins, asyncRoute(async (_req, res) => res.json({ templates: await EmailTemplate.find().sort({ updatedAt: -1 }) })))
router.post('/communications/templates', requireAuth, admins, asyncRoute(async (req, res) => {
  const data = parse(z.object({ name: z.string().trim().min(2).max(80), category: z.enum(['welcome', 'payment', 'membership', 'class', 'event', 'announcement', 'service-request', 'withdrawal', 'custom']), subject: z.string().trim().min(2).max(200), body: z.string().trim().min(2).max(10000), active: z.boolean().default(true) }), req.body)
  const template = await EmailTemplate.create(data)
  await audit(req, 'email-template.create', 'EmailTemplate', template.id, { name: template.name })
  res.status(201).json({ template })
}))
router.delete('/communications/templates/:id', requireAuth, admins, asyncRoute(async (req, res) => {
  const template = await EmailTemplate.findByIdAndDelete(req.params.id)
  if (!template) return res.status(404).json({ message: 'Template not found.' })
  await audit(req, 'email-template.delete', 'EmailTemplate', template.id, { name: template.name })
  res.json({ deleted: true })
}))
router.get('/communications/campaigns', requireAuth, admins, asyncRoute(async (_req, res) => res.json({ campaigns: await EmailCampaign.find().populate('createdBy', 'fullName').sort({ createdAt: -1 }).limit(100) })))
router.post('/communications/campaigns', requireAuth, admins, asyncRoute(async (req, res) => {
  const data = parse(z.object({ title: z.string().trim().min(3).max(180), subject: z.string().trim().min(2).max(200), body: z.string().trim().min(2).max(10000), audienceType: z.enum(['active-members', 'course-enrollees', 'event-registrants']).default('active-members'), audienceId: z.string().regex(/^[a-f\d]{24}$/i).optional(), sendInApp: z.boolean().default(true), sendEmail: z.boolean().default(false), scheduledAt: z.coerce.date().optional() }).superRefine((value, ctx) => { if (!value.sendInApp && !value.sendEmail) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Choose in-app or email delivery.' }); if (value.audienceType !== 'active-members' && !value.audienceId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['audienceId'], message: 'Choose the course or event for this audience.' }) }), req.body)
  if (data.audienceType === 'course-enrollees' && !await Course.exists({ _id: data.audienceId })) return res.status(404).json({ message: 'Course not found.' })
  if (data.audienceType === 'event-registrants' && !await Event.exists({ _id: data.audienceId })) return res.status(404).json({ message: 'Event not found.' })
  if (data.sendEmail && !(process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY)) return res.status(503).json({ message: 'Email delivery is not configured. Add EMAIL_API_KEY to the backend environment.' })
  if (data.scheduledAt && data.scheduledAt <= new Date()) return res.status(400).json({ message: 'Choose a future time, or send the announcement now.' })
  const campaign = await EmailCampaign.create({ ...data, scheduledAt: data.scheduledAt || new Date(), createdBy: req.user._id })
  await audit(req, 'campaign.create', 'EmailCampaign', campaign.id, { title: campaign.title, sendInApp: campaign.sendInApp, sendEmail: campaign.sendEmail, scheduledAt: campaign.scheduledAt })
  if (!data.scheduledAt) await dispatchCampaign(campaign._id)
  res.status(201).json({ campaign: await EmailCampaign.findById(campaign._id).populate('createdBy', 'fullName') })
}))

export default router
