/**
 * Oracle API Routes
 * Handles price fetching from General Protocols and local caching
 */

import { Router, Request, Response } from 'express'
import { createSignerService } from '../services/signerService'
// import { OracleData, ApiResponse } from '@hodlvault/shared'

// Temporary interfaces for testing
interface OracleData {
  price: number
  blockheight: number
  network: 'mainnet' | 'testnet3' | 'chipnet'
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

const router = Router()

// Cache for oracle data (5 minute TTL)
let oracleCache: {
  data: OracleData | null
  timestamp: number
  ttl: number
} = {
  data: null,
  timestamp: 0,
  ttl: 5 * 60 * 1000, // 5 minutes
}

/**
 * Fetches oracle data from General Protocols API
 */
async function fetchOracleFromGeneralProtocols(): Promise<OracleData> {
  const ORACLE_API_URL =
    process.env.GENERAL_PROTOCOLS_API_URL || 'https://oracles.generalprotocols.com/api/v1'

  try {
    // Fetch oracle list
    const oraclesResponse = await fetch(`${ORACLE_API_URL}/oracles`)
    if (!oraclesResponse.ok) {
      throw new Error(`Oracle API returned status: ${oraclesResponse.status}`)
    }

    const oracleList = await oraclesResponse.json()

    // Find USD/BCH oracle
    const usdBchOracle = oracleList.oracles.find(
      (oracle: any) => oracle.publicKey === process.env.ORACLE_PUBKEY,
    )

    if (!usdBchOracle || !usdBchOracle.messageMetrics) {
      throw new Error('USD/BCH oracle not found or missing metrics')
    }

    const currentPriceInCents = usdBchOracle.messageMetrics.currentPrice
    if (!currentPriceInCents) {
      throw new Error('No current price available from oracle metrics')
    }

    // Convert cents to USD
    const priceInUSD = currentPriceInCents / 100

    // Validate price range
    if (priceInUSD < 50 || priceInUSD > 10000) {
      console.warn(`Oracle price seems unusual: $${priceInUSD}`)
    }

    return {
      price: priceInUSD,
      blockheight: usdBchOracle.messageMetrics.maxMessageTimestamp || 840000,
      network: 'chipnet', // Default to chipnet for development
    }
  } catch (error) {
    console.error('Failed to fetch oracle data:', error)
    throw error
  }
}

/**
 * GET /api/v1/oracle/price
 * Returns current USD/BCH price from General Protocols
 */
router.get('/price', async (req: Request, res: Response) => {
  try {
    const now = Date.now()

    // Check cache validity
    if (oracleCache.data && now - oracleCache.timestamp < oracleCache.ttl) {
      console.log('Returning cached oracle data')
      return res.json({
        success: true,
        data: oracleCache.data,
        cached: true,
        timestamp: oracleCache.timestamp,
      } as ApiResponse<OracleData>)
    }

    // Fetch fresh data
    console.log('Fetching fresh oracle data from General Protocols')
    const oracleData = await fetchOracleFromGeneralProtocols()

    // Update cache
    oracleCache = {
      data: oracleData,
      timestamp: now,
      ttl: oracleCache.ttl,
    }

    res.json({
      success: true,
      data: oracleData,
      cached: false,
      timestamp: now,
    } as ApiResponse<OracleData>)
  } catch (error) {
    console.error('Oracle price endpoint error:', error)

    // Return cached data if available, even if expired
    if (oracleCache.data) {
      console.log('Returning expired cached data as fallback')
      return res.json({
        success: true,
        data: oracleCache.data,
        cached: true,
        expired: true,
        warning: 'Using expired cached data due to API error',
      } as ApiResponse<OracleData>)
    }

    // Return error if no cache available
    res.status(500).json({
      success: false,
      error: 'Failed to fetch oracle price',
      message: (error as Error).message,
    } as ApiResponse)
  }
})

/**
 * GET /api/v1/oracle/health
 * Health check for oracle service
 */
router.get('/health', (req: Request, res: Response) => {
  const now = Date.now()
  const cacheAge = oracleCache.data ? now - oracleCache.timestamp : 0

  res.json({
    success: true,
    data: {
      status: 'healthy',
      cacheAvailable: !!oracleCache.data,
      cacheAge: cacheAge,
      cacheExpired: cacheAge > oracleCache.ttl,
      oraclePubkey: process.env.ORACLE_PUBKEY,
    },
  } as ApiResponse)
})

export default router
