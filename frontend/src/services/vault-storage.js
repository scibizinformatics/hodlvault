/**
 * Vault Storage Service
 * Manages multiple vaults per wallet with backend API and localStorage fallback
 */

import { vaultApi } from './api.service.js'

class VaultStorageService {
  constructor() {
    this.storageKey = 'hodl-vault-all-vaults'
    this.legacyKey = 'hodl-vault-active-vault'
    this.useBackend = true // Toggle backend usage
    this.backendAvailable = false // Will be checked at runtime
  }

  /**
   * Check if backend is available
   * @returns {Promise<boolean>}
   */
  async checkBackendAvailability() {
    try {
      await vaultApi.getVaultsByWallet('test', { timeout: 3000 })
      this.backendAvailable = true
      return true
    } catch {
      this.backendAvailable = false
      console.warn('Backend not available, using localStorage fallback')
      return false
    }
  }

  /**
   * Determine if we should use backend or localStorage
   * @returns {boolean}
   */
  shouldUseBackend() {
    return this.useBackend && this.backendAvailable
  }

  /**
   * Generate a unique vault ID
   * @returns {string} Unique vault identifier
   */
  generateVaultId() {
    return 'vault_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  /**
   * Generate a unique salt for contract address uniqueness
   * @returns {string} 64-character hex string
   */
  generateVaultSalt() {
    const salt = crypto.getRandomValues(new Uint8Array(32))
    return Array.from(salt)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  /**
   * Save a new vault to storage
   * @param {Object} vaultData - Vault information
   * @param {string} vaultData.walletAddress - Owner's wallet address
   * @param {string} vaultData.contractAddress - Contract address
   * @param {number} vaultData.priceTargetCents - Target price in cents
   * @param {number} vaultData.balance - Current balance in satoshis
   * @param {string} vaultData.ownerPkhHex - Owner's public key hash
   * @param {string} vaultData.oraclePkHex - Oracle public key
   * @param {string} vaultData.originalFundingAddress - Original funding address
   * @param {string} [vaultData.vaultSalt] - Unique salt for contract address
   * @param {string} [vaultData.name] - Vault name
   */
  async saveVault(vaultData) {
    // Debug: Log what data we're trying to save
    console.log('🔍 saveVault called with:', {
      contractAddress: vaultData.contractAddress,
      walletAddress: vaultData.walletAddress,
      priceTargetCents: vaultData.priceTargetCents,
      hasOwnerPkhHex: !!vaultData.ownerPkhHex,
      hasOraclePkHex: !!vaultData.oraclePkHex,
      hasOriginalFundingAddress: !!vaultData.originalFundingAddress,
      hasVaultSalt: !!vaultData.vaultSalt,
    })

    // Always try backend first if enabled, fallback on error
    if (this.useBackend) {
      try {
        const result = await vaultApi.createVault(vaultData)
        console.log('Vault saved to backend:', result.vault)
        this.backendAvailable = true
        // Also save to localStorage as backup
        this.saveVaultLocal(vaultData)
        return result.vault
      } catch (error) {
        console.error('❌ Backend vault save failed:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        })
        this.backendAvailable = false
        // Fall back to localStorage but now with visibility
        console.warn('⚠️  Falling back to localStorage. Vault NOT synced to MongoDB.')
        return this.saveVaultLocal(vaultData)
      }
    } else {
      console.log('ℹ️  Backend disabled, saving to localStorage only')
    }

    // Fallback to localStorage only
    return this.saveVaultLocal(vaultData)
  }

  /**
   * Save vault to localStorage only
   * @param {Object} vaultData - Vault information
   * @returns {Object} Saved vault
   */
  saveVaultLocal(vaultData) {
    if (typeof localStorage === 'undefined') return

    try {
      const vaults = this.getAllVaults()

      // Generate unique ID and salt if not provided
      const vaultId = vaultData.id || this.generateVaultId()
      const vaultSalt = vaultData.vaultSalt || this.generateVaultSalt()

      // Check if vault with same contract address already exists
      const existingIndex = vaults.findIndex((v) => v.contractAddress === vaultData.contractAddress)

      // Ensure priceTargetCents is set (convert from priceTarget if needed)
      let priceTargetCents = vaultData.priceTargetCents
      if (!priceTargetCents && vaultData.priceTarget) {
        priceTargetCents = Math.round(vaultData.priceTarget * 100)
      }

      const vault = {
        ...vaultData,
        id: vaultId,
        vaultSalt,
        priceTargetCents,
        createdAt: vaultData.createdAt || Date.now(),
        updatedAt: Date.now(),
      }

      if (existingIndex >= 0) {
        console.warn('Vault with same contract address already exists, updating...')
        vaults[existingIndex] = vault
      } else {
        vaults.push(vault)
      }

      localStorage.setItem(this.storageKey, JSON.stringify(vaults))
      console.log('Vault saved to localStorage:', vault)

      return vault
    } catch (error) {
      console.error('Failed to save vault to localStorage:', error)
      throw error
    }
  }

  /**
   * Get all vaults from storage (synchronous - uses localStorage)
   * Note: Backend sync happens during save, load uses localStorage for consistency
   * @returns {Array} Array of vault objects
   */
  getAllVaults() {
    // Always use localStorage for synchronous access
    // Backend sync is handled during save operations
    return this.getAllVaultsLocal()
  }

  /**
   * Get all vaults from localStorage only
   * @returns {Array} Array of vault objects
   */
  getAllVaultsLocal() {
    if (typeof localStorage === 'undefined') return []

    try {
      // First, migrate any legacy vault data
      this.migrateLegacyVault()

      const stored = localStorage.getItem(this.storageKey)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to get vaults from localStorage:', error)
      return []
    }
  }

  /**
   * Check if vault with similar parameters already exists
   * @param {string} walletAddress - Wallet address
   * @param {number} priceTargetCents - Target price in cents
   * @returns {Object|null} Existing vault with same parameters or null
   */
  checkForDuplicateVault(walletAddress, priceTargetCents) {
    if (!walletAddress || !priceTargetCents) return null

    const allVaults = this.getAllVaults()
    return (
      allVaults.find(
        (vault) =>
          vault.walletAddress === walletAddress &&
          Math.abs(vault.priceTargetCents - priceTargetCents) < 0.01, // Allow small floating point differences
      ) || null
    )
  }

  /**
   * Get vaults for a specific wallet
   * @param {string} walletAddress - Wallet address to filter by
   * @returns {Array} Array of vault objects for the wallet
   */
  async getVaultsByWallet(walletAddress) {
    if (!walletAddress) return []

    // ✅ Check backend availability if not already checked
    if (!this.backendAvailable && this.useBackend) {
      await this.checkBackendAvailability()
    }

    // Try backend first if available
    if (this.shouldUseBackend()) {
      try {
        const result = await vaultApi.getVaultsByWallet(walletAddress)
        console.log(
          `✅ Vaults loaded from backend for ${walletAddress}:`,
          result.vaults?.length || 0,
        )

        // Sync to localStorage for offline access
        if (result.vaults?.length > 0) {
          const existingLocal = this.getAllVaultsLocal()
          const otherWallets = existingLocal.filter((v) => v.walletAddress !== walletAddress)
          const merged = [...otherWallets, ...result.vaults]
          localStorage.setItem(this.storageKey, JSON.stringify(merged))
          console.log('💾 Synced backend vaults to localStorage')
        }

        return result.vaults || []
      } catch (error) {
        console.warn('❌ Failed to load from backend, using localStorage:', error)
        this.backendAvailable = false
      }
    }

    // Fallback to localStorage
    console.log('📦 Loading vaults from localStorage only')
    const allVaults = this.getAllVaultsLocal()
    return allVaults.filter((vault) => vault.walletAddress === walletAddress)
  }

  /**
   * Get a specific vault by ID
   * @param {string} vaultId - Vault ID
   * @returns {Object|null} Vault object or null if not found
   */
  getVaultById(vaultId) {
    if (!vaultId) return null

    const allVaults = this.getAllVaults()
    return allVaults.find((vault) => vault.id === vaultId) || null
  }

  /**
   * Get a specific vault by contract address (backward compatibility)
   * @param {string} contractAddress - Contract address of the vault
   * @returns {Object|null} Vault object or null if not found
   */
  getVaultByAddress(contractAddress) {
    if (!contractAddress) return null

    const allVaults = this.getAllVaults()
    return allVaults.find((vault) => vault.contractAddress === contractAddress) || null
  }

  /**
   * Fetch a specific vault by contract address from backend
   * This ensures we get complete vault data with all fields
   * @param {string} contractAddress - Contract address of the vault
   * @returns {Promise<Object|null>} Vault object or null if not found
   */
  async getVaultByContractAddressFromBackend(contractAddress) {
    if (!contractAddress) return null

    // Check backend availability if not already checked
    if (!this.backendAvailable && this.useBackend) {
      await this.checkBackendAvailability()
    }

    if (this.shouldUseBackend()) {
      try {
        console.log('🔍 Fetching vault by contract address from backend:', contractAddress)
        const result = await vaultApi.getVaultByContractAddress(contractAddress)
        console.log('✅ Vault found:', result.vault?.contractAddress)
        return result.vault || null
      } catch (error) {
        console.warn('❌ Failed to fetch vault from backend:', error)
        this.backendAvailable = false
      }
    }

    // Fallback to localStorage
    console.log('📦 Falling back to localStorage for vault:', contractAddress)
    return this.getVaultByAddress(contractAddress)
  }

  /**
   * Update vault balance
   * @param {string} contractAddress - Contract address of the vault
   * @param {number} balance - New balance in satoshis
   */
  async updateVaultBalance(contractAddress, balance) {
    // Ensure balance is a Number (not BigInt) for JSON serialization
    const balanceNumber = Number(balance)

    // Try backend first if enabled
    if (this.useBackend) {
      try {
        await vaultApi.updateVaultBalance(contractAddress, balanceNumber)
        this.backendAvailable = true
        console.log('Vault balance updated in backend:', {
          contractAddress,
          balance: balanceNumber,
        })
      } catch (error) {
        console.warn('Failed to update balance in backend:', error.message || error)
        this.backendAvailable = false
        // Continue to update localStorage even if backend fails
      }
    }

    // Always update localStorage as backup
    const vaults = this.getAllVaultsLocal()
    const vaultIndex = vaults.findIndex((v) => v.contractAddress === contractAddress)

    if (vaultIndex >= 0) {
      vaults[vaultIndex].balance = balanceNumber
      vaults[vaultIndex].updatedAt = Date.now()

      localStorage.setItem(this.storageKey, JSON.stringify(vaults))
      console.log('Vault balance updated in localStorage:', {
        contractAddress,
        balance: balanceNumber,
      })
    }
  }

  /**
   * Delete a vault
   * @param {string} contractAddress - Contract address of the vault to delete
   * @param {string} vaultId - Vault ID (required for backend deletion)
   */
  async deleteVault(contractAddress, vaultId) {
    // Try backend first if available and vaultId provided
    if (this.shouldUseBackend() && vaultId) {
      try {
        await vaultApi.deleteVault(vaultId)
        console.log('Vault deleted from backend:', contractAddress)
      } catch (error) {
        console.warn('Failed to delete from backend:', error)
      }
    }

    // Always delete from localStorage
    const vaults = this.getAllVaultsLocal()
    const filteredVaults = vaults.filter((v) => v.contractAddress !== contractAddress)

    localStorage.setItem(this.storageKey, JSON.stringify(filteredVaults))
    console.log('Vault deleted from localStorage:', contractAddress)
  }

  /**
   * Sync local vaults with backend
   * @param {string} walletAddress - Wallet address to sync
   */
  async syncVaultsWithBackend(walletAddress) {
    if (!this.shouldUseBackend()) {
      console.log('Backend not available, skipping sync')
      return
    }

    try {
      // Get vaults from backend
      const backendResult = await vaultApi.getVaultsByWallet(walletAddress)
      const backendVaults = backendResult.vaults || []

      // Get vaults from localStorage
      const localVaults = this.getVaultsByWallet(walletAddress)

      // Find vaults that exist locally but not in backend
      const vaultsToMigrate = localVaults.filter((localVault) => {
        return !backendVaults.some(
          (backendVault) => backendVault.contractAddress === localVault.contractAddress,
        )
      })

      // Migrate local vaults to backend
      for (const vault of vaultsToMigrate) {
        try {
          await vaultApi.createVault(vault)
          console.log('Migrated vault to backend:', vault.id)
        } catch (error) {
          console.error('Failed to migrate vault:', vault.id, error)
        }
      }

      console.log(`Sync complete: Migrated ${vaultsToMigrate.length} vaults to backend`)
    } catch (error) {
      console.error('Failed to sync vaults with backend:', error)
    }
  }

  /**
   * Migrate legacy single vault to new multi-vault system
   */
  migrateLegacyVault() {
    if (typeof localStorage === 'undefined') return

    try {
      const legacyVault = localStorage.getItem(this.legacyKey)
      if (!legacyVault) return

      const vaultData = JSON.parse(legacyVault)

      // Check if this vault is already in the new system
      const existingVaults = this.getAllVaults()
      const exists = existingVaults.some((v) => v.contractAddress === vaultData.contractAddress)

      if (!exists && vaultData.contractAddress) {
        this.saveVault(vaultData)
        console.log('Migrated legacy vault to new system')
      }

      // Remove legacy data
      localStorage.removeItem(this.legacyKey)
    } catch (error) {
      console.error('Failed to migrate legacy vault:', error)
    }
  }

  /**
   * Clear all vault data (for testing/reset)
   */
  clearAllVaults() {
    if (typeof localStorage === 'undefined') return

    localStorage.removeItem(this.storageKey)
    localStorage.removeItem(this.legacyKey)
    console.log('All vault data cleared')
  }

  /**
   * Get vault statistics for a wallet
   * @param {string} walletAddress - Wallet address
   * @returns {Object} Statistics object
   */
  getVaultStats(walletAddress) {
    const vaults = this.getVaultsByWallet(walletAddress)

    const stats = {
      totalVaults: vaults.length,
      totalBalance: 0,
      readyToWithdraw: 0,
    }

    vaults.forEach((vault) => {
      stats.totalBalance += (vault.balance || 0) / 100000000 // Convert to BCH

      // Check if ready to withdraw (this would need current price)
      // For now, we'll just count vaults that have a balance
      if (vault.balance > 0) {
        stats.readyToWithdraw++
      }
    })

    return stats
  }
}

// Export singleton instance
export const vaultStorage = new VaultStorageService()
export default vaultStorage
