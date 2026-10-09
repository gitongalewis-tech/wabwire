const buckets = new Map()
const windowMs = 15 * 60 * 1000
const maxRequests = 10

setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of buckets) if (now - bucket.startedAt > windowMs) buckets.delete(key)
}, windowMs).unref()

export function enquiryRateLimit(req, res, next) {
  const key = req.ip || req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  let bucket = buckets.get(key)
  if (!bucket || now - bucket.startedAt > windowMs) {
    bucket = { startedAt: now, count: 0 }
    buckets.set(key, bucket)
  }
  bucket.count += 1
  res.setHeader('RateLimit-Limit', String(maxRequests))
  res.setHeader('RateLimit-Remaining', String(Math.max(maxRequests - bucket.count, 0)))
  if (bucket.count > maxRequests) return res.status(429).json({ message: 'Too many enquiries. Please wait a little and try again.' })
  next()
}
