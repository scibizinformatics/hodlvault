/**
 * Service to interact with the Django HodlVault Oracle
 */

export async function fetchOraclePrice() {
  // Use 127.0.0.1 to match your Django server's running address
  const ORACLE_URL = 'http://127.0.0.1:8000/api/price/'

  try {
    // Add timeout and better headers
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

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

    // Validate required fields
    if (!data.price_usd || !data.message_hex || !data.signature_hex || !data.oracle_pubkey_hex) {
      console.error('Invalid oracle data structure:', data)
      throw new Error('Oracle response missing required fields')
    }

    // Map the Django API response to the format the Quasar UI expects
    return {
      price: parseFloat(data.price_usd),
      message_hex: data.message_hex,
      signature_hex: data.signature_hex,
      oracle_pubkey_hex: data.oracle_pubkey_hex,
      status: data.status || 'success',
    }
  } catch (error) {
    console.error('Connection to Oracle failed:', error)

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
      oracle_pubkey_hex: '03a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd',
      status: 'fallback',
    }
  }
}
