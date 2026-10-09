import mongoose from 'mongoose'

export async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    console.warn('MONGODB_URI is not configured; API is running without database persistence.')
    return false
  }
  await mongoose.connect(process.env.MONGODB_URI)
  console.info('Connected to MongoDB')
  return true
}
