import { WalletPreferences } from '../models/wallet-preferences.model.js'

/**
 * Get wallet preferences
 * If preferences don't exist, creates default preferences
 */
export const getWalletPreferences = async (req, res) => {
  try {
    const walletAddress = req.walletAddress || req.headers['x-wallet-address']

    if (!walletAddress) {
      return res.status(400).json({
        message: 'Wallet address is required',
        error: 'MISSING_WALLET_ADDRESS',
      })
    }

    const preferences = await WalletPreferences.getOrCreate(walletAddress)

    res.status(200).json({
      message: 'Wallet preferences retrieved successfully',
      walletAddress: preferences.walletAddress,
      preferences: preferences.preferences,
      createdAt: preferences.createdAt,
      updatedAt: preferences.updatedAt,
    })
  } catch (error) {
    console.error('Get wallet preferences error:', error)
    res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    })
  }
}

/**
 * Update wallet preferences
 */
export const updateWalletPreferences = async (req, res) => {
  try {
    const walletAddress = req.walletAddress || req.headers['x-wallet-address']
    const { preferences } = req.body

    if (!walletAddress) {
      return res.status(400).json({
        message: 'Wallet address is required',
        error: 'MISSING_WALLET_ADDRESS',
      })
    }

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        message: 'Preferences object is required',
        error: 'MISSING_PREFERENCES',
      })
    }

    const updatedPreferences = await WalletPreferences.updatePreferences(
      walletAddress,
      preferences
    )

    res.status(200).json({
      message: 'Wallet preferences updated successfully',
      walletAddress: updatedPreferences.walletAddress,
      preferences: updatedPreferences.preferences,
      updatedAt: updatedPreferences.updatedAt,
    })
  } catch (error) {
    console.error('Update wallet preferences error:', error)
    res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    })
  }
}

/**
 * Delete wallet preferences
 */
export const deleteWalletPreferences = async (req, res) => {
  try {
    const walletAddress = req.walletAddress || req.headers['x-wallet-address']

    if (!walletAddress) {
      return res.status(400).json({
        message: 'Wallet address is required',
        error: 'MISSING_WALLET_ADDRESS',
      })
    }

    const deleted = await WalletPreferences.deleteByWalletAddress(walletAddress)

    if (!deleted) {
      return res.status(404).json({
        message: 'Wallet preferences not found',
        error: 'PREFERENCES_NOT_FOUND',
      })
    }

    res.status(200).json({
      message: 'Wallet preferences deleted successfully',
      walletAddress: deleted.walletAddress,
    })
  } catch (error) {
    console.error('Delete wallet preferences error:', error)
    res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    })
  }
}
