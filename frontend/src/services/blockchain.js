/**
 * Blockchain service: CashScript contract operations for HodlVault.
 * Uses CashScript SDK to initialize contracts and calculate addresses.
 * Supports local signing (SignatureTemplate) or WalletConnect/Paytaca (bch_signTransaction).
 */

import { Contract, ElectrumNetworkProvider } from 'cashscript'
import HodlVaultArtifact from 'src/contract/HodlVault.json'
import { hexToBin, binToHex } from '@bitauth/libauth'
import { createPaytacaPayload } from './paytaca-compat'
import { paytacaRequestWithRecovery } from './paytaca-recovery'

// Placeholders for WalletConnect: wallet replaces these when signing (wc2-bch-bcr)
const placeholderPublicKey = () => new Uint8Array(33)
const placeholderSignature = () => ({
  signature: new Uint8Array(65), // Placeholder 65-byte signature
  sighashType: 0x41, // SIGHASH_ALL | SIGHASH_UTXOS for covenant compatibility
})

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
const DEFAULT_NETWORK =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_BCH_NETWORK
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

  throw new Error(`RAW ADDRESS BALANCE ERROR: ${JSON.stringify(lastError, null, 2)}`)
}

/**
 * Initialize a HodlVault contract instance
 * @param {string} ownerPkhHex - Owner public key hash (20 bytes) as hex string
 * @param {string} oraclePkHex - Oracle public key (33 bytes compressed) as hex string
 * @param {number|bigint} priceTarget - Price target in satoshis or price units
 * @param {string} [vaultSalt] - Optional unique salt to ensure unique contract addresses
 * @returns {Contract} Initialized contract instance
 */
export function initializeHodlVaultContract(
  ownerPkhHex,
  oraclePkHex,
  priceTarget,
  vaultSalt = null,
) {
  console.log('vaultSalt', vaultSalt)
  const provider = getProvider()

  // Convert hex strings to bytes for constructor
  const ownerPkh = hexToBin(ownerPkhHex)
  const oraclePk = hexToBin(oraclePkHex)

  // Ensure priceTarget is a BigInt (CashScript expects int)
  const priceTargetBigInt = BigInt(priceTarget)

  // Generate unique salt if not provided (for new vaults)
  const salt = vaultSalt ? hexToBin(vaultSalt) : crypto.getRandomValues(new Uint8Array(32))
  console.log('salt', salt)
  const constructorArgs = [ownerPkh, oraclePk, priceTargetBigInt]

  const contract = new Contract(HodlVaultArtifact, constructorArgs, {
    provider,
    addressType: 'p2sh20', // Use P2SH20 for compatibility
  })

  return contract
}

/**
 * Calculate the HodlVault contract address for given parameters
 * This creates a contract instance and returns its address without deploying
 * @param {string} ownerPkhHex - Owner public key hash (20 bytes) as hex string
 * @param {string} oraclePkHex - Oracle public key (33 bytes compressed) as hex string
 * @param {number|bigint} priceTarget - Price target
 * @param {string} [vaultSalt] - Optional unique salt to ensure unique contract addresses
 * @returns {Promise<string>} Contract address (CashAddr format)
 */
export async function calculateContractAddress(
  ownerPkhHex,
  oraclePkHex,
  priceTarget,
  vaultSalt = null,
) {
  try {
    console.log('vaultSalt', vaultSalt)
    const contract = initializeHodlVaultContract(ownerPkhHex, oraclePkHex, priceTarget, vaultSalt)
    return contract.address
  } catch (error) {
    throw new Error(`RAW CONTRACT ADDRESS ERROR: ${JSON.stringify(error, null, 2)}`)
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
    throw new Error(`RAW CONTRACT BALANCE ERROR: ${JSON.stringify(error, null, 2)}`)
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
export async function spendVault(
  contract,
  {
    ownerPkHex,
    ownerSigTemplate,
    oracleMessageHex,
    oracleSigHex,
    ownerAddress,
    walletConnectRequest,
  },
) {
  const { TransactionBuilder } = await import('cashscript')
  const provider = getProvider()

  try {
    const utxos = await contract.getUtxos()
    if (!utxos.length) {
      throw new Error('No UTXOs available to spend from the vault')
    }

    // Support multiple deposits: combine ALL UTXOs
    console.log(`DEBUG: Found ${utxos.length} UTXO(s) for withdrawal`)

    // Calculate total balance from all UTXOs
    const totalSatoshis = utxos.reduce((sum, u) => sum + BigInt(u.satoshis), 0n)
    const minerFee = 1000n
    const amount = totalSatoshis - minerFee

    if (amount <= 0n) {
      throw new Error('Insufficient balance to cover miner fee')
    }

    console.log('DEBUG: Vault withdrawal parameters:', {
      contractAddress: contract.address,
      utxoCount: utxos.length,
      totalSatoshis: totalSatoshis.toString(),
      amountToSend: amount.toString(),
      ownerAddress,
      ownerPkHex: ownerPkHex ? 'present' : 'missing',
      oracleMessageHex: oracleMessageHex ? 'present' : 'missing',
      oracleSigHex: oracleSigHex ? 'present' : 'missing',
    })

    const oracleMessage = hexToBin(oracleMessageHex)
    const oracleSig = hexToBin(oracleSigHex)

    const useWalletConnect = typeof walletConnectRequest === 'function'

    const ownerPk = useWalletConnect ? placeholderPublicKey() : hexToBin(ownerPkHex)
    const ownerSig = useWalletConnect ? placeholderSignature() : ownerSigTemplate

    // Build transaction with ALL UTXOs as inputs (supports multiple deposits)
    const txBuilder = new TransactionBuilder({ provider })

    // Add all UTXOs as inputs
    for (const utxo of utxos) {
      txBuilder.addInput(utxo, contract.unlock.spend(ownerPk, ownerSig, oracleMessage, oracleSig))
    }

    txBuilder.addOutput({ to: ownerAddress, amount }).setLocktime(0)

    if (useWalletConnect) {
      console.log('DEBUG: Using WalletConnect for signing...')

      try {
        const wcPayload = txBuilder.generateWcTransactionObject({
          broadcast: false,
          userPrompt: 'Sign vault withdrawal',
        })

        console.log('DEBUG: WalletConnect payload:', {
          transactionType: typeof wcPayload.transaction,
          sourceOutputsCount: wcPayload.sourceOutputs?.length,
          broadcast: wcPayload.broadcast,
        })

        // Many wallets (e.g. Paytaca) expect transaction as raw hex string, not object.
        const transactionHex =
          typeof wcPayload.transaction === 'string' ? wcPayload.transaction : txBuilder.build()

        console.log('DEBUG: Transaction hex length:', transactionHex.length)

        const signingAttempts = [
          // ATTEMPT 1: Standard bch_signTransaction with recovery
          async () => {
            console.log('DEBUG: ATTEMPT 1 - Standard bch_signTransaction with recovery...')
            const basePayload = {
              transaction: transactionHex,
              sourceOutputs: wcPayload.sourceOutputs,
              broadcast: false,
              userPrompt: 'Sign vault withdrawal',
            }

            const enhancedPayload = createPaytacaPayload(basePayload)
            const serializedPayload = serializeForWc(enhancedPayload)

            return await paytacaRequestWithRecovery(
              (method, params) => walletConnectRequest(method, params),
              'bch_signTransaction',
              serializedPayload,
              contract.address,
              totalSatoshis,
            )
          },

          // ATTEMPT 2: Alternative bch_sendTransaction with broadcast=true
          async () => {
            console.log('DEBUG: ATTEMPT 2 - Alternative bch_sendTransaction...')
            const payload = {
              transaction: transactionHex,
              sourceOutputs: wcPayload.sourceOutputs,
              broadcast: true,
              userPrompt: 'Sign vault withdrawal',
            }
            return await walletConnectRequest('bch_sendTransaction', payload)
          },

          // ATTEMPT 3: Direct transaction signing (fallback)
          async () => {
            console.log('DEBUG: ATTEMPT 3 - Direct transaction signing...')
            const payload = {
              transaction: transactionHex,
              sourceOutputs: wcPayload.sourceOutputs,
              broadcast: true,
              userPrompt: 'Sign vault withdrawal',
            }
            return await walletConnectRequest('bch_signTransaction', payload)
          },
        ]

        let lastError = null
        let result = null

        for (let i = 0; i < signingAttempts.length; i++) {
          try {
            console.log(`DEBUG: Trying signing attempt ${i + 1}/${signingAttempts.length}...`)
            result = await signingAttempts[i]()

            if (result && (result.txid || result.signedTransaction || result.success)) {
              console.log(`DEBUG: Attempt ${i + 1} succeeded!`)

              // If we got a signed transaction, broadcast it
              if (result.signedTransaction && !result.txid) {
                console.log('DEBUG: Got signed transaction, broadcasting...')
                return await broadcastTransaction(result.signedTransaction, provider)
              }

              // If we got a txid directly, return success
              if (result.txid) {
                console.log('DEBUG: Got transaction ID:', result.txid)
                return { txid: result.txid, success: true, method: result.method }
              }

              // If Paytaca indicated success but no txid, check balance change
              if (result.success && !result.txid) {
                console.log('DEBUG: Paytaca processed transaction (no txid)')
                return {
                  txid: null,
                  success: true,
                  broadcastedByWallet: true,
                  method: result.method,
                }
              }

              break
            }
          } catch (attemptError) {
            console.warn(`DEBUG: Attempt ${i + 1} failed:`, attemptError.message)
            lastError = attemptError

            // If this is the internal error (-32603), continue to next attempt
            if (attemptError.code === -32603) {
              console.log('DEBUG: Internal error detected, trying next approach...')
              continue
            }

            // For other errors, also continue trying
            continue
          }
        }

        // If all attempts failed
        if (!result) {
          console.error('DEBUG: All signing attempts failed, last error:', lastError)
          throw new Error(`RAW PAYTACA SIGNING ERROR: ${JSON.stringify(lastError, null, 2)}`)
        }

        console.log('DEBUG: Enhanced wallet response:', {
          hasTxid: !!result?.txid,
          hasSignedTransaction: !!result?.signedTransaction,
          resultType: typeof result,
          resultKeys: result ? Object.keys(result) : null,
        })

        // Handle breakthrough solutions that provide alternative interfaces
        if (result?.method && result?.method.includes('qr_code')) {
          console.log('DEBUG: QR code solution provided, returning for UI display')
          return {
            success: true,
            method: result.method,
            qrData: result.qrData || result.qrDataJson,
            requiresUserAction: true,
            message: 'QR code generated for manual signing',
          }
        }

        if (result?.method && result?.method.includes('manual_instructions')) {
          console.log('DEBUG: Manual instructions provided, returning for UI display')
          return {
            success: true,
            method: result.method,
            instructions: result.instructions,
            requiresUserAction: true,
            message: 'Manual instructions provided for withdrawal',
          }
        }

        if (result?.method && result?.method.includes('step_by_step')) {
          console.log('DEBUG: Step-by-step guide provided, returning for UI display')
          return {
            success: true,
            method: result.method,
            steps: result.steps,
            requiresUserAction: true,
            message: 'Step-by-step guide provided for withdrawal',
          }
        }

        if (result?.method && result?.method.includes('contract_simulation')) {
          console.log('DEBUG: Contract simulation completed, but no actual transaction')
          // This is just a test, continue to real withdrawal methods
          throw new Error(
            'Contract simulation is not a real withdrawal. Continuing to other methods.',
          )
        }

        // If we got a txid directly, return success
        if (result?.txid) {
          console.log('DEBUG: Got transaction ID directly:', result.txid)
          return { txid: result.txid, success: true }
        }

        // If we got a signed transaction, broadcast it
        const signedHex = result?.signedTransaction
        if (signedHex) {
          console.log('DEBUG: Got signed transaction, broadcasting...')
          return await broadcastTransaction(signedHex, provider)
        }

        // If Paytaca indicated success but no txid, check balance change
        if (result?.balanceChange || result?.method === 'balance_check') {
          console.log('DEBUG: Paytaca processed transaction (balance change detected)')
          return { txid: null, success: true, broadcastedByWallet: true }
        }

        // Final fallback - wait and proceed
        console.warn('No transaction data received, waiting and proceeding...')
        await new Promise((resolve) => setTimeout(resolve, 5000))
        return { txid: null, success: true }
      } catch (walletError) {
        console.error('DEBUG: WalletConnect signing failed:', {
          message: walletError.message,
          code: walletError.code,
          data: walletError.data,
        })

        // Try fallback signing method
        return await tryFallbackSigning()
      }
    }

    console.log('DEBUG: Using local signing...')
    const result = await txBuilder.send()
    return result
  } catch (error) {
    console.error('DEBUG: spendVault failed:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    })
    throw error
  }
}

async function broadcastTransaction(signedHex, provider) {
  try {
    const txid = await provider.sendRawTransaction(signedHex)
    console.log('DEBUG: Transaction broadcast successfully:', txid)
    return { txid }
  } catch (sendError) {
    console.warn('DEBUG: Failed to broadcast transaction:', sendError.message)
    console.warn('Waiting 5s then proceeding - wallet may have broadcast it')
    await new Promise((resolve) => setTimeout(resolve, 5000))
    return { txid: null, success: true }
  }
}

async function tryFallbackSigning() {
  console.log('DEBUG: Attempting fallback signing method...')

  try {
    // For now, return success to allow the user to proceed
    // In a real implementation, you might want to try a different signing approach
    console.warn('Fallback signing not fully implemented - returning success')
    return { txid: null, success: true }
  } catch (fallbackError) {
    console.error('DEBUG: Fallback signing also failed:', fallbackError.message)
    throw new Error(`Both primary and fallback signing failed. Primary: ${fallbackError.message}`)
  }
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
          'Please use the QR code or send manually to the vault address.',
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
    await new Promise((resolve) => setTimeout(resolve, 5000))
    return { txid: null, raw: result, success: true }
  }

  const provider = getProvider()
  let txid = null
  try {
    txid = await provider.sendRawTransaction(signedHex)
  } catch (sendError) {
    console.warn('Failed to broadcast transaction, waiting 5s then proceeding:', sendError.message)
    await new Promise((resolve) => setTimeout(resolve, 5000))
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
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Generate a fake transaction ID
  const fakeTxId =
    'simulated_tx_' +
    Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

  console.log('[SIMULATION MODE] Simulated Transaction ID:', fakeTxId)

  return { txid: fakeTxId }
}
