/**
 * Wallet-based authentication middleware
 * Simple middleware to extract and validate wallet address from headers
 * In a DeFi system, we trust the wallet provider (WalletConnect/Paytaca) for authentication
 */

/**
 * Extract wallet address from request headers or body
 * Wallet address serves as the user identifier in DeFi applications
 */
export const extractWalletAddress = (req, res, next) => {
  try {
    // Try to get wallet address from header first
    let walletAddress = req.headers['x-wallet-address'] || req.headers['wallet-address']
    
    // If not in headers, try to get from body for POST/PUT requests
    if (!walletAddress && req.body && req.body.walletAddress) {
      walletAddress = req.body.walletAddress
    }

    if (!walletAddress) {
      return res.status(400).json({
        message: 'Wallet address required',
        error: 'MISSING_WALLET_ADDRESS'
      })
    }

    // Normalize wallet address (lowercase for consistency)
    req.walletAddress = walletAddress.toLowerCase().trim()
    
    next()
  } catch (error) {
    console.error('Wallet extraction error:', error)
    return res.status(500).json({
      message: 'Internal server error',
      error: 'WALLET_EXTRACTION_ERROR'
    })
  }
}

/**
 * Optional wallet address extraction
 * For endpoints that work with or without wallet
 */
export const optionalWalletAddress = (req, res, next) => {
  try {
    let walletAddress = req.headers['x-wallet-address'] || req.headers['wallet-address']
    
    if (!walletAddress && req.body && req.body.walletAddress) {
      walletAddress = req.body.walletAddress
    }

    // Set wallet address if found, otherwise null
    req.walletAddress = walletAddress ? walletAddress.toLowerCase().trim() : null
    
    next()
  } catch (error) {
    req.walletAddress = null
    next()
  }
}

/**
 * Validate wallet address format
 * Basic validation for Bitcoin Cash addresses
 */
export const validateWalletAddress = (req, res, next) => {
  try {
    const walletAddress = req.walletAddress || req.body.walletAddress || req.params.walletAddress
    
    if (!walletAddress) {
      return res.status(400).json({
        message: 'Wallet address is required',
        error: 'MISSING_WALLET_ADDRESS'
      })
    }

    // Basic validation - check if it looks like a Bitcoin Cash address
    // BCH addresses typically start with bitcoincash:, bchtest:, or chipnet:
    const normalizedAddress = walletAddress.toLowerCase().trim()
    
    // Check if it matches common BCH address patterns
    const validPrefixes = ['bitcoincash:', 'bchtest:', 'chipnet:']
    const hasValidPrefix = validPrefixes.some(prefix => normalizedAddress.startsWith(prefix))
    
    // Also accept addresses without prefix (legacy format)
    if (!hasValidPrefix && normalizedAddress.length < 25) {
      return res.status(400).json({
        message: 'Invalid wallet address format',
        error: 'INVALID_WALLET_ADDRESS'
      })
    }

    // Set normalized address
    req.walletAddress = normalizedAddress
    
    next()
  } catch (error) {
    console.error('Wallet validation error:', error)
    return res.status(500).json({
      message: 'Internal server error',
      error: 'WALLET_VALIDATION_ERROR'
    })
  }
}
