import { Router } from 'express'
import { extractWalletAddress } from '../middleware/wallet.middleware.js'
import {
  startWatchingDeposit,
  stopWatchingDeposit,
} from '../controllers/deposit-watch.controller.js'

const router = Router()

router.use(extractWalletAddress)

// Start watching for a deposit
router.post('/watch', startWatchingDeposit)

// Stop watching for a deposit
router.delete('/watch/:contractAddress', stopWatchingDeposit)

export default router
