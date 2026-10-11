import mongoose from 'mongoose'

export async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    console.warn('MONGODB_URI is not configured; API is running without database persistence.')
    return false
  }
  await mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE) || 10,
    minPoolSize: 0,
    maxIdleTimeMS: 60_000,
  })
  console.info('Connected to MongoDB')
  return true
}
