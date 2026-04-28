import { getAddressBalance, getAddressUtxos } from '../utils/blockchain.js'
import { logActivity } from './activity-log.service.js'

// Store expected deposits: Map<contractAddress, depositInfo>
const expectedDeposits = new Map()

/**
 * Register a deposit to watch for
 * @param {Object} depositInfo
 * @param {string} depositInfo.vaultId
 * @param {string} depositInfo.vaultName
 * @param {string} depositInfo.contractAddress
 * @param {string} depositInfo.walletAddress
 * @param {number} depositInfo.expectedAmount - Amount expecting (optional, for validation)
 */
export function watchForDeposit(depositInfo) {
  const { contractAddress } = depositInfo

  expectedDeposits.set(contractAddress, {
    ...depositInfo,
    initialBalance: 0,
    initialUtxos: [], // Store initial UTXOs to detect new ones
    startTime: Date.now(),
    expiresAt: Date.now() + 120000, // 2 minute timeout
  })

  console.log(`[DepositWatcher] Watching for deposit to ${contractAddress}`)
}

/**
 * Stop watching for a deposit
 * @param {string} contractAddress
 */
export function stopWatching(contractAddress) {
  if (expectedDeposits.has(contractAddress)) {
    expectedDeposits.delete(contractAddress)
    console.log(`[DepositWatcher] Stopped watching ${contractAddress}`)
  }
}

/**
 * Check all expected deposits
 * Called by cron job every few seconds
 */
export async function checkExpectedDeposits() {
  const now = Date.now()
  const entries = Array.from(expectedDeposits.entries())

  for (const [contractAddress, depositInfo] of entries) {
    // Skip expired
    if (now > depositInfo.expiresAt) {
      expectedDeposits.delete(contractAddress)
      console.log(`[DepositWatcher] Expired: ${contractAddress}`)
      continue
    }

    try {
      // Get current UTXOs (includes transaction IDs)
      const currentUtxos = await getAddressUtxos(contractAddress)
      const numericBalance = currentUtxos.reduce((sum, u) => sum + u.satoshis, 0)

      // First check - store initial balance and UTXOs
      if (depositInfo.initialBalance === undefined) {
        depositInfo.initialBalance = numericBalance
        depositInfo.initialUtxos = currentUtxos
        console.log(
          `[DepositWatcher] Initial balance for ${contractAddress}: ${numericBalance} (${currentUtxos.length} UTXOs)`,
        )
        continue
      }

      // Check for deposit by comparing UTXOs
      const currentUtxoSet = new Set(currentUtxos.map((u) => `${u.txid}:${u.vout}`))
      const initialUtxoSet = new Set(depositInfo.initialUtxos.map((u) => `${u.txid}:${u.vout}`))

      // Find new UTXOs (deposits)
      const newUtxos = currentUtxos.filter((u) => !initialUtxoSet.has(`${u.txid}:${u.vout}`))

      if (newUtxos.length > 0) {
        // Use the first new UTXO's txid as the deposit transaction
        // (Multiple new UTXOs could be from same tx or different txs)
        const depositTx = newUtxos[0]
        const depositAmount = newUtxos.reduce((sum, u) => sum + u.satoshis, 0)

        console.log(
          `[DepositWatcher] ✅ Deposit detected! ${contractAddress}: +${depositAmount} sats (tx: ${depositTx.txid})`,
        )

        // Log the activity with transaction hash
        await logActivity({
          walletAddress: depositInfo.walletAddress,
          activityType: 'DEPOSIT',
          vaultId: depositInfo.vaultId,
          vaultName: depositInfo.vaultName,
          contractAddress,
          details: {
            amountSatoshis: depositAmount,
            amountBCH: depositAmount / 100000000,
            newBalance: numericBalance,
            txHash: depositTx.txid, // Now we have the transaction hash!
          },
        })

        // Stop watching this address
        expectedDeposits.delete(contractAddress)
      }
    } catch (error) {
      console.error(`[DepositWatcher] Error checking ${contractAddress}:`, error.message)
    }
  }
}

/**
 * Get count of active watches (for monitoring)
 */
export function getActiveWatchCount() {
  return expectedDeposits.size
}
