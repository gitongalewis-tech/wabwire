import { allowRoles, requireAuth, requireActiveMember } from '../middleware/auth.js'
import { Notification } from '../models/index.js'

export const admins = allowRoles('ADMIN', 'SUPER_ADMIN')
export const active = [requireAuth, requireActiveMember]
export const asId = value => String(value || '')
export const notify = (user, title, message, type, link = '') => Notification.create({ user, title, message, type, link })
const queryNumber = (query, key, fallback, max) => {
  const value = query[key]
  if (value === undefined) return fallback
  if (typeof value !== 'string' || !/^\d+$/.test(value) || Number(value) < 1) {
    const error = new Error(`Query parameter ${key} must be a positive whole number.`)
    error.status = 400
    throw error
  }
  return Math.min(Math.max(Number(value), 1), max)
}
export const pageArgs = query => {
  const limit = queryNumber(query, 'limit', 25, 100)
  const page = queryNumber(query, 'page', 1, 1000000)
  return { limit, skip: (page - 1) * limit, page }
}
export const queryEnum = (query, key, allowed, fallback = 'ALL') => {
  const value = query[key]
  if (value === undefined) return fallback
  if (typeof value !== 'string' || !allowed.includes(value)) {
    const error = new Error(`Invalid ${key} filter.`)
    error.status = 400
    throw error
  }
  return value
}
export const queryText = (query, key, maxLength = 100) => {
  const value = query[key]
  if (value === undefined) return ''
  if (typeof value !== 'string' || value.length > maxLength) {
    const error = new Error(`Query parameter ${key} must be text of at most ${maxLength} characters.`)
    error.status = 400
    throw error
  }
  return value.trim()
}
