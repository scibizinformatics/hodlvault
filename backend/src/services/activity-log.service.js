import { ActivityLog } from '../models/activity-log.model.js'
import { sendEvent } from './sse.service.js'

export async function logActivity(data) {
  try {
    // Prevent duplicate logs
    if (data.vaultId && data.activityType) {
      let existingLog = null

      // For withdrawals: check by txHash
      if (data.details?.txHash) {
        existingLog = await ActivityLog.findOne({
          vaultId: data.vaultId,
          activityType: data.activityType,
          'details.txHash': data.details.txHash,
        })
      }
      // For deposits (no txHash): check for recent duplicate within 10 seconds
      else if (data.activityType === 'DEPOSIT' && data.details?.amountSatoshis) {
        const tenSecondsAgo = new Date(Date.now() - 10000)
        existingLog = await ActivityLog.findOne({
          vaultId: data.vaultId,
          activityType: 'DEPOSIT',
          'details.amountSatoshis': data.details.amountSatoshis,
          timestamp: { $gte: tenSecondsAgo },
        })
      }
      // For vault deletions: check for recent duplicate within 10 seconds
      else if (data.activityType === 'VAULT_DELETED') {
        const tenSecondsAgo = new Date(Date.now() - 10000)
        existingLog = await ActivityLog.findOne({
          vaultId: data.vaultId,
          activityType: 'VAULT_DELETED',
          timestamp: { $gte: tenSecondsAgo },
        })
      }

      if (existingLog) {
        console.log(
          `⚠️ Duplicate activity log skipped: ${data.activityType} for vault ${data.vaultId}`,
        )
        return existingLog
      }
    }

    const log = new ActivityLog({
      walletAddress: data.walletAddress.toLowerCase(),
      activityType: data.activityType,
      vaultId: data.vaultId,
      vaultName: data.vaultName,
      contractAddress: data.contractAddress,
      details: data.details,
      status: data.status || 'SUCCESS',
      timestamp: data.timestamp || new Date(),
    })

    await log.save()
    console.log(`✅ Activity logged: ${data.activityType} for ${data.walletAddress}`)

    // Emit real-time event to connected clients
    sendEvent(data.walletAddress, {
      type: 'NEW_ACTIVITY',
      activity: {
        _id: log._id,
        activityType: data.activityType,
        vaultId: data.vaultId,
        vaultName: data.vaultName,
        contractAddress: data.contractAddress,
        details: data.details,
        timestamp: log.timestamp,
      },
    })

    // Emit specific deposit confirmation event
    if (data.activityType === 'DEPOSIT') {
      sendEvent(data.walletAddress, {
        type: 'DEPOSIT_CONFIRMED',
        vaultId: data.vaultId,
        contractAddress: data.contractAddress,
        amountSatoshis: data.details?.amountSatoshis,
        newBalance: data.details?.newBalance,
        timestamp: log.timestamp,
      })
    }

    return log
  } catch (error) {
    console.error('❌ Failed to log activity:', error.message, error.errors || error.stack || '')
    return null
  }
}

export async function getActivityHistory(walletAddress, options = {}) {
  const { limit = 50, skip = 0, activityType } = options

  const query = { walletAddress: walletAddress.toLowerCase() }
  if (activityType) query.activityType = activityType

  const logs = await ActivityLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean()

  const total = await ActivityLog.countDocuments(query)

  return { logs, total }
}

export async function getActivityStats(walletAddress) {
  const stats = await ActivityLog.aggregate([
    { $match: { walletAddress: walletAddress.toLowerCase() } },
    {
      $group: {
        _id: '$activityType',
        count: { $sum: 1 },
        totalAmount: { $sum: '$details.amountSatoshis' },
      },
    },
  ])

  return stats
}
