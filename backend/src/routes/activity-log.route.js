import { Router } from 'express'
import { extractWalletAddress } from '../middleware/wallet.middleware.js'
import {
  getMyActivityHistory,
  getMyActivityStats,
  logWithdrawalActivity,
  logDepositActivity,
} from '../controllers/activity-log.controller.js'

const router = Router()

router.use(extractWalletAddress)

router.get('/', getMyActivityHistory)
router.get('/stats', getMyActivityStats)
router.post('/withdrawal', logWithdrawalActivity)
router.post('/deposit', logDepositActivity)

export default router
