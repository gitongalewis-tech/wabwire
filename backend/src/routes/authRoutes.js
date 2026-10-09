import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { Membership, Referral, User } from '../models/index.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncRoute, parse, publicUser } from '../utils/http.js'
import { setting } from '../services/settings.js'

const router = Router()
const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120), username: z.string().trim().regex(/^[a-zA-Z0-9_.-]{3,30}$/),
  email: z.string().trim().email().max(254), phone: z.string().trim().max(40).optional().default(''),
  country: z.string().trim().max(80).optional().default('Kenya'), county: z.string().trim().max(80).optional().default(''),
  password: z.string().min(10).max(128), referralCode: z.string().trim().max(60).optional().default(''),
  acceptedTerms: z.literal(true), acceptedPrivacy: z.literal(true), acceptedMembership: z.literal(true), acceptedReferral: z.literal(true),
})
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(128) })
const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 24 * 60 * 60 * 1000, path: '/' })
const issueToken = user => jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' })

router.post('/register', asyncRoute(async (req, res) => {
  const registrationEnabled = process.env.REGISTRATION_ENABLED === 'true' || (process.env.NODE_ENV !== 'production' && process.env.REGISTRATION_ENABLED !== 'false')
  if (!registrationEnabled) return res.status(403).json({ message: 'Membership registration is temporarily closed while the company finalises its public policies.' })
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) return res.status(503).json({ message: 'Authentication is not configured. Set a JWT_SECRET of at least 32 characters in backend/.env.' })
  const data = parse(registerSchema, req.body)
  const username = data.username.toLowerCase()
  const email = data.email.toLowerCase()
  if (await User.exists({ $or: [{ email }, { username }] })) return res.status(409).json({ message: 'That email or username is already registered.' })
  let referrer = null
  if (data.referralCode) {
    referrer = await User.findOne({ referralCode: data.referralCode.toUpperCase(), status: { $ne: 'SUSPENDED' } })
    if (!referrer) return res.status(400).json({ message: 'The referral code could not be found.' })
  }
  let referralCode
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = String(Math.floor(1000 + Math.random() * 9000))
    referralCode = `WAB-${username.replace(/[^a-z0-9]/g, '').slice(0, 12).toUpperCase()}-${suffix}`
    if (!(await User.exists({ referralCode }))) break
    referralCode = null
  }
  if (!referralCode) return res.status(500).json({ message: 'We could not create a referral identifier. Please try again.' })
  const passwordHash = await bcrypt.hash(data.password, 12)
  const user = await User.create({ fullName: data.fullName, username, email, phone: data.phone, country: data.country, county: data.county, passwordHash, referralCode, referredBy: referrer?._id, acceptedPolicies: ['terms', 'privacy', 'membership', 'referral'].map(name => ({ name, version: 'draft-2026-01', acceptedAt: new Date() })) })
  await Membership.create({ user: user._id, amount: Number(await setting('membershipFeeKes', Number(process.env.MEMBERSHIP_FEE_KES || 5000))), status: 'PENDING' })
  if (referrer) await Referral.create({ referrer: referrer._id, referredUser: user._id, referralCode: referrer.referralCode, level: 1, status: 'PENDING' })
  res.cookie('wabwire_token', issueToken(user), cookieOptions())
  res.status(201).json({ user: publicUser(user), next: 'payment' })
}))

router.post('/login', asyncRoute(async (req, res) => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) return res.status(503).json({ message: 'Authentication is not configured. Set a JWT_SECRET of at least 32 characters in backend/.env.' })
  const data = parse(loginSchema, req.body)
  const user = await User.findOne({ email: data.email.toLowerCase() }).select('+passwordHash')
  if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) return res.status(401).json({ message: 'Email or password is incorrect.' })
  if (user.status === 'SUSPENDED') return res.status(403).json({ message: 'This account has been suspended. Contact the company for help.' })
  user.lastLoginAt = new Date()
  await user.save()
  res.cookie('wabwire_token', issueToken(user), cookieOptions())
  res.json({ user: publicUser(user) })
}))

router.post('/logout', (_req, res) => { res.clearCookie('wabwire_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' }); res.json({ message: 'Signed out.' }) })
router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }))
router.patch('/password', requireAuth, asyncRoute(async (req, res) => {
  const { currentPassword, newPassword } = parse(z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(10).max(128) }), req.body)
  const user = await User.findById(req.user._id).select('+passwordHash')
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) return res.status(400).json({ message: 'Current password is incorrect.' })
  user.passwordHash = await bcrypt.hash(newPassword, 12); await user.save(); res.json({ message: 'Password updated.' })
}))

export default router
