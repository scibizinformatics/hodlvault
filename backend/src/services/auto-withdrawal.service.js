/**
 * Auto-Withdrawal Service (Backend)
 * Monitors oracle prices and automatically executes covenant withdrawal
 * transactions when a vault's price target is reached.
 *
 * Key insight: The HodlVault contract's spend() function only requires
 * oracle data (message + signature) — no owner signature needed.
 * The covenant enforces that funds go to ownerPkh (hardcoded in contract).
 * This means the server can withdraw without any private keys.
 */

import { Contract, ElectrumNetworkProvider } from 'cashscript'
import { hexToBin } from '@bitauth/libauth'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { Vault } from '../models/vault.model.js'
import { fetchOraclePrice } from './oracle.service.js'
import { logActivity } from './activity-log.service.js'
import { sendEvent } from './sse.service.js'

// Load contract artifact using fs (Node.js 20 compatible)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const HodlVaultArtifact = JSON.parse(
  readFileSync(join(__dirname, '../contract/HodlVault.json'), 'utf-8'),
)

// Network configuration from env
const BCH_NETWORK = process.env.BCH_NETWORK || 'chipnet'

// Miner fee for withdrawal transaction (matches contract constant)
const MINER_FEE = 1000

/**
 * Get the Electrum provider for the configured network
 */
function getProvider() {
  return new ElectrumNetworkProvider(BCH_NETWORK)
}

/**
 * Initialize a CashScript contract instance from vault data
 * @param {Object} vault - MongoDB vault document
 * @returns {Contract} CashScript contract instance
 */
function initializeContract(vault) {
  const provider = getProvider()

  const ownerPkh = hexToBin(vault.ownerPkhHex)
  const oraclePk = hexToBin(vault.oraclePkHex)
  // CashScript expects BigInt for int parameters
  const priceTargetBigInt = BigInt(vault.priceTargetCents)

  const constructorArgs = [ownerPkh, oraclePk, priceTargetBigInt]

  const contract = new Contract(HodlVaultArtifact, constructorArgs, {
    provider,
    addressType: 'p2sh20',
  })

  return contract
}

/**
 * Execute an automatic withdrawal for a single vault
 * @param {Object} vault - MongoDB vault document
 * @param {Object} oracleData - { messageHex, signatureHex, priceInCents }
 * @returns {Promise<{ success: boolean, txHex?: string, error?: string }>}
 */
async function executeAutoWithdrawal(vault, oracleData) {
  try {
    console.log(
      `[AutoWithdraw] Processing vault: ${vault.name || vault.contractAddress} (target: ${vault.priceTargetCents} cents, oracle: ${oracleData.priceInCents} cents)`,
    )

    // Initialize the contract from vault parameters
    const contract = initializeContract(vault)

    // Verify the contract address matches what's stored
    console.log(
      `[AutoWithdraw] Contract address: ${contract.address} (stored: ${vault.contractAddress})`,
    )

    // Get UTXOs from the blockchain
    const utxos = await contract.getUtxos()

    if (!utxos || utxos.length === 0) {
      console.warn(
        `[AutoWithdraw] No UTXOs found for vault ${vault.contractAddress} — may have already been withdrawn`,
      )
      return { success: false, error: 'No UTXOs found — vault may already be empty' }
    }

    console.log(`[AutoWithdraw] Found ${utxos.length} UTXO(s) for vault ${vault.contractAddress}`)

    // Calculate total balance from ALL UTXOs (supports multiple deposits)
    const totalSatoshis = utxos.reduce((sum, u) => sum + BigInt(u.satoshis), 0n)
    const minerFee = BigInt(MINER_FEE)

    // Validate total balance covers the fee
    if (totalSatoshis <= minerFee) {
      console.warn(
        `[AutoWithdraw] Total balance too low (${totalSatoshis} sats) for vault ${vault.contractAddress}`,
      )
      return { success: false, error: `Balance too low: ${totalSatoshis} sats` }
    }

    const amount = totalSatoshis - minerFee

    // The owner address to send funds to (from originalFundingAddress)
    const ownerAddress = vault.originalFundingAddress

    if (!ownerAddress) {
      return { success: false, error: 'No owner address found for vault' }
    }

    // Build and broadcast the withdrawal transaction
    // Combine ALL UTXOs (multiple deposits) into a single transaction
    const oracleMessageBin = hexToBin(oracleData.messageHex)
    const oracleSigBin = hexToBin(oracleData.signatureHex)

    const txHex = await contract.functions
      .spend(oracleMessageBin, oracleSigBin)
      .from(utxos) // Use all UTXOs as inputs (combines multiple deposits)
      .to([{ to: ownerAddress, amount: amount }])
      .withHardcodedFee(minerFee)
      .send()

    // txHex is actually a transaction object from CashScript
    const txid = txHex.txid || txHex
    const txHexString = txHex.hex || txHex

    console.log(
      `[AutoWithdraw] ✅ Withdrawal successful for vault ${vault.contractAddress}! TX: ${txid}`,
    )

    return {
      success: true,
      txid,
      txHex: txHexString,
      amountSatoshis: Number(amount),
    }
  } catch (error) {
    console.error(
      `[AutoWithdraw] ❌ Withdrawal failed for vault ${vault.contractAddress}:`,
      error.message,
    )
    return {
      success: false,
      error: error.message || 'Unknown withdrawal error',
    }
  }
}

/**
 * Main check-and-withdraw cycle.
 * Called by the cron scheduler every 2 minutes.
 *
 * 1. Fetch current oracle price + signature
 * 2. Find all vaults where autoWithdrawal=true, status=active, balance>0,
 *    and priceTargetCents <= current oracle price
 * 3. Execute withdrawal for each eligible vault
 * 4. Mark vaults as withdrawn and log activity
 */
export async function checkAndWithdraw() {
  console.log('[AutoWithdraw] Starting check cycle...')

  try {
    // Step 1: Get oracle price
    const oracleData = await fetchOraclePrice()
    const { priceInCents } = oracleData

    console.log(
      `[AutoWithdraw] Current oracle price: ${priceInCents} cents ($${(priceInCents / 100).toFixed(2)})`,
    )

    // Step 2: Find eligible vaults
    const eligibleVaults = await Vault.find({
      autoWithdrawal: true,
      status: 'active',
      balance: { $gt: 0 },
      priceTargetCents: { $lte: priceInCents },
    })

    if (eligibleVaults.length === 0) {
      console.log('[AutoWithdraw] No eligible vaults found this cycle')
      return { processed: 0, withdrawn: 0, failed: 0 }
    }

    console.log(`[AutoWithdraw] Found ${eligibleVaults.length} eligible vault(s)`)

    // Step 3: Process each vault
    let withdrawn = 0
    let failed = 0

    for (const vault of eligibleVaults) {
      const result = await executeAutoWithdrawal(vault, oracleData)

      if (result.success) {
        // Mark vault as withdrawn
        vault.status = 'withdrawn'
        vault.balance = 0
        await vault.save({ validateBeforeSave: false })

        // Log the withdrawal activity
        try {
          await logActivity({
            walletAddress: vault.walletAddress,
            activityType: 'WITHDRAWAL',
            vaultId: vault._id,
            vaultName: vault.name || 'Unnamed Vault',
            contractAddress: vault.contractAddress,
            details: {
              amountSatoshis: result.amountSatoshis,
              txHash: result.txid,
              autoWithdrawal: true,
            },
          })
        } catch (logError) {
          console.warn('[AutoWithdraw] Failed to log activity:', logError.message)
        }

        // Auto-delete vault after successful withdrawal (same as manual withdrawal)
        try {
          await logActivity({
            walletAddress: vault.walletAddress,
            activityType: 'VAULT_DELETED',
            vaultId: vault._id,
            vaultName: vault.name || 'Unnamed Vault',
            contractAddress: vault.contractAddress,
            details: {
              reason: 'Auto-deleted after successful withdrawal',
              autoWithdrawal: true,
            },
          })
          await Vault.findByIdAndDelete(vault._id)
          console.log(
            `[AutoWithdraw] ✅ Vault ${vault.contractAddress} auto-deleted after withdrawal`,
          )
        } catch (deleteError) {
          console.warn('[AutoWithdraw] Failed to auto-delete vault:', deleteError.message)
        }

        // Notify client in real-time via SSE
        sendEvent(vault.walletAddress, {
          type: 'VAULT_WITHDRAWN',
          vaultId: vault._id,
          contractAddress: vault.contractAddress,
          amountSatoshis: result.amountSatoshis,
          txHash: result.txid,
          timestamp: new Date().toISOString(),
        })

        withdrawn++
      } else {
        console.warn(`[AutoWithdraw] Skipping vault ${vault.contractAddress}: ${result.error}`)
        failed++
      }
    }

    console.log(
      `[AutoWithdraw] Cycle complete: ${withdrawn} withdrawn, ${failed} failed, ${eligibleVaults.length} total`,
    )

    return {
      processed: eligibleVaults.length,
      withdrawn,
      failed,
    }
  } catch (error) {
    console.error('[AutoWithdraw] Check cycle failed:', error.message)
    return { processed: 0, withdrawn: 0, failed: 0, error: error.message }
  }
}
