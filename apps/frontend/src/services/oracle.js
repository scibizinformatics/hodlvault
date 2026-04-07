/**
 * Service to interact with HodlVault Backend Oracle API
 * Uses local Node.js backend for centralized oracle data management
 */

import { ORACLE_PUBKEY } from '@hodlvault/shared'

export { ORACLE_PUBKEY }

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
 * Creates fallback response when oracle fetching fails
 * @param {Error} error - Error object
 * @returns {Object} Fallback oracle response
 */
function createFallbackResponse(error) {
  console.error('Oracle API error:', error.message)
  return {
    price: 30000, // $300 fallback price
    message_hex: '0000000000007530',
    signature_hex:
      '3044022044f7d0438553f6fb52be62a94e6d676c6d47536f6a101f51f76257931db14030022009073ba73e721684db25397e73d6c210',
    oracle_pubkey_hex: ORACLE_PUBKEY,
    status: 'fallback',
    source: 'fallback',
    timestamp: Date.now(),
  }
}

/**
 * Fetches oracle price from local HodlVault backend
 * @returns {Promise<Object>} Oracle price response
 */
export async function fetchOraclePrice() {
  const { controller, timeoutId } = createTimeoutController()

  try {
    // Fetch from local backend instead of General Protocols directly
    const backendUrl = import.meta.env?.VITE_BACKEND_URL || 'http://localhost:3001'
    const response = await fetch(`${backendUrl}/api/v1/oracle/price`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Backend API returned status: ${response.status}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.message || 'Backend API error')
    }

    const oracleData = result.data
    console.log('Fetched oracle data from backend:', oracleData)

    // Clean up timeout and return formatted response
    clearTimeout(timeoutId)
    return {
      price: oracleData.price,
      message_hex: '', // Will be populated by backend signing endpoint
      signature_hex: '', // Will be populated by backend signing endpoint
      oracle_pubkey_hex: ORACLE_PUBKEY,
      status: result.cached ? 'cached' : 'success',
      source: 'hodlvault-backend',
      timestamp: oracleData.blockheight,
      note: result.cached ? 'Price from backend cache' : 'Fresh price from backend',
      cached: result.cached,
      backendData: oracleData,
    }
  } catch (error) {
    clearTimeout(timeoutId)
    console.error('Failed to fetch oracle price from backend:', error)
    return createFallbackResponse(error)
  }
}
