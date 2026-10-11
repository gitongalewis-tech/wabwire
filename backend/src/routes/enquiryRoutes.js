import { Router } from 'express'
import { z } from 'zod'
import { Enquiry } from '../models/index.js'
import { enquiryRateLimit } from '../middleware/rateLimit.js'
import { parse } from '../utils/http.js'

const router = Router()
const serviceOptions = ['Website development', 'Digital marketing', 'Branding & design', 'Travel planning', 'Training & business development', 'Consulting', 'Other']

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
    res.status(201).json({ message: 'Thank you. Your enquiry has been received.', id: enquiry.id })
  } catch (error) { next(error) }
})

export default router
