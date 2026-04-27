/**
 * Auto-Withdrawal Routes
 * Provides endpoints for manual triggering and status checking (useful for testing)
 */

import express from 'express'
import { checkAndWithdraw } from '../services/auto-withdrawal.service.js'
import { fetchOraclePrice } from '../services/oracle.service.js'
import { Vault } from '../models/vault.model.js'

const router = express.Router()

/**
 * GET /api/v1/auto-withdrawal/status
 * Check the current oracle price and list eligible vaults
 */
router.get('/status', async (req, res) => {
  try {
    const oracleData = await fetchOraclePrice()

    const eligibleVaults = await Vault.find({
      autoWithdrawal: true,
      status: 'active',
      balance: { $gt: 0 },
    })

    const matchingVaults = eligibleVaults.filter(
      (v) => v.priceTargetCents <= oracleData.priceInCents,
    )

    res.json({
      oraclePriceInCents: oracleData.priceInCents,
      oraclePriceInUSD: (oracleData.priceInCents / 100).toFixed(2),
      totalAutoWithdrawalVaults: eligibleVaults.length,
      eligibleForWithdrawal: matchingVaults.length,
      vaults: matchingVaults.map((v) => ({
        id: v._id,
        name: v.name || 'Unnamed Vault',
        contractAddress: v.contractAddress,
        priceTargetCents: v.priceTargetCents,
        priceTargetUSD: (v.priceTargetCents / 100).toFixed(2),
        balance: v.balance,
      })),
    })
  } catch (error) {
    res.status(500).json({
      message: 'Failed to get auto-withdrawal status',
      error: error.message,
    })
  }
})

/**
 * POST /api/v1/auto-withdrawal/trigger
 * Manually trigger the auto-withdrawal check (for testing)
 */
router.post('/trigger', async (req, res) => {
  try {
    console.log('[AutoWithdraw] Manual trigger requested')
    const result = await checkAndWithdraw()
    res.json({
      message: 'Auto-withdrawal check completed',
      ...result,
    })
  } catch (error) {
    res.status(500).json({
      message: 'Auto-withdrawal trigger failed',
      error: error.message,
    })
  }
})

export default router
