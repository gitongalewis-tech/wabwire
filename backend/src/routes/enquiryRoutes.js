import { Router } from 'express'
import { Enquiry } from '../models/index.js'
import { enquiryRateLimit } from '../middleware/rateLimit.js'

const router = Router()
const serviceOptions = ['Website development', 'Digital marketing', 'Branding & design', 'Travel planning', 'Training & business development', 'Consulting', 'Other']

router.post('/', enquiryRateLimit, async (req, res, next) => {
  try {
    const { name, email, phone = '', service, message } = req.body ?? {}
    if (![name, email, service, message].every(value => typeof value === 'string' && value.trim())) {
      return res.status(400).json({ message: 'Please complete the required fields.' })
    }
    if (name.length > 120 || email.length > 254 || message.length > 4000 || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Please check your details and try again.' })
    }
    if (!serviceOptions.includes(service)) return res.status(400).json({ message: 'Choose a valid service.' })
    const enquiry = await Enquiry.create({ name, email, phone, service, message })
    res.status(201).json({ message: 'Thank you. Your enquiry has been received.', id: enquiry.id })
  } catch (error) { next(error) }
})

export default router
