import { allowRoles, requireAuth, requireActiveMember } from '../middleware/auth.js'
import { Notification } from '../models/index.js'

export const admins = allowRoles('ADMIN', 'SUPER_ADMIN')
export const active = [requireAuth, requireActiveMember]
export const asId = value => String(value || '')
export const notify = (user, title, message, type, link = '') => Notification.create({ user, title, message, type, link })
export const pageArgs = query => ({ limit: Math.min(Math.max(Number(query.limit || 25), 1), 100), skip: (Math.max(Number(query.page || 1), 1) - 1) * Math.min(Math.max(Number(query.limit || 25), 1), 100) })
