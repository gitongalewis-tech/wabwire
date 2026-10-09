import { Router } from 'express'
import dashboardRoutes from './dashboardRoutes.js'
import userRoutes from './userRoutes.js'
import referralRoutes from './referralRoutes.js'
import withdrawalRoutes from './withdrawalRoutes.js'
import learningRoutes from './learningRoutes.js'
import eventRoutes from './eventRoutes.js'
import communityRoutes from './communityRoutes.js'
import operationsRoutes from './operationsRoutes.js'
import communicationsRoutes from './communicationsRoutes.js'

const router = Router()
router.use(dashboardRoutes, userRoutes, referralRoutes, withdrawalRoutes, learningRoutes, eventRoutes, communityRoutes, operationsRoutes, communicationsRoutes)
export default router
