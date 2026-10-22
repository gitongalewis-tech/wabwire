import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import authRoutes from './routes/authRoutes.js'
import paymentRoutes from './routes/paymentRoutes.js'
import platformRoutes from './routes/platformRoutes.js'
import enquiryRoutes from './routes/enquiryRoutes.js'
import { connectDatabase } from './config/database.js'
import { dispatchDueCampaigns } from './services/campaigns.js'

const app = express()
const isMpesaCallback = path => path.endsWith('/mpesa/callback') || path.endsWith('/mpesa/b2c-result') || path.endsWith('/mpesa/b2c-timeout')
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1)
app.use(helmet())
app.use(compression())
app.use(cors({ origin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(value => value.trim()), credentials: true }))
app.use((req, res, next) => {
  const origin = req.get('origin')
  const allowed = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(value => value.trim())
  if (origin && !allowed.includes(origin)) return res.status(403).json({ message: 'This website origin is not allowed.' })
  next()
})
app.use(express.json({ limit: '320kb' }))
app.use(cookieParser())
app.use((req, res, next) => { if (isMpesaCallback(req.path)) return next(); const type = req.get('content-type') || ''; if (req.method !== 'GET' && !type.includes('application/json')) return res.status(415).json({ message: 'Send request data as JSON.' }); next() })
app.use((req, res, next) => {
  if (req.method === 'GET' || isMpesaCallback(req.path)) return next()
  const allowed = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(value => value.trim())
  let requestOrigin = req.get('origin')
  if (!requestOrigin && req.get('referer')) {
    try { requestOrigin = new URL(req.get('referer')).origin } catch { return res.status(403).json({ message: 'Request origin could not be verified.' }) }
  }
  if (!requestOrigin || !allowed.includes(requestOrigin)) return res.status(403).json({ message: 'Request origin could not be verified.' })
  next()
})
app.use(morgan('tiny'))
app.use('/api/v1', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: 'draft-7', legacyHeaders: false, skip: req => req.path === '/health' || req.path === '/payments/mpesa/callback', message: { message: 'Too many requests. Please wait before trying again.' } }))
app.get('/api/v1/health', async (_req, res) => {
  try {
    const connected = await connectDatabase()
    res.status(connected ? 200 : 503).json({ status: connected ? 'ok' : 'needs-configuration', database: connected ? 'connected' : 'disconnected', service: 'wabwire-api' })
  } catch {
    res.status(503).json({ status: 'needs-configuration', database: 'disconnected', service: 'wabwire-api' })
  }
})
app.use('/api/v1', async (req, res, next) => {
  if (req.path === '/health') return next()
  try {
    if (!await connectDatabase()) return res.status(503).json({ message: 'MongoDB is not configured for this backend deployment.' })
    next()
  } catch (error) { next(error) }
})
app.use('/api/v1/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: 'draft-7', legacyHeaders: false }), authRoutes)
app.use('/api/v1/payments', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false, skip: req => req.path === '/mpesa/callback' }), paymentRoutes)
app.get('/api/v1/cron/communications', async (req, res, next) => {
  if (!process.env.CRON_SECRET || req.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ message: 'Unauthorized.' })
  try { await dispatchDueCampaigns(); res.json({ ok: true }) } catch (error) { next(error) }
})
app.use('/api/v1', platformRoutes)
app.use('/api/v1/enquiries', enquiryRoutes)
app.use('/api/v1', (_req, res) => res.status(404).json({ message: 'API route not found.' }))
app.use((error, _req, res, _next) => {
  console.error(error)
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || error.keyValue || {})[0]
    if (field === 'username') return res.status(409).json({ message: 'This username is already taken. Choose another username.', details: [{ field, message: 'Try a different username.' }] })
    if (field === 'email') return res.status(409).json({ message: 'This email is already registered. Sign in or use another email address.', details: [{ field, message: 'Choose a different email address.' }] })
    return res.status(409).json({ message: 'A record with these details already exists. Check the information and try again.' })
  }
  const status = error.status || 500
  res.status(status).json({ message: status >= 500 ? 'Something went wrong. Please try again later.' : error.message, ...(error.details ? { details: error.details } : {}) })
})


export default app
