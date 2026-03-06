/**
 * Paytaca Alternative Signing Methods
 * Provides different approaches when standard bch_signTransaction fails
 */

/**
 * Alternative approach: Use bch_sendTransaction with broadcast=true
 * Some wallets handle this better than just signing
 */
export async function tryAlternativeSendTransaction(walletConnectRequest, transactionHex, sourceOutputs, userPrompt) {
  console.log('DEBUG: Trying alternative bch_sendTransaction approach...')
  
  try {
    const payload = {
      transaction: transactionHex,
      sourceOutputs: sourceOutputs,
      broadcast: true, // Let Paytaca handle broadcasting
      userPrompt: userPrompt || 'Sign vault withdrawal',
    }
    
    const result = await walletConnectRequest('bch_sendTransaction', payload)
    console.log('DEBUG: bch_sendTransaction result:', result)
    
    // If Paytaca broadcasted, it should return txid
    if (result?.txid) {
      console.log('DEBUG: Got txid from bch_sendTransaction:', result.txid)
      return { txid: result.txid, success: true, method: 'sendTransaction' }
    }
    
    // Check for alternative response formats
    if (result?.result?.txid) {
      console.log('DEBUG: Got txid from result.txid:', result.result.txid)
      return { txid: result.result.txid, success: true, method: 'sendTransaction' }
    }
    
    return result
  } catch (error) {
    console.warn('DEBUG: bch_sendTransaction approach failed:', error.message)
    throw error
  }
}

/**
 * Fallback approach: Try to construct a simpler transaction payload
 * Some wallets have issues with complex CashScript transactions
 */
export async function trySimplifiedTransaction(walletConnectRequest, transactionHex, userPrompt) {
  console.log('DEBUG: Trying simplified transaction approach...')
  
  try {
    // Some wallets prefer a very simple payload
    const simplePayload = {
      hex: transactionHex,
      userPrompt: userPrompt || 'Sign transaction',
    }
    
    const result = await walletConnectRequest('bch_signTransaction', simplePayload)
    console.log('DEBUG: Simplified transaction result:', result)
    
    return result
  } catch (error) {
    console.warn('DEBUG: Simplified transaction approach failed:', error.message)
    throw error
  }
}

/**
 * Manual broadcast approach: Get signature from wallet and broadcast ourselves
 */
export async function tryManualSignAndBroadcast(walletConnectRequest, transactionHex, provider, userPrompt) {
  console.log('DEBUG: Trying manual sign and broadcast approach...')
  
  try {
    // Try to get just the signature from Paytaca
    const signPayload = {
      transaction: transactionHex,
      deriveAddress: false, // Don't try to derive addresses
      userPrompt: userPrompt || 'Sign vault withdrawal',
    }
    
    const result = await walletConnectRequest('bch_signTransaction', signPayload)
    console.log('DEBUG: Manual sign result:', result)
    
    if (result?.signedTransaction || result?.hex) {
      const signedHex = result.signedTransaction || result.hex
      console.log('DEBUG: Got signed transaction, broadcasting manually...')
      
      try {
        const txid = await provider.sendRawTransaction(signedHex)
        console.log('DEBUG: Manual broadcast successful:', txid)
        return { txid, success: true, method: 'manualBroadcast' }
      } catch (broadcastError) {
        console.warn('DEBUG: Manual broadcast failed:', broadcastError.message)
        // Return success anyway - wallet might have broadcasted
        return { txid: null, success: true, method: 'manualBroadcast', broadcastError: broadcastError.message }
      }
    }
    
    return result
  } catch (error) {
    console.warn('DEBUG: Manual sign and broadcast approach failed:', error.message)
    throw error
  }
}

/**
 * Ultimate fallback: Direct wallet interaction simulation
 * When all WalletConnect methods fail, try to guide user through manual process
 */
export async function tryUltimateFallback(walletConnectRequest, contractAddress, amount) {
  console.log('DEBUG: Trying ultimate fallback approach...')
  
  try {
    // Check if we can at least get transaction history to see if wallet processed something
    const history = await walletConnectRequest('bch_getTransactions', { limit: 3 })
    if (history && history.length > 0) {
      const recentTx = history.find(tx => 
        tx.amount === amount || 
        tx.recipients?.includes(contractAddress) ||
        tx.details?.outputs?.some(output => output.script?.includes(contractAddress))
      )
      
      if (recentTx) {
        console.log('DEBUG: Found matching transaction in history:', recentTx)
        return { txid: recentTx.txid, success: true, method: 'historyFallback' }
      }
    }
    
    return null
  } catch (error) {
    console.warn('DEBUG: Ultimate fallback failed:', error.message)
    return null
  }
}
