import {
  getActivityHistory,
  getActivityStats,
  logActivity,
} from '../services/activity-log.service.js'

export const getMyActivityHistory = async (req, res) => {
  try {
    const walletAddress = req.walletAddress
    const { limit, skip, activityType } = req.query

    if (!walletAddress) {
      return res.status(400).json({ message: 'Wallet address required' })
    }

    const { logs, total } = await getActivityHistory(walletAddress, {
      limit: parseInt(limit) || 50,
      skip: parseInt(skip) || 0,
      activityType,
    })

    res.status(200).json({
      success: true,
      logs,
      total,
      hasMore: total > (parseInt(skip) || 0) + logs.length,
    })
  } catch (error) {
    console.error('Get activity history error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity history',
    })
  }
}

export const getMyActivityStats = async (req, res) => {
  try {
    const walletAddress = req.walletAddress

    if (!walletAddress) {
      return res.status(400).json({ message: 'Wallet address required' })
    }

    const stats = await getActivityStats(walletAddress)

    res.status(200).json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error('Get activity stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity stats',
    })
  }
}

export const logWithdrawalActivity = async (req, res) => {
  try {
    const walletAddress = req.walletAddress
    const { vaultId, vaultName, contractAddress, amountSatoshis, txHash } = req.body

    if (!walletAddress) {
      return res.status(400).json({ message: 'Wallet address required' })
    }

    const log = await logActivity({
      walletAddress,
      activityType: 'WITHDRAWAL',
      vaultId,
      vaultName,
      contractAddress,
      details: {
        amountSatoshis,
        amountBCH: amountSatoshis ? amountSatoshis / 100000000 : null,
        txHash,
      },
    })

    if (!log) {
      return res.status(500).json({ success: false, message: 'Failed to log activity' })
    }

    res.status(200).json({ success: true, log })
  } catch (error) {
    console.error('Log withdrawal activity error:', error)
    res.status(500).json({ success: false, message: 'Failed to log withdrawal' })
  }
}

export const logDepositActivity = async (req, res) => {
  try {
    const walletAddress = req.walletAddress
    const { vaultId, vaultName, contractAddress, amountSatoshis, txHash } = req.body

    if (!walletAddress) {
      return res.status(400).json({ message: 'Wallet address required' })
    }

    const log = await logActivity({
      walletAddress,
      activityType: 'DEPOSIT',
      vaultId,
      vaultName,
      contractAddress,
      details: {
        amountSatoshis,
        amountBCH: amountSatoshis ? amountSatoshis / 100000000 : null,
        txHash,
      },
    })

    if (!log) {
      return res.status(500).json({ success: false, message: 'Failed to log activity' })
    }

    res.status(200).json({ success: true, log })
  } catch (error) {
    console.error('Log deposit activity error:', error)
    res.status(500).json({ success: false, message: 'Failed to log deposit' })
  }
}
