/**
 * Service to interact with HodlVault Backend for vault signing
 * Handles oracle data signing for HodlVault contracts
 */

import { ORACLE_PUBKEY } from '@hodlvault/shared'

/**
 * Creates a timeout controller for API requests
 * @param {number} timeoutMs - Timeout duration in milliseconds
 * @returns {Object} Controller and timeout ID
 */
function createTimeoutController(timeoutMs = 10000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  return { controller, timeoutId }
}

/**
 * Requests oracle signature from local backend
 * @param {Object} oracleData - Oracle data to sign
 * @param {number} oracleData.price - Price in USD
 * @param {number} oracleData.blockheight - Block height
 * @param {string} oracleData.network - Network name
 * @returns {Promise<Object>} Signature response
 */
export async function signOracleData(oracleData) {
  const { controller, timeoutId } = createTimeoutController()

  try {
    // Validate input
    if (!oracleData.price || !oracleData.blockheight || !oracleData.network) {
      throw new Error('Missing required oracle data fields')
    }

    const backendUrl = import.meta.env?.VITE_BACKEND_URL || 'http://localhost:3001'
    const response = await fetch(`${backendUrl}/api/v1/vault/sign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(oracleData),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Backend API returned status: ${response.status}`)
    }

    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || 'Backend signing error')
    }

    console.log('Received signature from backend:', {
      oracleMessage: result.data.oracleMessage.substring(0, 20) + '...',
      signature: result.data.signature.substring(0, 20) + '...',
      oraclePubkey: result.data.oraclePubkey
    })

    // Clean up timeout and return success response
    clearTimeout(timeoutId)
    return {
      success: true,
      oracleMessage: result.data.oracleMessage,
      signature: result.data.signature,
      oraclePubkey: result.data.oraclePubkey,
      source: 'hodlvault-backend'
    }
  } catch (error) {
    clearTimeout(timeoutId)
    console.error('Failed to sign oracle data:', error)
    return {
      success: false,
      error: error.message,
      source: 'hodlvault-backend-error'
    }
  }
}

/**
 * Validates oracle data format using backend validation endpoint
 * @param {Object} oracleData - Oracle data to validate
 * @returns {Promise<Object>} Validation result
 */
export async function validateOracleData(oracleData) {
  const { controller, timeoutId } = createTimeoutController()

  try {
    if (!oracleData.price || !oracleData.blockheight || !oracleData.network) {
      throw new Error('Missing required oracle data fields')
    }

    const backendUrl = import.meta.env?.VITE_BACKEND_URL || 'http://localhost:3001'
    const response = await fetch(`${backendUrl}/api/v1/vault/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(oracleData),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Backend API returned status: ${response.status}`)
    }

    const result = await response.json()
    
    clearTimeout(timeoutId)
    return {
      success: result.success,
      valid: result.data?.valid || false,
      oracleMessage: result.data?.oracleMessage || '',
      oraclePubkey: result.data?.oraclePubkey || ORACLE_PUBKEY,
      error: result.error || null
    }
  } catch (error) {
    clearTimeout(timeoutId)
    console.error('Failed to validate oracle data:', error)
    return {
      success: false,
      valid: false,
      error: error.message
    }
  }
}

/**
 * Checks backend health status
 * @returns {Promise<Object>} Health check result
 */
export async function checkBackendHealth() {
  try {
    const backendUrl = import.meta.env?.VITE_BACKEND_URL || 'http://localhost:3001'
    const response = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`)
    }

    const result = await response.json()
    return {
      success: true,
      healthy: result.success,
      message: result.message,
      oraclePubkey: result.oraclePubkey,
      timestamp: result.timestamp
    }
  } catch (error) {
    console.error('Backend health check failed:', error)
    return {
      success: false,
      healthy: false,
      error: error.message
    }
  }
}
