import { watchForDeposit, stopWatching, getActiveWatchCount } from '../services/deposit-watcher.service.js'

/**
 * Start watching for a deposit
 */
export const startWatchingDeposit = async (req, res) => {
  try {
    const walletAddress = req.walletAddress
    const { vaultId, vaultName, contractAddress, expectedAmount } = req.body

    if (!walletAddress) {
      return res.status(400).json({ success: false, message: 'Wallet address required' })
    }

    if (!contractAddress) {
      return res.status(400).json({ success: false, message: 'Contract address required' })
    }

    watchForDeposit({
      vaultId,
      vaultName,
      contractAddress,
      walletAddress,
      expectedAmount,
    })

    res.status(200).json({
      success: true,
      message: `Watching for deposit to ${contractAddress}`,
      activeWatches: getActiveWatchCount(),
    })
  } catch (error) {
    console.error('[DepositWatch] Start error:', error.message)
    res.status(500).json({ success: false, message: 'Failed to start watching', error: error.message })
  }
}

/**
 * Stop watching for a deposit
 */
export const stopWatchingDeposit = async (req, res) => {
  try {
    const { contractAddress } = req.params

    stopWatching(contractAddress)

    res.status(200).json({
      success: true,
      message: `Stopped watching ${contractAddress}`,
      activeWatches: getActiveWatchCount(),
    })
  } catch (error) {
    console.error('[DepositWatch] Stop error:', error.message)
    res.status(500).json({ success: false, message: 'Failed to stop watching', error: error.message })
  }
}
