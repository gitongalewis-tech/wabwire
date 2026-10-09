import 'dotenv/config'
import app from './app.js'
import { connectDatabase } from './config/database.js'
import { seedCommissionRules } from './services/membership.js'
import { dispatchDueCampaigns } from './services/campaigns.js'

const port = Number(process.env.PORT || 4000)
try {
  await connectDatabase()
  if (process.env.MONGODB_URI) await seedCommissionRules()
  if (process.env.MONGODB_URI) setInterval(() => dispatchDueCampaigns().catch(error => console.error('Scheduled communication dispatch failed:', error.message)), 30_000).unref()
  app.listen(port, '0.0.0.0', () => console.info(`Wabwire API listening on 0.0.0.0:${port}`))
} catch (error) {
  console.error('Unable to start API:', error.message)
  process.exit(1)
}
