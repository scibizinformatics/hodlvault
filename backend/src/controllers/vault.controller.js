import { Vault } from '../models/vault.model.js'
import mongoose from 'mongoose'

/**
 * Create a new vault
 */
export const createVault = async (req, res) => {
  try {
    const {
      walletAddress,
      contractAddress,
      priceTarget,
      balance,
      ownerPkhHex,
      oraclePkHex,
      originalFundingAddress,
      vaultSalt,
      name,
    } = req.body

    // Validate required fields
    const requiredFields = [
      'walletAddress',
      'contractAddress',
      'priceTarget',
      'ownerPkhHex',
      'oraclePkHex',
      'originalFundingAddress',
      'vaultSalt',
    ]

    const missingFields = requiredFields.filter((field) => !req.body[field])
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: 'Missing required fields',
        missingFields,
      })
    }

    // Check if vault with same contract address already exists
    const existingVault = await Vault.findOne({ contractAddress: contractAddress.toLowerCase() })
    if (existingVault) {
      return res.status(400).json({
        message: 'Vault with this contract address already exists',
        existingVaultId: existingVault._id,
      })
    }

    // Check for duplicate vault parameters (same wallet and price target)
    const duplicateVault = await Vault.checkDuplicate(walletAddress, priceTarget)

    if (duplicateVault) {
      return res.status(400).json({
        message: 'Vault with similar parameters already exists',
        duplicateVaultId: duplicateVault._id,
      })
    }

    // Create new vault
    const vault = new Vault({
      walletAddress: walletAddress.toLowerCase(),
      contractAddress: contractAddress.toLowerCase(),
      priceTarget: Number(priceTarget),
      balance: Number(balance) || 0,
      ownerPkhHex,
      oraclePkHex,
      originalFundingAddress,
      vaultSalt,
      name: name || '',
    })

    await vault.save()

    res.status(201).json({
      message: 'Vault created successfully',
      vault: {
        ...vault.toJSON(),
        balanceBCH: vault.balanceBCH,
        hasFunds: vault.hasFunds,
      },
    })
  } catch (error) {
    console.error('Create vault error:', error)
    res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    })
  }
}

/**
 * Get all vaults for a wallet address
 */
export const getVaultsByWalletAuth = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query
    const walletAddress = req.walletAddress || req.body.walletAddress

    if (!walletAddress) {
      return res.status(400).json({
        message: 'Wallet address is required',
      })
    }

    // Build filter
    const filter = { walletAddress: walletAddress.toLowerCase() }
    if (status) {
      filter.status = status
    }

    // Pagination
    const skip = (page - 1) * limit

    const vaults = await Vault.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total = await Vault.countDocuments(filter)

    res.status(200).json({
      message: 'Vaults retrieved successfully',
      vaults: vaults.map((vault) => ({
        ...vault.toJSON(),
        balanceBCH: vault.balanceBCH,
        hasFunds: vault.hasFunds,
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalVaults: total,
        hasMore: skip + vaults.length < total,
      },
    })
  } catch (error) {
    console.error('Get user vaults error:', error)
    res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    })
  }
}

/**
 * Get a specific vault by ID
 */
export const getVaultById = async (req, res) => {
  try {
    const { id } = req.params
    const walletAddress = req.walletAddress || req.body.walletAddress

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid vault ID',
      })
    }

    if (!walletAddress) {
      return res.status(400).json({
        message: 'Wallet address is required',
      })
    }

    const vault = await Vault.findOne({ _id: id, walletAddress: walletAddress.toLowerCase() })

    if (!vault) {
      return res.status(404).json({
        message: 'Vault not found',
      })
    }

    res.status(200).json({
      message: 'Vault retrieved successfully',
      vault: {
        ...vault.toJSON(),
        balanceBCH: vault.balanceBCH,
        hasFunds: vault.hasFunds,
      },
    })
  } catch (error) {
    console.error('Get vault by ID error:', error)
    res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    })
  }
}

/**
 * Update a vault
 */
export const updateVault = async (req, res) => {
  try {
    const { id } = req.params
    const { name, status } = req.body
    const walletAddress = req.walletAddress || req.body.walletAddress

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid vault ID',
      })
    }

    if (!walletAddress) {
      return res.status(400).json({
        message: 'Wallet address is required',
      })
    }

    const vault = await Vault.findOne({ _id: id, walletAddress: walletAddress.toLowerCase() })

    if (!vault) {
      return res.status(404).json({
        message: 'Vault not found',
      })
    }

    // Update allowed fields
    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (status !== undefined && ['active', 'withdrawn', 'expired'].includes(status)) {
      updateData.status = status
    }

    const updatedVault = await Vault.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })

    res.status(200).json({
      message: 'Vault updated successfully',
      vault: {
        ...updatedVault.toJSON(),
        balanceBCH: updatedVault.balanceBCH,
        hasFunds: updatedVault.hasFunds,
      },
    })
  } catch (error) {
    console.error('Update vault error:', error)
    res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    })
  }
}

/**
 * Delete a vault
 */
export const deleteVault = async (req, res) => {
  try {
    const { id } = req.params
    const walletAddress = req.walletAddress || req.body.walletAddress

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid vault ID',
      })
    }

    if (!walletAddress) {
      return res.status(400).json({
        message: 'Wallet address is required',
      })
    }

    const vault = await Vault.findOne({ _id: id, walletAddress: walletAddress.toLowerCase() })

    if (!vault) {
      return res.status(404).json({
        message: 'Vault not found',
      })
    }

    // Check if vault has funds (optional: prevent deletion of funded vaults)
    if (vault.balance > 0) {
      return res.status(400).json({
        message: 'Cannot delete vault with funds. Withdraw funds first.',
        balance: vault.balance,
        balanceBCH: vault.balanceBCH,
      })
    }

    await Vault.findByIdAndDelete(id)

    res.status(200).json({
      message: 'Vault deleted successfully',
    })
  } catch (error) {
    console.error('Delete vault error:', error)
    res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    })
  }
}

/**
 * Get vaults by wallet address (public endpoint)
 */
export const getVaultsByWallet = async (req, res) => {
  try {
    const { walletAddress } = req.params
    const { status, page = 1, limit = 20 } = req.query

    if (!walletAddress) {
      return res.status(400).json({
        message: 'Wallet address is required',
      })
    }

    // Build filter
    const filter = { walletAddress: walletAddress.toLowerCase() }
    if (status) {
      filter.status = status
    }

    // Pagination
    const skip = (page - 1) * limit

    const vaults = await Vault.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total = await Vault.countDocuments(filter)

    res.status(200).json({
      message: 'Vaults retrieved successfully',
      vaults: vaults.map((vault) => ({
        ...vault.toJSON(),
        balanceBCH: vault.balanceBCH,
        hasFunds: vault.hasFunds,
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalVaults: total,
        hasMore: skip + vaults.length < total,
      },
    })
  } catch (error) {
    console.error('Get vaults by wallet error:', error)
    res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    })
  }
}

/**
 * Check for duplicate vault parameters
 */
export const checkDuplicateVault = async (req, res) => {
  try {
    const { walletAddress, priceTarget } = req.body

    if (!walletAddress || !priceTarget) {
      return res.status(400).json({
        message: 'Wallet address and price target are required',
      })
    }

    const duplicateVault = await Vault.checkDuplicate(req.user._id, walletAddress, priceTarget)

    res.status(200).json({
      message: 'Duplicate check completed',
      isDuplicate: !!duplicateVault,
      duplicateVault: duplicateVault
        ? {
            id: duplicateVault._id,
            contractAddress: duplicateVault.contractAddress,
            priceTarget: duplicateVault.priceTarget,
            createdAt: duplicateVault.createdAt,
          }
        : null,
    })
  } catch (error) {
    console.error('Check duplicate vault error:', error)
    res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    })
  }
}

/**
 * Update vault balance
 */
export const updateVaultBalance = async (req, res) => {
  try {
    const { address } = req.params
    const { balance } = req.body

    if (!address || balance === undefined) {
      return res.status(400).json({
        message: 'Contract address and balance are required',
      })
    }

    const walletAddress = req.walletAddress || req.body.walletAddress

    if (!walletAddress) {
      return res.status(400).json({
        message: 'Wallet address is required',
      })
    }

    const vault = await Vault.findOne({
      contractAddress: address.toLowerCase(),
      walletAddress: walletAddress.toLowerCase(),
    })

    if (!vault) {
      return res.status(404).json({
        message: 'Vault not found',
      })
    }

    await vault.updateBalance(Number(balance))

    res.status(200).json({
      message: 'Vault balance updated successfully',
      vault: {
        ...vault.toJSON(),
        balanceBCH: vault.balanceBCH,
        hasFunds: vault.hasFunds,
      },
    })
  } catch (error) {
    console.error('Update vault balance error:', error)
    res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    })
  }
}

/**
 * Get vault statistics for a wallet
 */
export const getVaultStats = async (req, res) => {
  try {
    const { walletAddress } = req.params

    if (!walletAddress) {
      return res.status(400).json({
        message: 'Wallet address is required',
      })
    }

    const vaults = await Vault.find({
      walletAddress: walletAddress.toLowerCase(),
    })

    const stats = {
      totalVaults: vaults.length,
      activeVaults: vaults.filter((v) => v.status === 'active').length,
      withdrawnVaults: vaults.filter((v) => v.status === 'withdrawn').length,
      expiredVaults: vaults.filter((v) => v.status === 'expired').length,
      totalBalance: vaults.reduce((sum, v) => sum + v.balance, 0),
      totalBalanceBCH: vaults.reduce((sum, v) => sum + v.balance, 0) / 100000000,
      vaultsWithFunds: vaults.filter((v) => v.balance > 0).length,
      averageBalance:
        vaults.length > 0 ? vaults.reduce((sum, v) => sum + v.balance, 0) / vaults.length : 0,
      averageBalanceBCH:
        vaults.length > 0
          ? vaults.reduce((sum, v) => sum + v.balance, 0) / vaults.length / 100000000
          : 0,
    }

    res.status(200).json({
      message: 'Vault statistics retrieved successfully',
      stats,
    })
  } catch (error) {
    console.error('Get vault stats error:', error)
    res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    })
  }
}
