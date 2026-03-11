/**
 * Pre-signing Service for Automated Withdrawals
 * Handles creation and storage of pre-signed withdrawal transactions
 */

import { hexToBin, binToHex } from '@bitauth/libauth'
import { initializeHodlVaultContract } from './blockchain'

export class PreSigningService {
  constructor() {
    this.priceTargets = [500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500]
  }

  /**
   * Generate pre-signed transactions for various price targets
   */
  async generatePreSignedTransactions(vault, walletConnectRequest, store = null) {
    const transactions = []

    for (const priceTarget of this.priceTargets) {
      try {
        const txTemplate = await this.createWithdrawalTemplate(
          vault,
          priceTarget,
          walletConnectRequest,
        )

        if (txTemplate) {
          transactions.push({
            priceTarget,
            transaction: txTemplate,
            createdAt: Date.now(),
            used: false,
          })
        }
      } catch (error) {
        console.error(`Failed to pre-sign for price target $${priceTarget}:`, error)
      }
    }

    // Store pre-signed transactions
    this.storePreSignedTransactions(vault.contractAddress, transactions, store)

    return transactions
  }

  /**
   * Create a withdrawal transaction template for a specific price target
   */
  async createWithdrawalTemplate(vault, priceTarget, walletConnectRequest) {
    const { TransactionBuilder } = await import('cashscript')

    try {
      // Create contract instance
      const contract = initializeHodlVaultContract(
        vault.ownerPkhHex,
        vault.oraclePkHex,
        Math.floor(priceTarget * 100), // Convert to cents
      )

      // Get UTXOs (mock for template creation)
      const mockUtxo = {
        txid: '0'.repeat(64),
        vout: 0,
        satoshis: 1000000, // Mock amount
        script: contract.address,
      }

      // Build transaction template
      const txBuilder = new TransactionBuilder({ provider: contract.provider })
        .addInput(
          mockUtxo,
          contract.unlock.spend(
            hexToBin(vault.ownerPkHex), // Will be replaced by wallet signature
            new Uint8Array(65), // Placeholder signature
            hexToBin('0000000000000000'), // Placeholder oracle message
            new Uint8Array(65), // Placeholder oracle signature
          ),
        )
        .addOutput({
          to: vault.originalFundingAddress,
          amount: mockUtxo.satoshis - 400n, // Minus fee
        })
        .setLocktime(0)

      // Generate WalletConnect payload
      const wcPayload = txBuilder.generateWcTransactionObject({
        broadcast: false,
        userPrompt: `Pre-sign withdrawal for $${priceTarget} target`,
      })

      const transactionHex =
        typeof wcPayload.transaction === 'string' ? wcPayload.transaction : txBuilder.build()

      // Serialize payload for WalletConnect
      const serializedPayload = this.serializeForWc({
        transaction: transactionHex,
        sourceOutputs: wcPayload.sourceOutputs,
        broadcast: false,
        userPrompt: `Pre-sign auto-withdrawal for $${priceTarget} price target`,
      })

      // Request signature from wallet
      const signatureResult = await walletConnectRequest('bch_signTransaction', serializedPayload)

      if (signatureResult && (signatureResult.txid || signatureResult.signedTransaction)) {
        return {
          transactionHex,
          signedTransaction: signatureResult.signedTransaction,
          txid: signatureResult.txid,
          sourceOutputs: wcPayload.sourceOutputs,
          priceTarget,
        }
      }
    } catch (error) {
      console.error(`Failed to create withdrawal template for $${priceTarget}:`, error)
      throw error
    }

    return null
  }

  /**
   * Serialize object for JSON RPC (BigInt → string, Uint8Array → hex)
   */
  serializeForWc(obj) {
    if (obj === null || obj === undefined) return obj
    if (typeof obj === 'bigint') return obj.toString()
    if (obj instanceof Uint8Array) return binToHex(obj)
    if (Array.isArray(obj)) return obj.map(this.serializeForWc.bind(this))
    if (typeof obj === 'object') {
      const out = {}
      for (const k of Object.keys(obj)) out[k] = this.serializeForWc(obj[k])
      return out
    }
    return obj
  }

  /**
   * Store pre-signed transactions in Vuex store
   */
  storePreSignedTransactions(contractAddress, transactions, store = null) {
    if (store) {
      store.dispatch('autoWithdrawal/storePreSignedTransactions', {
        contractAddress,
        transactions,
      })
    } else {
      // Fallback to localStorage
      const key = `pre-signed-${contractAddress}`
      try {
        localStorage.setItem(key, JSON.stringify(transactions))
        console.log(`Stored ${transactions.length} pre-signed transactions for ${contractAddress}`)
      } catch (error) {
        console.error('Failed to store pre-signed transactions:', error)
      }
    }
  }

  /**
   * Get stored pre-signed transactions
   */
  getPreSignedTransactions(contractAddress) {
    const key = `pre-signed-${contractAddress}`
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to retrieve pre-signed transactions:', error)
      return []
    }
  }

  /**
   * Mark transaction as used
   */
  markTransactionUsed(contractAddress, priceTarget) {
    const transactions = this.getPreSignedTransactions(contractAddress)
    const targetTx = transactions.find((tx) => tx.priceTarget === priceTarget)

    if (targetTx) {
      targetTx.used = true
      targetTx.usedAt = Date.now()
      this.storePreSignedTransactions(contractAddress, transactions)
    }
  }

  /**
   * Clean up old pre-signed transactions
   */
  cleanupOldTransactions(contractAddress, maxAge = 7 * 24 * 60 * 60 * 1000) {
    // 7 days
    const transactions = this.getPreSignedTransactions(contractAddress)
    const now = Date.now()

    const validTransactions = transactions.filter((tx) => !tx.used && now - tx.createdAt < maxAge)

    this.storePreSignedTransactions(contractAddress, validTransactions)
  }
}

// Global instance
export const preSigningService = new PreSigningService()
