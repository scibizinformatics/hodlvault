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

// Network configuration - using testnet for development
const NETWORK = 'testnet3' // Bitcoin Cash testnet

let networkProvider = null

/**
 * Get or create the network provider instance
 * @returns {ElectrumNetworkProvider}
 */
function getProvider() {
  if (!networkProvider) {
    networkProvider = new ElectrumNetworkProvider(NETWORK)
  }
  return networkProvider
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
    return await contract.getBalance()
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

  const utxo = utxos[0]
  const minerFee = 1000n
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
    const transactionHex = txBuilder.build()
    const serializedSourceOutputs = serializeForWc(wcPayload.sourceOutputs)
    const result = await walletConnectRequest('bch_signTransaction', {
      transaction: transactionHex,
      sourceOutputs: serializedSourceOutputs,
      broadcast: false,
      userPrompt: 'Sign vault withdrawal',
    })
    const signedHex = result?.signedTransaction
    if (!signedHex) {
      throw new Error('Wallet did not return a signed transaction')
    }
    const txid = await provider.sendRawTransaction(signedHex)
    return { txid }
  }

  const result = await txBuilder.send()
  return result
}

/**
 * Request a standard BCH payment to the vault address using WalletConnect.
 * @param {string} toAddress - Vault contract address (CashAddr)
 * @param {number|bigint} amountSats - Amount to send in satoshis
 * @param {function} walletConnectRequest - (method, params) => Promise<any>
 * @returns {Promise<any>} WalletConnect bch_sendTransaction result
 */
export async function depositToVault(toAddress, amountSats, walletConnectRequest) {
  if (typeof walletConnectRequest !== 'function') {
    throw new Error('WalletConnect request function is required to deposit to vault')
  }

  if (!toAddress) {
    throw new Error('Vault address is required')
  }

  const value = typeof amountSats === 'bigint' ? amountSats : BigInt(amountSats)
  if (value <= 0n) {
    throw new Error('Deposit amount must be greater than zero')
  }

  const payload = serializeForWc({
    recipientCashaddress: toAddress,
    valueSatoshis: value,
    broadcast: true,
    userPrompt: 'Lock funds into HodlVault',
  })

  try {
    const result = await walletConnectRequest('bch_sendTransaction', payload)
    return result
  } catch {
    // Fallback for wallets that only implement bch_signTransaction with broadcast support
    const fallbackResult = await walletConnectRequest('bch_signTransaction', payload)
    return fallbackResult
  }
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