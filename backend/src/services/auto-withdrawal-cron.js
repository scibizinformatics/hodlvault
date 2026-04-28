/**
 * Auto-Withdrawal Cron Scheduler
 * Runs the auto-withdrawal check every 30 seconds using node-cron.
 * Includes a lock mechanism to prevent overlapping runs.
 */

import cron from 'node-cron'
import { checkAndWithdraw } from './auto-withdrawal.service.js'

let isRunning = false
let cronJob = null

/**
 * Run the auto-withdrawal check with overlap prevention
 */
async function runCheck() {
  if (isRunning) {
    console.log('[AutoWithdrawCron] Previous run still in progress, skipping')
    return
  }

  isRunning = true
  try {
    await checkAndWithdraw()
  } catch (error) {
    console.error('[AutoWithdrawCron] Unexpected error:', error.message)
  } finally {
    isRunning = false
  }
}

/**
 * Start the cron scheduler
 * Runs every 30 seconds using cron expression (asterisk-slash-30-space-asterisk-space-etc)
 */
export function startAutoWithdrawalCron() {
  if (cronJob) {
    console.log('[AutoWithdrawCron] Already running')
    return
  }

  // Every 30 seconds
  cronJob = cron.schedule('*/30 * * * * *', runCheck, {
    scheduled: true,
    timezone: 'UTC',
  })

  console.log('[AutoWithdrawCron] ✅ Started — checking every 30 seconds')

  // Run an initial check immediately on startup
  console.log('[AutoWithdrawCron] Running initial check...')
  runCheck()
}

/**
 * Stop the cron scheduler
 */
export function stopAutoWithdrawalCron() {
  if (cronJob) {
    cronJob.stop()
    cronJob = null
    console.log('[AutoWithdrawCron] Stopped')
  }
}
