/**
 * Oracle Service (Backend)
 * Fetches BCH price data from the General Protocols Oracle API.
 * Caches results to avoid rate limiting.
 */

export const ORACLE_PUBKEY = '02d09db08af1ff4e8453919cc866a4be427d7bfe18f2c05e5444c196fcf6fd2818'

const ORACLE_API_URL = 'https://oracles.generalprotocols.com/api/v1/oracles'
const CACHE_TTL_MS = 60 * 1000 // Cache for 60 seconds

let cachedData = null
let cachedAt = 0

/**
 * Fetch the latest oracle price, message, and signature.
 * Results are cached for 60 seconds.
 * @returns {Promise<{ priceInCents: number, messageHex: string, signatureHex: string, timestamp: number }>}
 */
export async function fetchOraclePrice() {
  const now = Date.now()

  // Return cached data if still fresh
  if (cachedData && now - cachedAt < CACHE_TTL_MS) {
    return cachedData
  }

  try {
    // Step 1: Get oracle list to find current price
    const oraclesResponse = await fetch(ORACLE_API_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    if (!oraclesResponse.ok) {
      throw new Error(`Oracle API returned status: ${oraclesResponse.status}`)
    }

    const oraclesData = await oraclesResponse.json()

    // Find the USD/BCH oracle
    const usdBchOracle = oraclesData.oracles.find(
      (oracle) => oracle.publicKey === ORACLE_PUBKEY,
    )

    if (!usdBchOracle || !usdBchOracle.messageMetrics) {
      throw new Error('USD/BCH oracle not found or has no message metrics')
    }

    const currentPriceInCents = usdBchOracle.messageMetrics.currentPrice

    if (!currentPriceInCents) {
      throw new Error('No current price available from oracle metrics')
    }

    // Validate the price seems reasonable
    const priceInUSD = currentPriceInCents / 100
    if (priceInUSD < 50 || priceInUSD > 10000) {
      throw new Error(`Oracle price out of reasonable range: $${priceInUSD}`)
    }

    // Step 2: Get the latest oracle message + signature
    const messageResponse = await fetch(
      `https://oracles.generalprotocols.com/api/v1/oracleMessages?publicKey=${ORACLE_PUBKEY}&count=1`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      },
    )

    if (!messageResponse.ok) {
      throw new Error(`Oracle messages API returned status: ${messageResponse.status}`)
    }

    const messageData = await messageResponse.json()
    const oracleMessage = messageData.oracleMessages[0]

    if (!oracleMessage) {
      throw new Error('No oracle messages available')
    }

    const result = {
      priceInCents: currentPriceInCents,
      messageHex: oracleMessage.message,
      signatureHex: oracleMessage.signature,
      timestamp: usdBchOracle.messageMetrics.maxMessageTimestamp,
    }

    // Update cache
    cachedData = result
    cachedAt = now

    console.log(
      `[Oracle] Price: $${priceInUSD.toFixed(2)} (${currentPriceInCents} cents), cached for ${CACHE_TTL_MS / 1000}s`,
    )

    return result
  } catch (error) {
    console.error('[Oracle] Price fetch failed:', error.message)

    // Return stale cache if available, otherwise throw
    if (cachedData) {
      console.warn('[Oracle] Using stale cached data')
      return cachedData
    }

    throw error
  }
}
