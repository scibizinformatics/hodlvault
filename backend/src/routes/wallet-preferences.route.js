import { Router } from 'express'
import { extractWalletAddress } from '../middleware/wallet.middleware.js'
import {
  getWalletPreferences,
  updateWalletPreferences,
  deleteWalletPreferences,
} from '../controllers/wallet-preferences.controller.js'

const router = Router()

// Apply wallet address extraction middleware to all routes
router.use(extractWalletAddress)

/**
 * @route   GET /api/v1/wallet/preferences
 * @desc    Get wallet preferences (creates default if not exists)
 * @access  Wallet-based
 * @header  x-wallet-address - Wallet address
 */
router.get('/', getWalletPreferences)

/**
 * @route   PUT /api/v1/wallet/preferences
 * @desc    Update wallet preferences
 * @access  Wallet-based
 * @header  x-wallet-address - Wallet address
 * @body    preferences - Preferences object to update
 */
router.put('/', updateWalletPreferences)

/**
 * @route   DELETE /api/v1/wallet/preferences
 * @desc    Delete wallet preferences
 * @access  Wallet-based
 * @header  x-wallet-address - Wallet address
 */
router.delete('/', deleteWalletPreferences)

export default router
