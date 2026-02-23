/**
 * Service to interact with the Django HodlVault Oracle
 */

export async function fetchOraclePrice() {
  // Use 127.0.0.1 to match your Django server's running address
  const ORACLE_URL = 'http://127.0.0.1:8000/api/price/';

  try {
    const response = await fetch(ORACLE_URL);
    
    if (!response.ok) {
      throw new Error(`Oracle server returned status: ${response.status}`);
    }

    const data = await response.json();

    // Map the Django API response to the format the Quasar UI expects
    return {
      price: parseFloat(data.price_usd),
      message_hex: data.message_hex,
      signature_hex: data.signature_hex,
      oracle_pubkey_hex: data.oracle_pubkey_hex,
      status: data.status
    };
  } catch (error) {
    console.error('Connection to Oracle failed:', error);
    throw error;
  }
}