import { checkExpectedDeposits, getActiveWatchCount } from './deposit-watcher.service.js'

let depositWatcherInterval = null
const CHECK_INTERVAL_MS = 5000 // Check every 5 seconds

/**
 * Start the deposit watcher cron job
 */
export function startDepositWatcherCron() {
  if (depositWatcherInterval) {
    console.log('[DepositWatcherCron] Already running')
    return
  }

  console.log(`[DepositWatcherCron] ✅ Started — checking every ${CHECK_INTERVAL_MS / 1000}s`)

  // Run immediately
  runCheck()

  // Then every interval
  depositWatcherInterval = setInterval(runCheck, CHECK_INTERVAL_MS)
}

/**
 * Stop the deposit watcher cron job
 */
export function stopDepositWatcherCron() {
  if (depositWatcherInterval) {
    clearInterval(depositWatcherInterval)
    depositWatcherInterval = null
    console.log('[DepositWatcherCron] Stopped')
  }
}

/**
 * Run a single check cycle
 */
async function runCheck() {
  try {
    const activeCount = getActiveWatchCount()
    if (activeCount > 0) {
      console.log(`[DepositWatcherCron] Checking ${activeCount} expected deposit(s)...`)
      await checkExpectedDeposits()
    }
  } catch (error) {
    console.error('[DepositWatcherCron] Error during check:', error.message)
  }
}
