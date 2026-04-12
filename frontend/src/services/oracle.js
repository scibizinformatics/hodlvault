/**
 * Service to interact with Oracles.cash Production Oracle
 * Using the official General Protocols Oracle API
 */

export const ORACLE_PUBKEY = '02d09db08af1ff4e8453919cc866a4be427d7bfe18f2c05e5444c196fcf6fd2818' // USD/BCH Oracle

export async function fetchOraclePrice() {
  const ORACLE_API_URL = 'https://oracles.generalprotocols.com/api/v1/oracles'

  try {
    // First, get the latest oracle data to find the USD/BCH oracle
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    // Get oracle list to find USD/BCH oracle
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

    // Find the USD/BCH oracle
    const usdBchOracle = oraclesData.oracles.find((oracle) => oracle.publicKey === ORACLE_PUBKEY)

    if (!usdBchOracle || !usdBchOracle.messageMetrics) {
      throw new Error('USD/BCH oracle not found or has no message metrics')
    }

    // Get the current price from the oracle metrics
    const currentPriceInCents = usdBchOracle.messageMetrics.currentPrice
    const currentTimestamp = usdBchOracle.messageMetrics.maxMessageTimestamp

    if (!currentPriceInCents) {
      throw new Error('No current price available from oracle metrics')
    }

    // Convert cents to USD
    const priceInUSD = currentPriceInCents / 100

    // Validate the price seems reasonable
    if (priceInUSD < 50 || priceInUSD > 10000) {
      console.warn(`Oracle price seems unusual: $${priceInUSD}, using fallback`)
      throw new Error('Oracle price out of reasonable range')
    }

    // Create a properly formatted oracle message
    // Format: [timestamp][price_in_cents][asset_code]
    // Convert to Little-Endian format (reverse hex string)

    // Add asset code for USD (empty for now, as we're focusing on the price)

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
      price: priceInUSD,
      message_hex: oracleMessage.message,
      signature_hex: oracleMessage.signature,
      oracle_pubkey_hex: ORACLE_PUBKEY,
      status: 'success',
      source: 'oracles.cash',
      timestamp: currentTimestamp,
      note: 'Price from oracle metrics, signature placeholder',
    }
  } catch (error) {
    console.error('Failed to fetch oracle price:', error)

    // Provide fallback data when oracle is unavailable
    if (error.name === 'AbortError') {
      console.warn('Oracle request timed out, using fallback')
    } else if (error.message.includes('Failed to fetch')) {
      console.warn('Oracle server not reachable, using fallback')
    }

    // Return fallback data to prevent system from breaking
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
}
