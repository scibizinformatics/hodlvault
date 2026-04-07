/**
 * Vault API Routes
 * Handles oracle data signing for HodlVault contracts
 */

import { Router, Request, Response } from 'express'
import { createSignerService } from '../services/signerService'
import { OracleData, ApiResponse, SignatureResponse } from '@hodlvault/shared'

const router = Router()

// Initialize signer service
let signerService: ReturnType<typeof createSignerService>

try {
  signerService = createSignerService(process.env.ORACLE_PRIVATE_KEY)
  console.log('✅ SignerService initialized successfully')
} catch (error) {
  console.error('❌ Failed to initialize SignerService:', error)
  signerService = null as any
}

/**
 * POST /api/v1/vault/sign
 * Generates oracle signature for HodlVault contract spend function
 * 
 * Request Body:
 * {
 *   "price": 50000,
 *   "blockheight": 840000,
 *   "network": "mainnet"
 * }
 */
router.post('/sign', (req: Request, res: Response) => {
  try {
    // Law 1: Guard Clauses
    if (!signerService) {
      return res.status(500).json({
        success: false,
        error: 'SignerService not initialized',
        message: 'Oracle private key not configured'
      } as ApiResponse)
    }

    const { price, blockheight, network }: OracleData = req.body

    // Validate request body
    if (!price || !blockheight || !network) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'price, blockheight, and network are required'
      } as ApiResponse)
    }

    // Validate data types
    if (typeof price !== 'number' || price <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid price',
        message: 'price must be a positive number'
      } as ApiResponse)
    }

    if (typeof blockheight !== 'number' || blockheight <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid blockheight',
        message: 'blockheight must be a positive number'
      } as ApiResponse)
    }

    if (!['mainnet', 'testnet3', 'chipnet'].includes(network)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid network',
        message: 'network must be one of: mainnet, testnet3, chipnet'
      } as ApiResponse)
    }

    const oracleData: OracleData = { price, blockheight, network }

    // Validate oracle message format before signing
    const isValidFormat = signerService.validateOracleMessageFormat(oracleData)
    if (!isValidFormat) {
      return res.status(400).json({
        success: false,
        error: 'Invalid oracle data format',
        message: 'Oracle data failed format validation'
      } as ApiResponse)
    }

    // Generate oracle message and signature
    const oracleMessage = signerService.createOracleMessage(oracleData)
    const signature = signerService.signPriceData(oracleData)
    const oraclePubkey = signerService.getOraclePubkey()

    console.log('Generated signature for vault:', {
      price,
      blockheight,
      network,
      messageLength: oracleMessage.length / 2,
      signatureLength: signature.length / 2
    })

    const response: SignatureResponse = {
      success: true,
      data: {
        oracleMessage,
        signature,
        oraclePubkey
      }
    }

    res.json(response)

  } catch (error) {
    console.error('Vault signing error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate signature',
      message: (error as Error).message
    } as ApiResponse)
  }
})

/**
 * POST /api/v1/vault/validate
 * Validates oracle data format without generating signature
 * Useful for frontend validation before requesting signature
 */
router.post('/validate', (req: Request, res: Response) => {
  try {
    if (!signerService) {
      return res.status(500).json({
        success: false,
        error: 'SignerService not initialized',
        message: 'Oracle private key not configured'
      } as ApiResponse)
    }

    const { price, blockheight, network }: OracleData = req.body

    // Basic validation
    if (!price || !blockheight || !network) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'price, blockheight, and network are required'
      } as ApiResponse)
    }

    const oracleData: OracleData = { price, blockheight, network }

    // Validate format
    const isValidFormat = signerService.validateOracleMessageFormat(oracleData)
    
    if (isValidFormat) {
      const oracleMessage = signerService.createOracleMessage(oracleData)
      res.json({
        success: true,
        data: {
          valid: true,
          oracleMessage,
          oraclePubkey: signerService.getOraclePubkey()
        }
      } as ApiResponse)
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid format',
        message: 'Oracle data failed format validation'
      } as ApiResponse)
    }

  } catch (error) {
    console.error('Vault validation error:', error)
    res.status(500).json({
      success: false,
      error: 'Validation failed',
      message: (error as Error).message
    } as ApiResponse)
  }
})

/**
 * GET /api/v1/vault/health
 * Health check for vault signing service
 */
router.get('/health', (req: Request, res: Response) => {
  const isInitialized = !!signerService
  
  let testResult = null
  if (isInitialized) {
    testResult = signerService.runSelfTest()
  }

  res.json({
    success: true,
    data: {
      status: isInitialized ? 'healthy' : 'unhealthy',
      signerInitialized: isInitialized,
      oraclePubkey: isInitialized ? signerService.getOraclePubkey() : null,
      selfTest: testResult
    }
  } as ApiResponse)
})

export default router
