import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import mongoose from 'mongoose'
import authRoutes from './routes/authRoutes.js'
import paymentRoutes from './routes/paymentRoutes.js'
import platformRoutes from './routes/platformRoutes.js'
import enquiryRoutes from './routes/enquiryRoutes.js'

const app = express()
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1)
app.use(helmet())
app.use(cors({ origin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(value => value.trim()), credentials: true }))
app.use((req, res, next) => {
  const origin = req.get('origin')
  const allowed = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(value => value.trim())
  if (origin && !allowed.includes(origin)) return res.status(403).json({ message: 'This website origin is not allowed.' })
  next()
})
app.use(express.json({ limit: '32kb' }))
app.use(cookieParser())
app.use((req, res, next) => { if (req.path.endsWith('/mpesa/callback')) return next(); const type = req.get('content-type') || ''; if (req.method !== 'GET' && !type.includes('application/json')) return res.status(415).json({ message: 'Send request data as JSON.' }); next() })
app.use((req, res, next) => { if (req.method === 'GET' || req.path.endsWith('/mpesa/callback')) return next(); const origin = req.get('origin'); const referer = req.get('referer'); const allowed = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(value => value.trim()); if (origin && !allowed.includes(origin)) return res.status(403).json({ message: 'Request origin could not be verified.' }); if (!origin && referer && !allowed.some(item => referer.startsWith(item))) return res.status(403).json({ message: 'Request origin could not be verified.' }); next() })
app.use(morgan('tiny'))
app.get('/api/v1/health', (_req, res) => { const connected = mongoose.connection.readyState === 1; res.status(connected ? 200 : 503).json({ status: connected ? 'ok' : 'needs-configuration', database: connected ? 'connected' : 'disconnected', service: 'wabwire-api' }) })
app.use('/api/v1', (req, res, next) => {
  if (req.path === '/health') return next()
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ message: 'MongoDB is not connected. Add a working MONGODB_URI in backend/.env, then restart the backend.' })
  next()
})
app.use('/api/v1/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: 'draft-7', legacyHeaders: false }), authRoutes)
app.use('/api/v1/payments', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }), paymentRoutes)
app.use('/api/v1', platformRoutes)
app.use('/api/v1/enquiries', enquiryRoutes)
app.use('/api/v1', (_req, res) => res.status(404).json({ message: 'API route not found.' }))
app.use((error, _req, res, _next) => {
  console.error(error)
  if (error.code === 11000) return res.status(409).json({ message: 'That record already exists.' })
  const status = error.status || 500
  res.status(status).json({ message: status >= 500 ? 'Something went wrong. Please try again later.' : error.message, ...(error.details ? { details: error.details } : {}) })
})


export default app
