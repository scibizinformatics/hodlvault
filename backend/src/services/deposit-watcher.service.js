import { getAddressBalance } from '../utils/blockchain.js'
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
      const currentBalance = await getAddressBalance(contractAddress)
      const numericBalance = Number(currentBalance)

      // First check - store initial balance
      if (depositInfo.initialBalance === undefined) {
        depositInfo.initialBalance = numericBalance
        console.log(`[DepositWatcher] Initial balance for ${contractAddress}: ${numericBalance}`)
        continue
      }

      // Check for deposit
      if (numericBalance > depositInfo.initialBalance) {
        const depositAmount = numericBalance - depositInfo.initialBalance

        console.log(
          `[DepositWatcher] ✅ Deposit detected! ${contractAddress}: +${depositAmount} sats`,
        )

        // Log the activity
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
            txHash: null,
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
