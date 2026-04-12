/**
 * Automated Withdrawal Service
 * Enables "Create, Fund, Forget" functionality with pre-signed transactions
 */

import { fetchOraclePrice } from './oracle'

export class AutoWithdrawalService {
  constructor() {
    this.monitoringInterval = null
    this.isMonitoring = false
    this.store = null
  }

  /**
   * Initialize with Vuex store
   */
  init(store) {
    this.store = store
  }

  /**
   * Start monitoring all active vaults for automatic withdrawals
   */
  startMonitoring() {
    if (this.isMonitoring) return

    this.isMonitoring = true
    this.monitoringInterval = setInterval(async () => {
      await this.checkAllVaults()
    }, 30000) // Check every 30 seconds

    if (this.store) {
      this.store.dispatch('autoWithdrawal/startMonitoring')
    }

    console.log('Auto-withdrawal monitoring started')
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
      this.isMonitoring = false

      if (this.store) {
        this.store.dispatch('autoWithdrawal/stopMonitoring')
      }

      console.log('Auto-withdrawal monitoring stopped')
    }
  }

  /**
   * Add vault to monitoring list
   */
  addVault(vault) {
    if (this.store) {
      this.store.dispatch('autoWithdrawal/addVault', vault)
    }
  }

  /**
   * Remove vault from monitoring
   */
  removeVault(contractAddress) {
    if (this.store) {
      this.store.dispatch('autoWithdrawal/removeVault', contractAddress)
    }
  }

  /**
   * Get active vaults from store
   */
  getActiveVaults() {
    if (this.store) {
      return this.store.getters['autoWithdrawal/activeVaults']
    }
    return []
  }

  /**
   * Check all vaults for withdrawal conditions
   */
  async checkAllVaults() {
    const activeVaults = this.getActiveVaults()

    for (const vault of activeVaults) {
      try {
        await this.checkVault(vault)
      } catch (error) {
        console.error(`Error checking vault ${vault.contractAddress}:`, error)
      }
    }
  }

  /**
   * Check individual vault for withdrawal conditions
   */
  async checkVault(vault) {
    // Get current price
    const priceData = await fetchOraclePrice()
    const currentPrice = priceData.price

    console.log(
      `Checking vault ${vault.contractAddress}: Current $${currentPrice} vs Target $${vault.priceTarget}`,
    )

    // Check if price target is met
    if (currentPrice >= vault.priceTarget) {
      console.log(`Price target met! Executing auto-withdrawal for vault ${vault.contractAddress}`)
      await this.executeAutoWithdrawal(vault, priceData)
    }
  }

  /**
   * Execute automatic withdrawal using pre-signed transaction
   */
  async executeAutoWithdrawal(vault, oracleData) {
    try {
      // Get pre-signed transaction for this price target
      const preSignedTx = this.getPreSignedTransaction(vault, vault.priceTarget)

      if (!preSignedTx) {
        console.error(`No pre-signed transaction found for vault ${vault.contractAddress}`)
        return
      }

      // Combine pre-signed transaction with current oracle data
      const finalTransaction = this.combineSignatures(preSignedTx, oracleData)

      // Broadcast the transaction
      const result = await this.broadcastTransaction(finalTransaction)

      // Mark transaction as used
      if (this.store) {
        this.store.dispatch('autoWithdrawal/markTransactionUsed', {
          contractAddress: vault.contractAddress,
          priceTarget: vault.priceTarget,
        })
      }

      // Remove vault from monitoring (withdrawal completed)
      this.removeVault(vault.contractAddress)

      // Notify user
      this.notifyUser(vault, result)

      console.log(`Auto-withdrawal completed for vault ${vault.contractAddress}:`, result)
    } catch (error) {
      console.error(`Auto-withdrawal failed for vault ${vault.contractAddress}:`, error)
    }
  }

  /**
   * Get pre-signed transaction for specific price target
   */
  getPreSignedTransaction(vault, priceTarget) {
    if (this.store) {
      const transactions = this.store.getters['autoWithdrawal/getPreSignedTransactions'](
        vault.contractAddress,
      )
      return transactions.find((tx) => tx.priceTarget === priceTarget && !tx.used)
    }

    // Fallback to localStorage
    const stored = localStorage.getItem(`pre-signed-${vault.contractAddress}`)
    if (!stored) return null

    const transactions = JSON.parse(stored)
    return transactions.find((tx) => tx.priceTarget === priceTarget && !tx.used)
  }

  /**
   * Combine pre-signed transaction with oracle signature
   */
  combineSignatures(preSignedTx, oracleData) {
    return {
      ...preSignedTx,
      oracleMessage: oracleData.message_hex,
      oracleSignature: oracleData.signature_hex,
      oraclePubkey: oracleData.oracle_pubkey_hex,
    }
  }

  /**
   * Broadcast transaction to blockchain
   */
  async broadcastTransaction(transaction) {
    // TODO: Integrate with your existing blockchain service
    // For now, this is a mock implementation that simulates broadcasting

    console.log('Broadcasting transaction:', {
      hasOracleMessage: !!transaction.oracleMessage,
      hasOracleSignature: !!transaction.oracleSignature,
      hasPreSignedData: !!transaction.transaction,
    })

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Mock successful broadcast
    return {
      txid: `auto-tx-${Date.now()}`,
      success: true,
    }
  }

  /**
   * Notify user of successful withdrawal
   */
  notifyUser(vault, result) {
    // Send notification (you can integrate with Quasar's notify system)
    if (typeof window !== 'undefined' && window.$q) {
      window.$q.notify({
        type: 'positive',
        message: `Automatic withdrawal completed! TX: ${result.txid}`,
        icon: 'check_circle',
        timeout: 10000,
      })
    }
  }
}

// Global instance
export const autoWithdrawalService = new AutoWithdrawalService()
