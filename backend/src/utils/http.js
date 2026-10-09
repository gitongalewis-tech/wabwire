import { ZodError } from 'zod'

export function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

export function parse(schema, value) {
  try { return schema.parse(value) }
  catch (error) {
    if (error instanceof ZodError) {
      const details = error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message }))
      const validationError = new Error('Please check the submitted information.')
      validationError.status = 400
      validationError.details = details
      throw validationError
    }
    throw error
  }
}

export function publicUser(user) {
  return { id: user.id, fullName: user.fullName, username: user.username, email: user.email, phone: user.phone, country: user.country, county: user.county, role: user.role, status: user.status, membershipStatus: user.membershipStatus, referralCode: user.referralCode, createdAt: user.createdAt }
}
