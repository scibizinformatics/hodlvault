import { Router } from 'express'
import { extractWalletAddress } from '../middleware/wallet.middleware.js'
import {
  getMyActivityHistory,
  getMyActivityStats,
  logWithdrawalActivity,
  logDepositActivity,
} from '../controllers/activity-log.controller.js'

const router = Router()

// Debug middleware for deposit endpoint
router.use('/deposit', (req, res, next) => {
  console.log('[DepositRoute] Incoming request:', {
    method: req.method,
    headers: req.headers,
    body: req.body,
  })
  next()
})

router.use(extractWalletAddress)

router.get('/', getMyActivityHistory)
router.get('/stats', getMyActivityStats)
router.post('/withdrawal', logWithdrawalActivity)
router.post('/deposit', logDepositActivity)

export default router
