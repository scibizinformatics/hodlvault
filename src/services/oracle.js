/**
 * Service to interact with Oracles.cash Production Oracle
 */

export const ORACLE_PUBKEY = '02d09613d20ce44da55956799863c0a5e82c5896a2df33502b4859664650529d2f'

export async function fetchOraclePrice() {
  // Oracles.cash Production API
  const ORACLE_URL = 'https://oracle1.mainnet.cash/api/v1/price/bch-usd'

  try {
    // Add timeout and better headers
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout for external API

    const response = await fetch(ORACLE_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Oracle server returned status: ${response.status}`)
    }

    const responseText = await response.text()

    // Check if response is empty
    if (!responseText || responseText.trim() === '') {
      throw new Error('Empty response from oracle server')
    }

    // Try to parse JSON
    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse oracle response:', parseError)
      console.error('Response text:', responseText)
      throw new Error('Invalid JSON response from oracle server')
    }

    // Validate required fields from Oracles.cash API
    if (!data.price || !data.message || !data.signature) {
      console.error('Invalid oracle data structure:', data)
      throw new Error('Oracle response missing required fields')
    }

    // Map Oracles.cash API response to the format the UI expects
    return {
      price: parseFloat(data.price),
      message_hex: data.message,
      signature_hex: data.signature,
      oracle_pubkey_hex: ORACLE_PUBKEY,
      status: 'success',
      source: 'oracles.cash',
    }
  } catch (error) {
    console.error('Connection to Oracles.cash failed:', error)

    // Provide fallback data when oracle is unavailable
    if (error.name === 'AbortError') {
      console.warn('Oracle request timed out, using fallback')
    } else if (error.message.includes('Failed to fetch')) {
      console.warn('Oracle server not reachable, using fallback')
    }

    // Return fallback data to prevent system from breaking
    return {
      price: 300.0,
      message_hex: '0000000000007530',
      signature_hex:
        '3044022044f7d0438553f6fb52be62a94e6d676c6d47536f6a101f51f76257931db14030022009073ba73e721684db25397e73d6c210',
      oracle_pubkey_hex: ORACLE_PUBKEY,
      status: 'fallback',
      source: 'fallback',
    }
  }
}
