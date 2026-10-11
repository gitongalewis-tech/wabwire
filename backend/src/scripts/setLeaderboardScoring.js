import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDatabase } from '../config/database.js'
import { SystemSetting } from '../models/index.js'

try {
  const connected = await connectDatabase()
  if (!connected) throw new Error('MONGODB_URI is not configured in backend/.env.')
  await SystemSetting.findOneAndUpdate(
    { key: 'leaderboardScoring' },
    { value: { directReferral: 10, levelTwoReferral: 5, courseCompletion: 50, eventAttendance: 10, communityPost: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
  console.info('Leaderboard scoring updated: direct referral 10, level two referral 5, course completion 50.')
} catch (error) {
  console.error('Could not update leaderboard scoring:', error.message)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
