/**
 * Service to interact with Oracles.cash Production Oracle
 * Using the official General Protocols Oracle API
 */

export const ORACLE_PUBKEY = '02891f242b141f43f0c983ad00a1bebb3578f092d7c7051c5b4415cf80ff609f90' // PHP/BCH Oracle

export async function fetchOraclePrice() {
  const ORACLE_API_URL = 'https://oracles.generalprotocols.com/api/v1/oracles'

  try {
    // First, get the latest oracle data to find the PHP/BCH oracle
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    // Get oracle list to find PHP/BCH oracle
    const oraclesResponse = await fetch(ORACLE_API_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })

    if (!oraclesResponse.ok) {
      throw new Error(`Oracle API returned status: ${oraclesResponse.status}`)
    }

    const oraclesData = await oraclesResponse.json()

    // Find the PHP/BCH oracle
    const phpBchOracle = oraclesData.oracles.find((oracle) => oracle.publicKey === ORACLE_PUBKEY)

    if (!phpBchOracle || !phpBchOracle.messageMetrics) {
      throw new Error('PHP/BCH oracle not found or has no message metrics')
    }

    // Get the current price from the oracle metrics
    const currentPrice = phpBchOracle.messageMetrics.currentPrice
    const currentTimestamp = phpBchOracle.messageMetrics.maxMessageTimestamp

    if (!currentPrice) {
      throw new Error('No current price available from oracle metrics')
    }

    // PHP oracle returns price in whole pesos (not cents like USD oracle)
    // Example: 27356 means ₱27,356 per BCH
    const priceInPHP = currentPrice

    // Validate the price seems reasonable (PHP/BCH typically ₱10,000-₱100,000)
    if (priceInPHP < 1000 || priceInPHP > 1000000) {
      console.warn(`Oracle price seems unusual: ₱${priceInPHP}, using fallback`)
      throw new Error('Oracle price out of reasonable range')
    }

    // Create a properly formatted oracle message
    // Format: [timestamp][price_in_cents][asset_code]
    // Convert to Little-Endian format (reverse hex string)

    // Add asset code for PHP (empty for now, as we're focusing on the price)

    clearTimeout(timeoutId)

    // Note: We don't have the actual signature from the API, so we'll use a placeholder
    // In a production environment, you might need to use Server-Sent Events or other methods
    // to get the actual signed message
    const _oracleResponse = await fetch(
      `https://oracles.generalprotocols.com/api/v1/oracleMessages?publicKey=${ORACLE_PUBKEY}&count=1`,
    )
    const oracleMessageData = await _oracleResponse.json()
    const oracleMessage = oracleMessageData.oracleMessages[0]
    console.log('Fetched latest oracle message:', oracleMessage)

    return {
      price: priceInPHP,
      message_hex: oracleMessage.message,
      signature_hex: oracleMessage.signature,
      oracle_pubkey_hex: ORACLE_PUBKEY,
      status: 'success',
      source: 'oracles.cash',
      timestamp: currentTimestamp,
      note: 'Price from oracle metrics, signature placeholder',
    }
  } catch (error) {
    console.error('Oracle price fetch failed:', error)

    // Determine specific error message
    let errorMessage = 'Unable to fetch BCH price from Oracle.'
    if (error.name === 'AbortError') {
      errorMessage = 'Oracle request timed out. Please check your connection and try again.'
    } else if (error.message?.includes('Failed to fetch')) {
      errorMessage = 'Cannot reach Oracle server. Please check your internet connection.'
    } else if (error.message?.includes('Oracle API returned status')) {
      errorMessage = `Oracle API error: ${error.message}`
    }

    // Throw proper error - NEVER use fake price data in DeFi
    throw new Error(`${errorMessage} Vault creation disabled until price data is available.`)
  }
}
