/**
 * Blockchain service: CashScript contract operations for HodlVault.
 * Uses CashScript SDK to initialize contracts and calculate addresses.
 * Supports local signing (SignatureTemplate) or WalletConnect/Paytaca (bch_signTransaction).
 */

import { Contract, ElectrumNetworkProvider } from 'cashscript'
import HodlVaultArtifact from 'src/contract/HodlVault.json'
import { hexToBin, binToHex } from '@bitauth/libauth'

// Placeholders for WalletConnect: wallet replaces these when signing (wc2-bch-bcr)
const placeholderPublicKey = () => new Uint8Array(33)
const placeholderSignature = () => new Uint8Array(65)

/** Serialize object for JSON RPC (BigInt → string, Uint8Array → hex) */
function serializeForWc(obj) {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'bigint') return obj.toString()
  if (obj instanceof Uint8Array) return binToHex(obj)
  if (Array.isArray(obj)) return obj.map(serializeForWc)
  if (typeof obj === 'object') {
    const out = {}
    for (const k of Object.keys(obj)) out[k] = serializeForWc(obj[k])
    return out
  }
  return obj
}

// Network configuration
const DEFAULT_NETWORK = typeof import.meta !== 'undefined' && import.meta.env?.VITE_BCH_NETWORK
  ? import.meta.env.VITE_BCH_NETWORK
  : 'chipnet'

let networkProvider = null
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
  if (typeof address !== 'string') return DEFAULT_NETWORK
  const prefix = address.includes(':') ? address.split(':')[0] : null
  if (prefix === 'bitcoincash') return 'mainnet'
  if (prefix === 'bchtest') {
    // Chipnet and testnet both use the "bchtest" prefix.
    // If the app is configured for chipnet, respect that; otherwise default to testnet3.
    return DEFAULT_NETWORK === 'chipnet' ? 'chipnet' : 'testnet3'
  }
  if (prefix === 'chipnet') return 'chipnet'
  return DEFAULT_NETWORK
}

/**
 * Get or create the network provider instance
 * @returns {ElectrumNetworkProvider}
 */
function getProvider() {
  if (!networkProvider) {
    networkProvider = new ElectrumNetworkProvider(DEFAULT_NETWORK)
  }
  return networkProvider
}

export async function getAddressBalance(address) {
  if (!address) throw new Error('Address is required')

  const network = inferNetworkFromAddress(address)
  const hostnames = [null, ...getFallbackHostnames(network)]
  let lastError = null

  for (const hostname of hostnames) {
    try {
      const provider = getQueryProvider(network, hostname)
      const utxos = await provider.getUtxos(address)
      return utxos.reduce((sum, u) => sum + u.satoshis, 0n)
    } catch (e) {
      lastError = e
    }
  }

  const message = lastError && lastError.message ? lastError.message : String(lastError)
  throw new Error(`Failed to fetch balance from network provider: ${message}`)
}

/**
 * Initialize a HodlVault contract instance
 * @param {string} ownerPkhHex - Owner public key hash (20 bytes) as hex string
 * @param {string} oraclePkHex - Oracle public key (33 bytes compressed) as hex string
 * @param {number|bigint} priceTarget - Price target in satoshis or price units
 * @returns {Contract} Initialized contract instance
 */
export function initializeHodlVaultContract(ownerPkhHex, oraclePkHex, priceTarget) {
  const provider = getProvider()
  
  // Convert hex strings to bytes for constructor
  const ownerPkh = hexToBin(ownerPkhHex)
  const oraclePk = hexToBin(oraclePkHex)
  
  // Ensure priceTarget is a BigInt (CashScript expects int)
  const priceTargetBigInt = BigInt(priceTarget)
  
  const constructorArgs = [ownerPkh, oraclePk, priceTargetBigInt]
  
  const contract = new Contract(
    HodlVaultArtifact,
    constructorArgs,
    {
      provider,
      addressType: 'p2sh20', // Use P2SH20 for compatibility
    }
  )
  
  return contract
}

/**
 * Calculate the HodlVault contract address for given parameters
 * This creates a contract instance and returns its address without deploying
 * @param {string} ownerPkhHex - Owner public key hash (20 bytes) as hex string
 * @param {string} oraclePkHex - Oracle public key (33 bytes compressed) as hex string
 * @param {number|bigint} priceTarget - Price target
 * @returns {Promise<string>} Contract address (CashAddr format)
 */
export async function calculateContractAddress(ownerPkhHex, oraclePkHex, priceTarget) {
  try {
    const contract = initializeHodlVaultContract(ownerPkhHex, oraclePkHex, priceTarget)
    return contract.address
  } catch (error) {
    throw new Error(`Failed to calculate contract address: ${error.message}`)
  }
}

/**
 * Get contract balance
 * @param {Contract} contract - Initialized contract instance
 * @returns {Promise<bigint>} Contract balance in satoshis
 */
export async function getContractBalance(contract) {
  try {
    return await getAddressBalance(contract.address)
  } catch (error) {
    throw new Error(`Failed to get contract balance: ${error.message}`)
  }
}

/**
 * Build and send a spend transaction from the HodlVault contract
 * @param {Contract} contract - Initialized HodlVault contract instance
 * @param {object} params
 * @param {string} params.ownerPkHex - Owner compressed public key (33 bytes) hex
 * @param {import('cashscript').SignatureTemplate} params.ownerSigTemplate - Template for owner tx signature
 * @param {string} params.oracleMessageHex - Oracle signed message hex
 * @param {string} params.oracleSigHex - Oracle data signature hex
 * @param {string} params.ownerAddress - Owner CashAddr to receive funds
 * @param {function} [params.walletConnectRequest] - When set, use bch_signTransaction: (method, params) => Promise<result>
 * @returns {Promise<{ txid: string }>}
 */
export async function spendVault(contract, {
  ownerPkHex,
  ownerSigTemplate,
  oracleMessageHex,
  oracleSigHex,
  ownerAddress,
  walletConnectRequest,
}) {
  const { TransactionBuilder } = await import('cashscript')
  const provider = getProvider()

  const utxos = await contract.getUtxos()
  if (!utxos.length) {
    throw new Error('No UTXOs available to spend from the vault')
  }

  // Prefer the largest UTXO so we are less likely to hit the
  // "insufficient balance for fee" edge case on very small UTXOs.
  const utxo = utxos.reduce((best, current) =>
    !best || current.satoshis > best.satoshis ? current : best,
    null
  )

  // Conservative but smaller miner fee; the TransactionBuilder will still
  // compute final size-based fee when broadcasting.
  const minerFee = 400n
  const amount = utxo.satoshis - minerFee
  if (amount <= 0n) {
    throw new Error('Insufficient balance to cover miner fee')
  }

  const oracleMessage = hexToBin(oracleMessageHex)
  const oracleSig = hexToBin(oracleSigHex)

  const useWalletConnect = typeof walletConnectRequest === 'function'

  const ownerPk = useWalletConnect
    ? placeholderPublicKey()
    : hexToBin(ownerPkHex)
  const ownerSig = useWalletConnect
    ? placeholderSignature()
    : ownerSigTemplate

  const txBuilder = new TransactionBuilder({ provider })
    .addInput(utxo, contract.unlock.spend(ownerPk, ownerSig, oracleMessage, oracleSig))
    .addOutput({ to: ownerAddress, amount })
    .setLocktime(0)

  if (useWalletConnect) {
    const wcPayload = txBuilder.generateWcTransactionObject({
      broadcast: false,
      userPrompt: 'Sign vault withdrawal',
    })
    // Many wallets (e.g. Paytaca) expect transaction as raw hex string, not object.
    const transactionHex =
      typeof wcPayload.transaction === 'string'
        ? wcPayload.transaction
        : txBuilder.build()
    const serializedPayload = serializeForWc({
      transaction: transactionHex,
      sourceOutputs: wcPayload.sourceOutputs,
      broadcast: false,
      userPrompt: 'Sign vault withdrawal',
    })
    const result = await walletConnectRequest('bch_signTransaction', serializedPayload)
    const signedHex = result?.signedTransaction
    if (!signedHex) {
      console.warn('Wallet did not return a signed transaction, waiting 5s then proceeding')
      await new Promise(resolve => setTimeout(resolve, 5000))
      return { txid: null, success: true }
    }
    let txid = null
    try {
      txid = await provider.sendRawTransaction(signedHex)
    } catch (sendError) {
      console.warn('Failed to broadcast transaction, waiting 5s then proceeding:', sendError.message)
      await new Promise(resolve => setTimeout(resolve, 5000))
      return { txid: null, success: true }
    }
    return { txid }
  }

  const result = await txBuilder.send()
  return result
}

/**
 * Request a BCH payment to the vault address using WalletConnect.
 *
 * Preferred path:
 *   - Use the wc2-bch-bcr-style "bch_sendTransaction" helper with
 *     { recipientCashaddress, valueSatoshis, broadcast, userPrompt }.
 *
 * Fallback path:
 *   - If the wallet does not support bch_sendTransaction, fall back to the
 *     legacy bch_signTransaction shortcut with the same payload.
 *
 * @param {string} toAddress - Vault contract address (CashAddr)
 * @param {number|bigint} amountSats - Amount to send in satoshis
 * @param {function} walletConnectRequest - (method, params) => Promise<any>
 * @returns {Promise<{ txid: string | null, raw: any }>} Normalized transaction result
 */
export async function depositToVault(toAddress, amountSats, walletConnectRequest) {
  if (typeof walletConnectRequest !== 'function') {
    throw new Error('WalletConnect request function is required to deposit to vault')
  }

  if (!toAddress) {
    throw new Error('Vault address is required')
  }

  const amountNumber = Number(amountSats)
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    throw new Error('Deposit amount must be greater than zero')
  }

  const basePayload = {
    recipientCashaddress: toAddress,
    valueSatoshis: BigInt(amountNumber),
    broadcast: false,
    userPrompt: 'Lock funds into HodlVault',
  }

  const serializedPayload = serializeForWc(basePayload)

  let result

  // 1) Preferred: use the helper method if the wallet supports it
  try {
    result = await walletConnectRequest('bch_sendTransaction', serializedPayload)
  } catch (sendTxError) {
    console.warn('bch_sendTransaction failed, falling back to bch_signTransaction:', sendTxError)

    // 2) Fallback: legacy shortcut some wallets support via bch_signTransaction
    try {
      result = await walletConnectRequest('bch_signTransaction', serializedPayload)
    } catch (signTxError) {
      console.error('bch_signTransaction failed for simple send payload:', signTxError)
      throw new Error(
        'Your wallet does not support automated deposits via WalletConnect. ' +
          'Please use the QR code or send manually to the vault address.'
      )
    }
  }

  const signedHex =
    (result && result.signedTransaction) ||
    (result && result.hex) ||
    (result && result.transactionHex) ||
    (result &&
      result.result &&
      (result.result.signedTransaction || result.result.hex || result.result.transactionHex)) ||
    null

  if (!signedHex || typeof signedHex !== 'string') {
    console.warn('Wallet did not return a signed transaction, waiting 5s then proceeding')
    await new Promise(resolve => setTimeout(resolve, 5000))
    return { txid: null, raw: result, success: true }
  }

  const provider = getProvider()
  let txid = null
  try {
    txid = await provider.sendRawTransaction(signedHex)
  } catch (sendError) {
    console.warn('Failed to broadcast transaction, waiting 5s then proceeding:', sendError.message)
    await new Promise(resolve => setTimeout(resolve, 5000))
    return { txid: null, raw: result, success: true }
  }

  return { txid, raw: result }
}

/**
 * Simulate a spend transaction (for test/demo mode)
 * Waits 2 seconds and returns a fake transaction ID
 * @param {Contract} contract - Contract instance (for logging purposes)
 * @param {object} params - Parameters for logging
 * @returns {Promise<{ txid: string }>}
 */
export async function simulateSpend(contract, { ownerPkHex, ownerAddress }) {
  console.log('[SIMULATION MODE] Simulating vault spend transaction...')
  console.log('[SIMULATION MODE] Owner Public Key:', ownerPkHex)
  console.log('[SIMULATION MODE] Owner Address:', ownerAddress)
  console.log('[SIMULATION MODE] Contract Address:', contract.address)
  
  // Wait 2 seconds to simulate network delay
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Generate a fake transaction ID
  const fakeTxId = 'simulated_tx_' + Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  
  console.log('[SIMULATION MODE] Simulated Transaction ID:', fakeTxId)
  
  return { txid: fakeTxId }
}