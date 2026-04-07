/**
 * Vault Storage Service
 * Manages multiple vaults per wallet with localStorage persistence
 */

class VaultStorageService {
  constructor() {
    this.storageKey = 'hodl-vault-all-vaults'
    this.legacyKey = 'hodl-vault-active-vault'
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
   * @param {number} vaultData.priceTarget - Target price in USD
   * @param {number} vaultData.balance - Current balance in satoshis
   * @param {string} vaultData.ownerPkhHex - Owner's public key hash
   * @param {string} vaultData.oraclePkHex - Oracle public key
   * @param {string} vaultData.originalFundingAddress - Original funding address
   * @param {string} [vaultData.vaultSalt] - Unique salt for contract address
   * @param {string} [vaultData.name] - Vault name
   */
  saveVault(vaultData) {
    if (typeof localStorage === 'undefined') return

    try {
      const vaults = this.getAllVaults()

      // Generate unique ID and salt if not provided
      const vaultId = vaultData.id || this.generateVaultId()
      const vaultSalt = vaultData.vaultSalt || this.generateVaultSalt()

      // Check if vault with same contract address already exists (should not happen with salt)
      const existingIndex = vaults.findIndex((v) => v.contractAddress === vaultData.contractAddress)

      const vault = {
        ...vaultData,
        id: vaultId, // Use unique ID instead of contract address
        vaultSalt, // Store the salt for contract recreation
        createdAt: vaultData.createdAt || Date.now(),
        updatedAt: Date.now(),
      }

      if (existingIndex >= 0) {
        // This should not happen with salt, but handle gracefully
        console.warn('Vault with same contract address already exists, updating...')
        vaults[existingIndex] = vault
      } else {
        // Add new vault
        vaults.push(vault)
      }

      localStorage.setItem(this.storageKey, JSON.stringify(vaults))
      console.log('Vault saved:', vault)

      return vault
    } catch (error) {
      console.error('Failed to save vault:', error)
      throw error
    }
  }

  /**
   * Get all vaults from storage
   * @returns {Array} Array of vault objects
   */
  getAllVaults() {
    if (typeof localStorage === 'undefined') return []

    try {
      // First, migrate any legacy vault data
      this.migrateLegacyVault()

      const stored = localStorage.getItem(this.storageKey)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to get vaults:', error)
      return []
    }
  }

  /**
   * Check if vault with similar parameters already exists
   * @param {string} walletAddress - Wallet address
   * @param {number} priceTarget - Target price in USD
   * @returns {Object|null} Existing vault with same parameters or null
   */
  checkForDuplicateVault(walletAddress, priceTarget) {
    if (!walletAddress || !priceTarget) return null

    const allVaults = this.getAllVaults()
    return (
      allVaults.find(
        (vault) =>
          vault.walletAddress === walletAddress && Math.abs(vault.priceTarget - priceTarget) < 0.01, // Allow small floating point differences
      ) || null
    )
  }

  /**
   * Get vaults for a specific wallet
   * @param {string} walletAddress - Wallet address to filter by
   * @returns {Array} Array of vault objects for the wallet
   */
  getVaultsByWallet(walletAddress) {
    if (!walletAddress) return []

    const allVaults = this.getAllVaults()
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
   * Update vault balance
   * @param {string} contractAddress - Contract address of the vault
   * @param {number} balance - New balance in satoshis
   */
  updateVaultBalance(contractAddress, balance) {
    const vaults = this.getAllVaults()
    const vaultIndex = vaults.findIndex((v) => v.contractAddress === contractAddress)

    if (vaultIndex >= 0) {
      vaults[vaultIndex].balance = Number(balance)
      vaults[vaultIndex].updatedAt = Date.now()

      localStorage.setItem(this.storageKey, JSON.stringify(vaults))
      console.log('Vault balance updated:', { contractAddress, balance })
    }
  }

  /**
   * Delete a vault
   * @param {string} contractAddress - Contract address of the vault to delete
   */
  deleteVault(contractAddress) {
    const vaults = this.getAllVaults()
    const filteredVaults = vaults.filter((v) => v.contractAddress !== contractAddress)

    localStorage.setItem(this.storageKey, JSON.stringify(filteredVaults))
    console.log('Vault deleted:', contractAddress)
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
