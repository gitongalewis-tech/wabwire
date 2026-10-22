import { Router } from 'express'
import mongoose from 'mongoose'
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
  firstName: z.string().trim().min(1, 'Enter your first name.').max(60), lastName: z.string().trim().min(1, 'Enter your last name.').max(60),
  username: z.string().trim().min(3, 'Username must be at least 3 characters.').max(30, 'Username must be 30 characters or fewer.').regex(/^[a-zA-Z0-9]+$/, 'Use letters and numbers only, without spaces or symbols.'),
  email: z.string().trim().email('Enter a valid email address.').max(254), confirmEmail: z.string().trim().email('Confirm with a valid email address.').max(254),
  phone: z.string().trim().min(5, 'Enter your phone number.').max(40), country: z.string().trim().min(2).max(80),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter your date of birth.'), idPassportNumber: z.string().trim().min(4, 'Enter your ID or passport number.').max(40).regex(/^[a-zA-Z0-9/-]+$/, 'Use letters, numbers, hyphens or slashes.'),
  password: z.string().min(10, 'Use a password with at least 10 characters.').max(128, 'Password must be 128 characters or fewer.'), confirmPassword: z.string().min(10).max(128),
  inviterUsername: z.string().trim().min(3, 'Enter your inviter’s username.').max(60).regex(/^[a-zA-Z0-9-]+$/, 'Enter a username without spaces or symbols.'),
  acceptedTerms: z.literal(true, { errorMap: () => ({ message: 'Please accept the Terms & Conditions.' }) }), acceptedAge: z.literal(true, { errorMap: () => ({ message: 'You must confirm that you are 18 or older.' }) }), acceptedAml: z.literal(true, { errorMap: () => ({ message: 'Please acknowledge the AML requirements.' }) }), acceptedBusinessEffort: z.literal(true, { errorMap: () => ({ message: 'Please acknowledge the business effort and results statement.' }) }), acceptedInviter: z.literal(true, { errorMap: () => ({ message: 'Please confirm your inviter details.' }) }),
}).superRefine((data, ctx) => {
  if (data.email.toLowerCase() !== data.confirmEmail.toLowerCase()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmEmail'], message: 'Email addresses do not match.' })
  if (data.password !== data.confirmPassword) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmPassword'], message: 'Passwords do not match.' })
  const birth = new Date(`${data.dateOfBirth}T00:00:00.000Z`)
  if (Number.isNaN(birth.valueOf()) || birth.toISOString().slice(0, 10) !== data.dateOfBirth) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dateOfBirth'], message: 'Enter a valid date of birth.' })
  else { const today = new Date(); let age = today.getUTCFullYear() - birth.getUTCFullYear(); const month = today.getUTCMonth() - birth.getUTCMonth(); if (month < 0 || (month === 0 && today.getUTCDate() < birth.getUTCDate())) age -= 1; if (age < 18) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dateOfBirth'], message: 'You must be 18 years or older to register.' }) }
})
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(128) })
const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'strict', maxAge: 24 * 60 * 60 * 1000, path: '/' })
const issueToken = user => jwt.sign({ sub: user.id, role: user.role, sessionVersion: user.sessionVersion || 0 }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' })
const hashToken = token => createHash('sha256').update(token).digest('hex')
const newToken = () => randomBytes(32).toString('hex')
const deliver = async (...emails) => {
  const outcomes = await Promise.allSettled(emails.filter(Boolean))
  return outcomes.map(outcome => {
    if (outcome.status === 'fulfilled') return outcome.value
    console.error('Transactional email delivery failed:', outcome.reason?.message || 'Unknown provider error.')
    return { sent: false }
  })
}

router.post('/register', asyncRoute(async (req, res) => {
  const registrationEnabled = process.env.REGISTRATION_ENABLED === 'true' || (process.env.NODE_ENV !== 'production' && process.env.REGISTRATION_ENABLED !== 'false')
  if (!registrationEnabled) return res.status(403).json({ message: 'Membership registration is temporarily closed while the company finalises its public policies.' })
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) return res.status(503).json({ message: 'Authentication is not configured. Set a JWT_SECRET of at least 32 characters in backend/.env.' })
  const data = parse(registerSchema, req.body)
  const username = data.username.toLowerCase()
  const fullName = `${data.firstName} ${data.lastName}`
  const email = data.email.toLowerCase()
  if (await User.exists({ email })) return res.status(409).json({ message: 'This email is already registered. Sign in or use another email address.', details: [{ field: 'email', message: 'Choose a different email address.' }] })
  if (await User.exists({ username })) return res.status(409).json({ message: 'This username is already taken. Choose another username.', details: [{ field: 'username', message: 'Try a different username.' }] })
  let referrer = null
  referrer = await User.findOne({ username: data.inviterUsername.toLowerCase(), status: { $ne: 'SUSPENDED' } })
    || await User.findOne({ referralCode: data.inviterUsername.toUpperCase(), status: { $ne: 'SUSPENDED' } })
  if (!referrer) return res.status(400).json({ message: 'The inviter username could not be found. Check it with your inviter and try again.', details: [{ field: 'inviterUsername', message: 'No active account matches this inviter.' }] })
  let referralCode
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = String(Math.floor(1000 + Math.random() * 9000))
    referralCode = `WAB-${username.replace(/[^a-z0-9]/g, '').slice(0, 12).toUpperCase()}-${suffix}`
    if (!(await User.exists({ referralCode }))) break
    referralCode = null
  }
  if (!referralCode) return res.status(500).json({ message: 'We could not create a referral identifier. Please try again.' })
  const passwordHash = await bcrypt.hash(data.password, 12)
  const verificationToken = newToken()
  const acceptedAt = new Date()
  const membershipAmount = Number(await setting('membershipFeeKes', Number(process.env.MEMBERSHIP_FEE_KES || 5000)))
  let user
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      const [createdUser] = await User.create([{
        firstName: data.firstName,
        lastName: data.lastName,
        fullName,
        username,
        email,
        phone: data.phone,
        country: data.country,
        dateOfBirth: new Date(`${data.dateOfBirth}T00:00:00.000Z`),
        idPassportNumber: data.idPassportNumber,
        passwordHash,
        referralCode,
        referredBy: referrer._id,
        acceptedPolicies: ['terms', 'adult-age', 'aml-requirements', 'business-effort', 'inviter-confirmation'].map(name => ({ name, version: 'registration-2026-10', acceptedAt })),
        emailVerificationTokenHash: hashToken(verificationToken),
        emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }], { session })
      user = createdUser
      await Membership.create([{ user: user._id, amount: membershipAmount, status: 'PENDING' }], { session })
      await Referral.create([{ referrer: referrer._id, referredUser: user._id, referralCode: referrer.referralCode, level: 1, status: 'PENDING' }], { session })
    })
  } finally {
    await session.endSession()
  }
  const [verification] = await deliver(sendVerificationEmail(user, verificationToken), referrer ? sendReferralEmail(referrer, user) : null)
  res.status(201).json({ message: verification?.sent ? 'Account created. Check your email for a verification link before signing in.' : 'Account created, but we could not send the verification email. Use the resend link below or contact support.', verificationRequired: true, verificationEmailSent: Boolean(verification?.sent), email: user.email })
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
  const [welcome] = await deliver(sendWelcomeEmail(user))
  res.cookie('wabwire_token', issueToken(user), cookieOptions())
  res.json({ message: 'Email verified. Your Wabwire account is ready.', welcomeEmailSent: Boolean(welcome?.sent), user: publicUser(user) })
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
    const [delivery] = await deliver(sendPasswordResetEmail(user, token))
    if (!delivery?.sent) {
      user.passwordResetTokenHash = undefined
      user.passwordResetExpiresAt = undefined
      await user.save()
    }
  }
  res.json({ message: 'If an account exists for that email address, a password reset link has been sent.' })
}))

router.post('/reset-password', asyncRoute(async (req, res) => {
  const { token, password } = parse(z.object({ token: z.string().min(32).max(200), password: z.string().min(10).max(128) }).strict(), req.body)
  const user = await User.findOne({ passwordResetTokenHash: hashToken(token), passwordResetExpiresAt: { $gt: new Date() } }).select('+passwordResetTokenHash +passwordResetExpiresAt +passwordHash')
  if (!user) return res.status(400).json({ message: 'This password reset link is invalid or expired. Request another one.' })
  user.passwordHash = await bcrypt.hash(password, 12)
  user.sessionVersion = (user.sessionVersion || 0) + 1
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
  user.passwordHash = await bcrypt.hash(newPassword, 12)
  user.sessionVersion = (user.sessionVersion || 0) + 1
  user.passwordResetTokenHash = undefined
  user.passwordResetExpiresAt = undefined
  await user.save()
  res.clearCookie('wabwire_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'strict', path: '/' })
  res.json({ message: 'Password updated. Sign in again with your new password.' })
}))

export default router
