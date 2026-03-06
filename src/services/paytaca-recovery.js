/**
 * Paytaca Transaction Recovery Service
 * Handles cases where Paytaca accepts signing but doesn't return the signed transaction
 */

import { ElectrumNetworkProvider } from 'cashscript'

/**
 * Attempts to recover a signed transaction from Paytaca after it accepts signing
 * but doesn't return the signed transaction properly
 */
export async function recoverPaytacaTransaction(walletConnectRequest, contractAddress, expectedAmount) {
  console.log('DEBUG: Attempting to recover transaction from Paytaca...')
  
  const attempts = [
    () => tryGetTransactionHistory(walletConnectRequest),
    () => tryGetRecentTransactions(walletConnectRequest),
    () => tryCheckBalanceChange(contractAddress, expectedAmount),
    () => tryGetPendingTransactions(walletConnectRequest)
  ]
  
  for (const attempt of attempts) {
    try {
      const result = await attempt()
      if (result && result.txid) {
        console.log('DEBUG: Successfully recovered transaction:', result.txid)
        return result
      }
    } catch (error) {
      console.warn('DEBUG: Recovery attempt failed:', error.message)
    }
  }
  
  console.warn('DEBUG: Could not recover transaction from Paytaca')
  return null
}

/**
 * Try to get transaction history from Paytaca
 */
async function tryGetTransactionHistory(walletConnectRequest) {
  console.log('DEBUG: Trying to get transaction history...')
  
  try {
    const history = await walletConnectRequest('bch_getTransactions', { limit: 5 })
    if (history && history.length > 0) {
      const recentTx = history[0]
      console.log('DEBUG: Found recent transaction in history:', recentTx)
      return { txid: recentTx.txid, success: true, method: 'history' }
    }
  } catch (error) {
    console.warn('DEBUG: Could not get transaction history:', error.message)
  }
  
  return null
}

/**
 * Try alternative method to get recent transactions
 */
async function tryGetRecentTransactions(walletConnectRequest) {
  console.log('DEBUG: Trying alternative transaction fetch...')
  
  try {
    // Some wallets support different method names
    const methods = ['bch_getTransactionHistory', 'bch_getRecentTransactions', 'bch_listTransactions']
    
    for (const method of methods) {
      try {
        const result = await walletConnectRequest(method, { limit: 1 })
        if (result && (result.txid || (result.length > 0 && result[0].txid))) {
          const txid = result.txid || result[0].txid
          console.log(`DEBUG: Found transaction via ${method}:`, txid)
          return { txid, success: true, method }
        }
      } catch {
        // Method not supported, try next one
        continue
      }
    }
  } catch (error) {
    console.warn('DEBUG: Alternative transaction fetch failed:', error.message)
  }
  
  return null
}

/**
 * Check if contract balance changed (indicates transaction was broadcast)
 */
async function tryCheckBalanceChange(contractAddress, expectedAmount) {
  console.log('DEBUG: Checking balance change for contract:', contractAddress)
  
  try {
    const provider = new ElectrumNetworkProvider('chipnet')
    
    // Get current balance
    const currentBalance = await provider.getBalance(contractAddress)
    console.log('DEBUG: Current contract balance:', currentBalance.toString())
    
    // If balance decreased by expected amount, transaction likely succeeded
    if (expectedAmount && currentBalance < expectedAmount) {
      console.log('DEBUG: Balance decreased, transaction likely broadcasted')
      return { txid: null, success: true, method: 'balance_check', balanceChange: true }
    }
  } catch (error) {
    console.warn('DEBUG: Balance check failed:', error.message)
  }
  
  return null
}

/**
 * Try to get pending transactions
 */
async function tryGetPendingTransactions(walletConnectRequest) {
  console.log('DEBUG: Trying to get pending transactions...')
  
  try {
    const pending = await walletConnectRequest('bch_getPendingTransactions', {})
    if (pending && pending.length > 0) {
      const tx = pending[0]
      console.log('DEBUG: Found pending transaction:', tx)
      return { txid: tx.txid, success: true, method: 'pending' }
    }
  } catch (error) {
    console.warn('DEBUG: Could not get pending transactions:', error.message)
  }
  
  return null
}

/**
 * Enhanced Paytaca request with transaction recovery
 */
export async function paytacaRequestWithRecovery(walletConnectRequest, method, params, contractAddress, expectedAmount) {
  console.log(`DEBUG: Enhanced Paytaca request ${method}`)
  
  try {
    const result = await walletConnectRequest(method, params)
    console.log(`DEBUG: Paytaca ${method} completed`)
    
    // If result doesn't contain signed transaction, try recovery
    if (!result.signedTransaction && !result.txid) {
      console.log('DEBUG: No signed transaction in result, attempting recovery...')
      const recovered = await recoverPaytacaTransaction(walletConnectRequest, contractAddress, expectedAmount)
      
      if (recovered) {
        console.log('DEBUG: Successfully recovered transaction after signing')
        return recovered
      }
    }
    
    return result
  } catch (error) {
    console.error(`DEBUG: Enhanced Paytaca request failed:`, {
      message: error.message,
      code: error.code,
      data: error.data
    })
    throw error
  }
}
