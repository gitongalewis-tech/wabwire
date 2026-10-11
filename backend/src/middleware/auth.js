import jwt from 'jsonwebtoken'
import { User } from '../models/index.js'
import { testMembershipAccess } from '../utils/testMode.js'

export async function requireAuth(req, res, next) {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) return res.status(503).json({ message: 'Authentication is not configured. Set a JWT_SECRET of at least 32 characters in backend/.env.' })
    const token = req.cookies?.wabwire_token || req.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return res.status(401).json({ message: 'Please sign in to continue.' })
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(payload.sub)
    if (!user || user.status === 'SUSPENDED') return res.status(401).json({ message: 'This account is unavailable.' })
    req.user = user
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') return res.status(401).json({ message: 'Your session has expired. Please sign in again.' })
    next(error)
  }
}

export function allowRoles(...roles) {
  return (req, res, next) => roles.includes(req.user?.role) ? next() : res.status(403).json({ message: 'You do not have permission to perform this action.' })
}

export function requireActiveMember(req, res, next) {
  return req.user?.membershipStatus === 'ACTIVE' || testMembershipAccess || ['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role)
    ? next()
    : res.status(403).json({ message: 'An active membership is required to access this area.' })
}
