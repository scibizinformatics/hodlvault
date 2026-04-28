import { ElectrumNetworkProvider } from 'cashscript'

const BCH_NETWORK = process.env.BCH_NETWORK || 'chipnet'

const queryProviders = new Map()

function getFallbackHostnames(network) {
  if (network === 'testnet3') return ['testnet.bitcoincash.network']
  if (network === 'chipnet') return ['chipnet.bch.ninja']
  if (network === 'mainnet') return ['bitcoincash.network']
  return []
}

function getQueryProvider(network, hostname) {
  const key = `${network}|${hostname || '__default__'}`
  if (queryProviders.has(key)) return queryProviders.get(key)
  const provider = hostname
    ? new ElectrumNetworkProvider(network, { hostname })
    : new ElectrumNetworkProvider(network)
  queryProviders.set(key, provider)
  return provider
}

function inferNetworkFromAddress(address) {
  if (typeof address !== 'string') return BCH_NETWORK
  const prefix = address.includes(':') ? address.split(':')[0] : null
  if (prefix === 'bitcoincash') return 'mainnet'
  if (prefix === 'bchtest') {
    return BCH_NETWORK === 'chipnet' ? 'chipnet' : 'testnet3'
  }
  if (prefix === 'chipnet') return 'chipnet'
  return BCH_NETWORK
}

/**
 * Get balance for any address by querying UTXOs
 * @param {string} address - Bitcoin Cash address
 * @returns {Promise<bigint>} Balance in satoshis
 */
export async function getAddressBalance(address) {
  if (!address) throw new Error('Address is required')

  const network = inferNetworkFromAddress(address)
  const hostnames = [null, ...getFallbackHostnames(network)]
  let lastError = null

  for (const hostname of hostnames) {
    try {
      const provider = getQueryProvider(network, hostname)
      const utxos = await provider.getUtxos(address)
      return utxos.reduce((sum, u) => sum + BigInt(u.satoshis), 0n)
    } catch (e) {
      lastError = e
    }
  }

  throw new Error(`Failed to get balance: ${lastError?.message || 'Unknown error'}`)
}

/**
 * Get UTXOs for an address (includes transaction IDs for deposit tracking)
 * @param {string} address - Bitcoin Cash address
 * @returns {Promise<Array<{txid: string, vout: number, satoshis: number}>>} UTXOs
 */
export async function getAddressUtxos(address) {
  if (!address) throw new Error('Address is required')

  const network = inferNetworkFromAddress(address)
  const hostnames = [null, ...getFallbackHostnames(network)]
  let lastError = null

  for (const hostname of hostnames) {
    try {
      const provider = getQueryProvider(network, hostname)
      const utxos = await provider.getUtxos(address)
      return utxos.map((u) => ({
        txid: u.txid,
        vout: u.vout,
        satoshis: Number(u.satoshis),
      }))
    } catch (e) {
      lastError = e
    }
  }

  throw new Error(`Failed to get UTXOs: ${lastError?.message || 'Unknown error'}`)
}
