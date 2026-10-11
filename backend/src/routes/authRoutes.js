import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { createHash, randomBytes } from 'node:crypto'
import { Membership, Referral, User } from '../models/index.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncRoute, parse, publicUser } from '../utils/http.js'
import { setting } from '../services/settings.js'
import { sendPasswordResetEmail, sendReferralEmail, sendVerificationEmail, sendWelcomeEmail } from '../services/email.js'

const router = Router()
const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(120, 'Full name must be 120 characters or fewer.'), username: z.string().trim().min(3, 'Username must be at least 3 characters.').max(30, 'Username must be 30 characters or fewer.').regex(/^[a-zA-Z0-9_.-]+$/, 'Use only letters, numbers, dots, underscores, or hyphens in your username.'),
  email: z.string().trim().email('Enter a valid email address.').max(254), phone: z.string().trim().max(40).optional().default(''),
  country: z.string().trim().max(80).optional().default('Kenya'), county: z.string().trim().max(80).optional().default(''),
  password: z.string().min(10, 'Use a password with at least 10 characters.').max(128, 'Password must be 128 characters or fewer.'), referralCode: z.string().trim().max(60).optional().default(''),
  acceptedTerms: z.literal(true, { errorMap: () => ({ message: 'Please acknowledge the Terms & Conditions.' }) }), acceptedPrivacy: z.literal(true, { errorMap: () => ({ message: 'Please acknowledge the Privacy Policy.' }) }), acceptedMembership: z.literal(true, { errorMap: () => ({ message: 'Please acknowledge the Membership Agreement.' }) }), acceptedReferral: z.literal(true, { errorMap: () => ({ message: 'Please acknowledge the Referral & Compensation Policy.' }) }),
})
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(128) })
const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'strict', maxAge: 24 * 60 * 60 * 1000, path: '/' })
const issueToken = user => jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' })
const hashToken = token => createHash('sha256').update(token).digest('hex')
const newToken = () => randomBytes(32).toString('hex')
const deliver = async (...emails) => {
  const outcomes = await Promise.allSettled(emails.filter(Boolean))
  for (const outcome of outcomes) if (outcome.status === 'rejected') console.error('Transactional email delivery failed:', outcome.reason?.message || 'Unknown provider error.')
}

router.post('/register', asyncRoute(async (req, res) => {
  const registrationEnabled = process.env.REGISTRATION_ENABLED === 'true' || (process.env.NODE_ENV !== 'production' && process.env.REGISTRATION_ENABLED !== 'false')
  if (!registrationEnabled) return res.status(403).json({ message: 'Membership registration is temporarily closed while the company finalises its public policies.' })
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) return res.status(503).json({ message: 'Authentication is not configured. Set a JWT_SECRET of at least 32 characters in backend/.env.' })
  const data = parse(registerSchema, req.body)
  const username = data.username.toLowerCase()
  const email = data.email.toLowerCase()
  if (await User.exists({ email })) return res.status(409).json({ message: 'This email is already registered. Sign in or use another email address.', details: [{ field: 'email', message: 'Choose a different email address.' }] })
  if (await User.exists({ username })) return res.status(409).json({ message: 'This username is already taken. Choose another username.', details: [{ field: 'username', message: 'Try a different username.' }] })
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
  const verificationToken = newToken()
  user.emailVerificationTokenHash = hashToken(verificationToken)
  user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await user.save()
  await Membership.create({ user: user._id, amount: Number(await setting('membershipFeeKes', Number(process.env.MEMBERSHIP_FEE_KES || 5000))), status: 'PENDING' })
  if (referrer) await Referral.create({ referrer: referrer._id, referredUser: user._id, referralCode: referrer.referralCode, level: 1, status: 'PENDING' })
  await deliver(sendVerificationEmail(user, verificationToken), referrer ? sendReferralEmail(referrer, user) : null)
  res.status(201).json({ message: 'Account created. Check your email for a verification link before signing in.', verificationRequired: true, email: user.email, emailConfigured: Boolean(process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY) })
}))

router.post('/login', asyncRoute(async (req, res) => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) return res.status(503).json({ message: 'Authentication is not configured. Set a JWT_SECRET of at least 32 characters in backend/.env.' })
  const data = parse(loginSchema, req.body)
  const user = await User.findOne({ email: data.email.toLowerCase() }).select('+passwordHash')
  if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) return res.status(401).json({ message: 'Email or password is incorrect.' })
  if (user.status === 'SUSPENDED') return res.status(403).json({ message: 'This account has been suspended. Contact the company for help.' })
  if (user.role === 'USER' && !user.emailVerifiedAt) return res.status(403).json({ message: 'Verify your email before signing in. Request a new verification link if it has expired.', code: 'EMAIL_NOT_VERIFIED' })
  user.lastLoginAt = new Date()
  await user.save()
  res.cookie('wabwire_token', issueToken(user), cookieOptions())
  res.json({ user: publicUser(user) })
}))

router.post('/verify-email', asyncRoute(async (req, res) => {
  const { token } = parse(z.object({ token: z.string().min(32).max(200) }).strict(), req.body)
  const user = await User.findOne({ emailVerificationTokenHash: hashToken(token), emailVerificationExpiresAt: { $gt: new Date() } }).select('+emailVerificationTokenHash +emailVerificationExpiresAt')
  if (!user) return res.status(400).json({ message: 'This verification link is invalid or expired. Request a fresh link and try again.' })
  user.emailVerifiedAt = new Date()
  user.emailVerificationTokenHash = undefined
  user.emailVerificationExpiresAt = undefined
  await user.save()
  await deliver(sendWelcomeEmail(user))
  res.cookie('wabwire_token', issueToken(user), cookieOptions())
  res.json({ message: 'Email verified. Your Wabwire account is ready.', user: publicUser(user) })
}))

router.post('/verification/resend', asyncRoute(async (req, res) => {
  const { email } = parse(z.object({ email: z.string().trim().email().max(254) }).strict(), req.body)
  const user = await User.findOne({ email: email.toLowerCase() })
  if (user && !user.emailVerifiedAt) {
    const token = newToken()
    user.emailVerificationTokenHash = hashToken(token)
    user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await user.save()
    await deliver(sendVerificationEmail(user, token))
  }
  res.json({ message: 'If that account needs verification, a fresh link has been sent.' })
}))

router.post('/forgot-password', asyncRoute(async (req, res) => {
  const { email } = parse(z.object({ email: z.string().trim().email().max(254) }).strict(), req.body)
  const user = await User.findOne({ email: email.toLowerCase() })
  if (user) {
    const token = newToken()
    user.passwordResetTokenHash = hashToken(token)
    user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000)
    await user.save()
    await deliver(sendPasswordResetEmail(user, token))
  }
  res.json({ message: 'If an account exists for that email address, a password reset link has been sent.' })
}))

router.post('/reset-password', asyncRoute(async (req, res) => {
  const { token, password } = parse(z.object({ token: z.string().min(32).max(200), password: z.string().min(10).max(128) }).strict(), req.body)
  const user = await User.findOne({ passwordResetTokenHash: hashToken(token), passwordResetExpiresAt: { $gt: new Date() } }).select('+passwordResetTokenHash +passwordResetExpiresAt +passwordHash')
  if (!user) return res.status(400).json({ message: 'This password reset link is invalid or expired. Request another one.' })
  user.passwordHash = await bcrypt.hash(password, 12)
  user.passwordResetTokenHash = undefined
  user.passwordResetExpiresAt = undefined
  await user.save()
  res.json({ message: 'Password changed. You can now sign in with your new password.' })
}))

router.post('/logout', (_req, res) => { res.clearCookie('wabwire_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'strict', path: '/' }); res.json({ message: 'Signed out.' }) })
router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }))
router.patch('/password', requireAuth, asyncRoute(async (req, res) => {
  const { currentPassword, newPassword } = parse(z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(10).max(128) }), req.body)
  const user = await User.findById(req.user._id).select('+passwordHash')
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) return res.status(400).json({ message: 'Current password is incorrect.' })
  user.passwordHash = await bcrypt.hash(newPassword, 12); await user.save(); res.json({ message: 'Password updated.' })
}))

export default router
