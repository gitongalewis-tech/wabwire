import mongoose from 'mongoose'

let connectionPromise

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return true
  if (!process.env.MONGODB_URI) {
    return false
  }
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE) || 10,
      minPoolSize: 0,
      maxIdleTimeMS: 60_000,
      serverSelectionTimeoutMS: 10_000,
    }).then(() => {
      console.info('Connected to MongoDB')
      return true
    }).catch(error => {
      console.error('MongoDB connection failed', { name: error.name, code: error.code })
      connectionPromise = undefined
      throw error
    })
  }
  return connectionPromise
}
