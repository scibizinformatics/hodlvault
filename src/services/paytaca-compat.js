/**
 * Paytaca-specific wallet compatibility layer
 * Addresses common issues with Paytaca WalletConnect integration
 */

/**
 * Validates and normalizes Paytaca transaction responses
 * Paytaca may return transactions in different formats
 */
export function normalizePaytacaResponse(result) {
  if (!result) return null
  
  console.log('DEBUG: Normalizing Paytaca response:', {
    resultType: typeof result,
    hasSignedTransaction: !!result.signedTransaction,
    hasHex: !!result.hex,
    hasTransactionHex: !!result.transactionHex,
    hasResult: !!result.result,
    hasTxid: !!result.txid,
    keys: Object.keys(result)
  })
  
  // Check if Paytaca already broadcasted the transaction and returned txid
  if (result.txid && typeof result.txid === 'string') {
    console.log('DEBUG: Paytaca returned transaction ID directly:', result.txid)
    return { txid: result.txid, success: true }
  }
  
  // Primary format: signedTransaction
  let signedHex = result.signedTransaction
  
  // Alternative formats
  if (!signedHex) {
    signedHex = result.hex || result.transactionHex
  }
  
  // Nested result format
  if (!signedHex && result.result) {
    signedHex = result.result.signedTransaction || 
                result.result.hex || 
                result.result.transactionHex
    
    // Check nested txid
    if (!result.txid && result.result.txid) {
      console.log('DEBUG: Found transaction ID in nested result:', result.result.txid)
      return { txid: result.result.txid, success: true }
    }
  }
  
  // Some wallets return base64 encoded transactions
  if (signedHex && typeof signedHex === 'string' && !isValidHex(signedHex)) {
    try {
      // Try base64 decode
      const decoded = atob(signedHex)
      if (isValidHex(decoded)) {
        signedHex = decoded
        console.log('DEBUG: Decoded base64 transaction hex')
      }
    } catch (e) {
      console.warn('DEBUG: Failed to decode base64 transaction:', e.message)
    }
  }
  
  if (signedHex) {
    console.log('DEBUG: Normalized transaction hex length:', signedHex.length)
    return { signedTransaction: signedHex, success: true }
  }
  
  // If no signed transaction but Paytaca indicated success, it may have broadcasted
  if (result.success || result.result?.success) {
    console.log('DEBUG: Paytaca indicated success but no transaction data - may have broadcasted')
    return { txid: null, success: true, broadcastedByWallet: true }
  }
  
  return result
}

/**
 * Validates if a string is valid hexadecimal
 */
function isValidHex(str) {
  return typeof str === 'string' && /^[0-9a-fA-F]+$/.test(str)
}

/**
 * Enhanced WalletConnect request wrapper for Paytaca
 * Includes retry logic and better error handling
 */
export async function paytacaRequest(walletConnectRequest, method, params, retries = 2) {
  console.log(`DEBUG: Paytaca request ${method}, attempt ${retries + 1}`)
  
  try {
    const result = await walletConnectRequest(method, params)
    console.log(`DEBUG: Paytaca ${method} success`)
    return normalizePaytacaResponse(result)
  } catch (error) {
    console.error(`DEBUG: Paytaca ${method} failed:`, {
      message: error.message,
      code: error.code,
      data: error.data,
      remainingRetries: retries
    })
    
    // Retry on specific errors
    if (retries > 0 && shouldRetry(error)) {
      console.log(`DEBUG: Retrying ${method}...`)
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
      return paytacaRequest(walletConnectRequest, method, params, retries - 1)
    }
    
    throw error
  }
}

/**
 * Determines if an error should trigger a retry
 */
function shouldRetry(error) {
  // Retry on network-related errors and timeouts
  if (error.code === -32603) return true // Internal error
  if (error.message?.includes('timeout')) return true
  if (error.message?.includes('network')) return true
  if (error.message?.includes('connection')) return true
  
  return false
}

/**
 * Validates Paytaca chain compatibility
 */
export function validatePaytacaChain(chainId, expectedChain = 'bch:chipnet') {
  const supportedChains = ['bch:chipnet', 'bch:bchtest', 'bch:bitcoincash']
  
  console.log('DEBUG: Chain validation:', {
    currentChain: chainId,
    expectedChain,
    supportedChains
  })
  
  if (!chainId) {
    console.warn('DEBUG: No chain ID provided')
    return false
  }
  
  if (!supportedChains.includes(chainId)) {
    console.warn('DEBUG: Unsupported chain ID:', chainId)
    return false
  }
  
  return true
}

/**
 * Enhanced transaction payload for Paytaca compatibility
 */
export function createPaytacaPayload(basePayload) {
  const enhanced = {
    ...basePayload,
    // Add Paytaca-specific fields if needed
    userPrompt: basePayload.userPrompt || 'Sign transaction',
    broadcast: false, // Always false for signing
  }
  
  console.log('DEBUG: Enhanced Paytaca payload:', enhanced)
  return enhanced
}
