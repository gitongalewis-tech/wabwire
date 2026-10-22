import { Router } from 'express'
import { z } from 'zod'
import { Enquiry } from '../models/index.js'
import { enquiryRateLimit } from '../middleware/rateLimit.js'
import { asyncRoute, parse } from '../utils/http.js'
import { requireAuth, allowRoles } from '../middleware/auth.js'
import { audit } from '../services/audit.js'
import { sendEnquiryReceivedEmail, sendEnquiryReplyEmail } from '../services/email.js'

const router = Router()
const serviceOptions = ['Website development', 'Mobile app development', 'Business management system', 'POS system', 'AI integration', 'E-commerce development', 'Digital marketing', 'Branding & design', 'Travel planning', 'Training & business development', 'Consulting', 'Custom quotation', 'Other']

router.get('/admin', requireAuth, allowRoles('ADMIN', 'SUPER_ADMIN'), asyncRoute(async (req, res) => {
  const allowed = ['new', 'reviewing', 'responded', 'closed', 'all']
  const status = req.query.status || 'all'
  if (typeof status !== 'string' || !allowed.includes(status)) return res.status(400).json({ message: 'Invalid enquiry status filter.' })
  const filter = status === 'all' ? {} : { status }
  const [enquiries, total] = await Promise.all([
    Enquiry.find(filter).sort({ createdAt: -1 }).limit(200),
    Enquiry.countDocuments(filter),
  ])
  res.json({ enquiries, total })
}))

router.patch('/admin/:id', requireAuth, allowRoles('ADMIN', 'SUPER_ADMIN'), asyncRoute(async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(['new', 'reviewing', 'responded', 'closed']) }).strict(), req.body)
  const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true })
  if (!enquiry) return res.status(404).json({ message: 'Enquiry not found.' })
  await audit(req, 'enquiry.status.update', 'Enquiry', enquiry.id, { status })
  res.json({ enquiry })
}))

router.post('/admin/:id/reply', requireAuth, allowRoles('ADMIN', 'SUPER_ADMIN'), asyncRoute(async (req, res) => {
  const data = parse(z.object({ subject: z.string().trim().max(180).optional().default(''), message: z.string().trim().min(2).max(5000) }).strict(), req.body)
  const enquiry = await Enquiry.findById(req.params.id)
  if (!enquiry) return res.status(404).json({ message: 'Enquiry not found.' })
  const subject = data.subject || `Reply about your ${enquiry.service} enquiry · Wabwire`
  const delivery = await sendEnquiryReplyEmail(enquiry, req.user, data.message, subject)
  enquiry.replies.push({ admin: req.user._id, subject, message: data.message, emailId: delivery.id, sentAt: new Date() })
  enquiry.status = 'responded'
  await enquiry.save()
  await audit(req, 'enquiry.reply.send', 'Enquiry', enquiry.id, { subject, emailId: delivery.id })
  res.json({ message: 'Your reply was sent to the enquirer.', emailId: delivery.id, enquiry })
}))

router.post('/', enquiryRateLimit, async (req, res, next) => {
  try {
    const { name, email, phone, service, message } = parse(z.object({
      name: z.string().trim().min(2, 'Enter your name.').max(120),
      email: z.string().trim().email('Enter a valid email address.').max(254),
      phone: z.string().trim().max(40).optional().default(''),
      service: z.string().trim().min(1),
      message: z.string().trim().min(5, 'Please provide a little more detail.').max(4000),
    }).strict(), req.body)
    if (!serviceOptions.includes(service)) return res.status(400).json({ message: 'Choose a valid service.' })
    const enquiry = await Enquiry.create({ name, email: email.toLowerCase(), phone, service, message })
    let emailSent = false
    try {
      const delivery = await sendEnquiryReceivedEmail(enquiry)
      emailSent = Boolean(delivery.sent)
      enquiry.acknowledgementEmailStatus = emailSent ? 'sent' : 'failed'
      enquiry.acknowledgementEmailError = emailSent ? undefined : String(delivery.reason || 'Email provider did not accept the message.').slice(0, 300)
      enquiry.acknowledgementEmailSentAt = emailSent ? new Date() : undefined
      if (!emailSent) console.error('Enquiry acknowledgement email was not sent:', delivery.reason)
    } catch (emailError) {
      enquiry.acknowledgementEmailStatus = 'failed'
      enquiry.acknowledgementEmailError = String(emailError.message || 'Email provider error.').slice(0, 300)
      console.error('Enquiry acknowledgement email failed:', emailError.message)
    }
    await enquiry.save()
    res.status(201).json({ message: 'Thank you. Your enquiry has been received.', id: enquiry.id, emailSent, emailStatus: enquiry.acknowledgementEmailStatus, ...(emailSent ? {} : { emailMessage: 'Your enquiry is safely recorded. Our team will contact you soon.' }) })
  } catch (error) { next(error) }
})

export default router
