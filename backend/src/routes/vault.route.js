import { Router } from 'express'
import { extractWalletAddress, optionalWalletAddress } from '../middleware/wallet.middleware.js'
import {
  createVault,
  getVaultsByWalletAuth,
  getVaultById,
  updateVault,
  deleteVault,
  getVaultsByWallet,
  checkDuplicateVault,
  updateVaultBalance,
  getVaultStats,
  getVaultByContractAddress,
} from '../controllers/vault.controller.js'

const router = Router()

// Public endpoints (no wallet authentication required)
router.get('/wallet/:walletAddress', getVaultsByWallet)
router.get('/stats/:wallet', optionalWalletAddress, getVaultStats)

// Apply wallet address extraction middleware to protected routes
router.use(extractWalletAddress)

/**
 * @route   POST /api/v1/vaults
 * @desc    Create a new vault
 * @access  Wallet-based
 * @header  x-wallet-address - Wallet address
 */
router.post('/', createVault)

/**
 * @route   GET /api/v1/vaults
 * @desc    Get all vaults for a wallet address
 * @access  Wallet-based
 * @header  x-wallet-address - Wallet address
 * @query   status (optional) - Filter by vault status
 * @query   page (optional) - Page number for pagination
 * @query   limit (optional) - Number of items per page
 */
router.get('/', getVaultsByWalletAuth)

/**
 * @route   POST /api/v1/vaults/check-duplicate
 * @desc    Check for duplicate vault parameters
 * @access  Wallet-based
 * @header  x-wallet-address - Wallet address
 * @body    walletAddress, priceTarget
 */
router.post('/check-duplicate', checkDuplicateVault)

/**
 * @route   GET /api/v1/vaults/:id
 * @desc    Get a specific vault by ID
 * @access  Wallet-based
 * @header  x-wallet-address - Wallet address
 * @param   id - Vault ID
 */
router.get('/:id', getVaultById)

/**
 * @route   PUT /api/v1/vaults/:id
 * @desc    Update a vault
 * @access  Wallet-based
 * @header  x-wallet-address - Wallet address
 * @param   id - Vault ID
 * @body    name (optional), status (optional)
 */
router.put('/:id', updateVault)

/**
 * @route   DELETE /api/v1/vaults/:id
 * @desc    Delete a vault
 * @access  Wallet-based
 * @header  x-wallet-address - Wallet address
 * @param   id - Vault ID
 */
router.delete('/:id', deleteVault)

/**
 * @route   PUT /api/v1/vaults/:address/balance
 * @desc    Update vault balance
 * @access  Wallet-based
 * @header  x-wallet-address - Wallet address
 * @param   address - Contract address
 * @body    balance - New balance in satoshis
 */
router.put('/:address/balance', updateVaultBalance)

/**
 * @route   GET /api/v1/vaults/contract/:contractAddress
 * @desc    Get a specific vault by contract address
 * @access  Wallet-based
 * @header  x-wallet-address - Wallet address
 * @param   contractAddress - Contract address
 */
router.get('/contract/:contractAddress', getVaultByContractAddress)

export default router
