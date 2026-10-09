import { AuditLog } from '../models/index.js'

export function audit(req, action, entityType, entityId, details = {}) {
  return AuditLog.create({ actor: req.user?._id, action, entityType, entityId: String(entityId ?? ''), details, ip: req.ip })
}
