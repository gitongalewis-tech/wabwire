import 'dotenv/config'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { User } from '../models/index.js'
import { connectDatabase } from '../config/database.js'

const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase()
const password = process.env.SUPER_ADMIN_PASSWORD
if (!process.env.MONGODB_URI || !email || !password || password.length < 12) {
  console.error('Set MONGODB_URI, SUPER_ADMIN_EMAIL and a SUPER_ADMIN_PASSWORD of at least 12 characters in backend/.env first.')
  process.exit(1)
}
await connectDatabase()
if (await User.exists({ email })) {
  console.error('An account with that email already exists. No account was changed.')
  await mongoose.disconnect(); process.exit(1)
}
const username = email.split('@')[0].replace(/[^a-z0-9_.-]/g, '').slice(0, 24) || 'admin'
const passwordHash = await bcrypt.hash(password, 12)
const user = await User.create({ fullName: 'Wabwire Administrator', username, email, passwordHash, referralCode: `WAB-ADMIN-${String(Date.now()).slice(-6)}`, role: 'SUPER_ADMIN', status: 'ACTIVE', membershipStatus: 'ACTIVE', acceptedPolicies: [] })
console.info(`Super administrator created: ${user.email}`)
await mongoose.disconnect()
