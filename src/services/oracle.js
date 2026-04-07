/**
 * Service to interact with Oracles.cash Production Oracle
 * Using the official General Protocols Oracle API
 */

export const ORACLE_PUBKEY = '02d09db08af1ff4e8453919cc866a4be427d7bfe18f2c05e5444c196fcf6fd2818' // USD/BCH Oracle

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
 * Fetches the list of available oracles from the API
 * @param {AbortSignal} signal - Abort signal for request cancellation
 * @returns {Promise<Object>} Oracle list response data
 */
async function fetchOracleList(signal) {
  const ORACLE_API_URL = 'https://oracles.generalprotocols.com/api/v1/oracles'

  const oraclesResponse = await fetch(ORACLE_API_URL, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    signal,
  })

  if (!oraclesResponse.ok) {
    throw new Error(`Oracle API returned status: ${oraclesResponse.status}`)
  }

  return await oraclesResponse.json()
}

/**
 * Fetches the latest oracle message for a specific public key
 * @param {string} publicKey - Oracle public key
 * @returns {Promise<Object>} Oracle message data
 */
async function fetchOracleMessage(publicKey) {
  const oracleMessagesResponse = await fetch(
    `https://oracles.generalprotocols.com/api/v1/oracleMessages?publicKey=${publicKey}&count=1`,
  )

  if (!oracleMessagesResponse.ok) {
    throw new Error(`Oracle messages API returned status: ${oracleMessagesResponse.status}`)
  }

  const oracleMessageData = await oracleMessagesResponse.json()
  return oracleMessageData.oracleMessages[0]
}

/**
 * Validates oracle data and extracts USD/BCH oracle information
 * @param {Object} oracleListResponse - Response from oracle list API
 * @returns {Object} Validated oracle data
 */
function validateOracleData(oracleListResponse) {
  if (!oracleListResponse.oracles) {
    throw new Error('Invalid oracle response: missing oracles array')
  }

  const usdBchOracle = oracleListResponse.oracles.find(
    (oracle) => oracle.publicKey === ORACLE_PUBKEY,
  )

  if (!usdBchOracle) {
    throw new Error('USD/BCH oracle not found in oracle list')
  }

  if (!usdBchOracle.messageMetrics) {
    throw new Error('USD/BCH oracle has no message metrics')
  }

  const currentPriceInCents = usdBchOracle.messageMetrics.currentPrice
  if (!currentPriceInCents) {
    throw new Error('No current price available from oracle metrics')
  }

  return {
    currentPriceInCents,
    currentTimestamp: usdBchOracle.messageMetrics.maxMessageTimestamp,
  }
}

/**
 * Validates that the price is within a reasonable range
 * @param {number} priceInUSD - Price in USD
 * @returns {void} Throws error if price is out of range
 */
function validatePriceRange(priceInUSD) {
  if (priceInUSD < 50 || priceInUSD > 10000) {
    console.warn(`Oracle price seems unusual: $${priceInUSD}, using fallback`)
    throw new Error('Oracle price out of reasonable range')
  }
}

/**
 * Creates a successful oracle response object
 * @param {number} priceInUSD - Validated price in USD
 * @param {Object} oracleMessage - Oracle message data
 * @param {number} timestamp - Oracle timestamp
 * @returns {Object} Formatted oracle response
 */
function createOracleResponse(priceInUSD, oracleMessage, timestamp) {
  return {
    price: priceInUSD,
    message_hex: oracleMessage.message,
    signature_hex: oracleMessage.signature,
    oracle_pubkey_hex: ORACLE_PUBKEY,
    status: 'success',
    source: 'oracles.cash',
    timestamp,
    note: 'Price from oracle metrics, signature placeholder',
  }
}

/**
 * Creates a fallback response when oracle is unavailable
 * @param {Error} error - The error that triggered the fallback
 * @returns {Object} Fallback oracle response
 */
function createFallbackResponse(error) {
  console.error('Failed to fetch oracle price:', error)

  // Provide specific logging for different error types
  if (error.name === 'AbortError') {
    console.warn('Oracle request timed out, using fallback')
  } else if (error.message.includes('Failed to fetch')) {
    console.warn('Oracle server not reachable, using fallback')
  }

  return {
    price: 350.0,
    message_hex: '0000000000007530',
    signature_hex:
      '3044022044f7d0438553f6fb52be62a94e6d676c6d47536f6a101f51f76257931db14030022009073ba73e721684db25397e73d6c210',
    oracle_pubkey_hex: ORACLE_PUBKEY,
    status: 'fallback',
    source: 'fallback',
    timestamp: Date.now(),
  }
}

export async function fetchOraclePrice() {
  const { controller, timeoutId } = createTimeoutController()

  try {
    // Fetch and validate oracle data
    const oracleListResponse = await fetchOracleList(controller.signal)
    const { currentPriceInCents, currentTimestamp } = validateOracleData(oracleListResponse)

    // Convert and validate price
    const priceInUSD = currentPriceInCents / 100
    validatePriceRange(priceInUSD)

    // Fetch oracle message for signature data
    const oracleMessage = await fetchOracleMessage(ORACLE_PUBKEY)
    console.log('Fetched latest oracle message:', oracleMessage)

    // Clean up timeout and return success response
    clearTimeout(timeoutId)
    return createOracleResponse(priceInUSD, oracleMessage, currentTimestamp)
  } catch (error) {
    clearTimeout(timeoutId)
    return createFallbackResponse(error)
  }
}
