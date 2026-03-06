/**
 * Direct Transaction Signing Service
 * Bypasses WalletConnect entirely and uses direct BCH transaction construction
 */

import { binToHex, hexToBin } from '@bitauth/libauth'

/**
 * Create a simple BCH transaction that Paytaca can sign directly
 * This bypasses WalletConnect's complex protocol issues
 */
export async function createDirectPaytacaTransaction(contractUtxo, ownerAddress, amount) {
  console.log('DEBUG: Creating direct Paytaca transaction...')
  
  try {
    // Create a simple P2PKH transaction format that Paytaca understands
    const transaction = {
      version: 2,
      locktime: 0,
      inputs: [{
        previousTransactionHash: contractUtxo.txid,
        previousTransactionOutputIndex: contractUtxo.vout,
        sequence: 0xffffffff,
        unlockingBytecode: new Uint8Array(), // Will be filled by wallet
      }],
      outputs: [{
        valueSatoshis: BigInt(amount),
        lockingBytecode: hexToBin(addressToLockingScript(ownerAddress))
      }],
    }
    
    console.log('DEBUG: Direct transaction created:', {
      inputs: transaction.inputs.length,
      outputs: transaction.outputs.length,
      amount: amount.toString(),
      toAddress: ownerAddress
    })
    
    return transaction
  } catch (error) {
    console.error('DEBUG: Failed to create direct transaction:', error.message)
    throw error
  }
}

/**
 * Convert BCH address to locking script
 */
function addressToLockingScript(address) {
  // Simple P2PKH locking script format
  // This is a simplified version - in production you'd want proper address parsing
  const addressBytes = hexToBin(address.replace(/[^0-9a-fA-F]/g, ''))
  if (addressBytes.length < 20) return ''
  
  // P2PKH pattern: OP_DUP OP_HASH160 <pubkey_hash> OP_EQUALVERIFY OP_CHECKSIG
  const pubkeyHash = addressBytes.slice(-20) // Take last 20 bytes as pubkey hash
  const script = new Uint8Array([0x76, 0xa9, 0x14, ...pubkeyHash, 0x88, 0xac])
  return binToHex(script)
}

/**
 * Try to get Paytaca to sign using a direct transaction format
 */
export async function tryDirectPaytacaSigning(walletConnectRequest, transactionHex, userPrompt) {
  console.log('DEBUG: Trying direct Paytaca signing...')
  
  try {
    // Create a minimal payload that Paytaca might understand
    const directPayload = {
      txHex: transactionHex,
      message: userPrompt || 'Sign transaction',
      // Remove complex WalletConnect fields that might cause issues
    }
    
    console.log('DEBUG: Direct payload:', directPayload)
    
    // Try with different method names that Paytaca might support
    const methods = [
      'bch_signTransaction',
      'signTransaction', 
      'sign',
      'signRawTransaction',
      'signTx'
    ]
    
    for (const method of methods) {
      try {
        console.log(`DEBUG: Trying method: ${method}`)
        const result = await walletConnectRequest(method, directPayload)
        
        if (result && (result.txid || result.hex || result.signedTransaction)) {
          console.log(`DEBUG: Success with method ${method}:`, result)
          return normalizeDirectResult(result)
        }
      } catch (methodError) {
        console.log(`DEBUG: Method ${method} failed:`, methodError.message)
        continue
      }
    }
    
    // If all methods failed, try without any payload (just the hex)
    try {
      console.log('DEBUG: Trying with just transaction hex...')
      const result = await walletConnectRequest('bch_signTransaction', transactionHex)
      
      if (result) {
        console.log('DEBUG: Success with hex-only approach:', result)
        return normalizeDirectResult(result)
      }
    } catch (hexError) {
      console.log('DEBUG: Hex-only approach failed:', hexError.message)
    }
    
    return null
  } catch (error) {
    console.error('DEBUG: Direct Paytaca signing failed:', error.message)
    throw error
  }
}

/**
 * Normalize the result from direct signing
 */
function normalizeDirectResult(result) {
  if (!result) return null
  
  // Check for different response formats
  const signedHex = result.signedTransaction || 
                   result.hex || 
                   result.transactionHex ||
                   result.txHex ||
                   result.rawTransaction
  
  if (signedHex) {
    return { signedTransaction: signedHex, success: true }
  }
  
  if (result.txid) {
    return { txid: result.txid, success: true }
  }
  
  return result
}

/**
 * Ultimate fallback: Manual transaction construction guidance
 */
export async function tryManualTransactionGuidance(contractAddress, ownerAddress, amount) {
  console.log('DEBUG: Providing manual transaction guidance...')
  
  try {
    // Create a manual transaction that the user can copy-paste
    const guidance = {
      type: 'manual_transaction',
      from: contractAddress,
      to: ownerAddress,
      amount: amount.toString(),
      message: 'Please manually create and send this transaction from your wallet',
      steps: [
        '1. Open Paytaca wallet',
        '2. Go to Send/Transaction section', 
        '3. Enter the vault address as source',
        '4. Enter your address as destination',
        '5. Enter the exact amount',
        '6. Send the transaction manually'
      ]
    }
    
    console.log('DEBUG: Manual guidance provided:', guidance)
    return { success: true, manualGuidance: guidance, method: 'manual_guidance' }
  } catch (error) {
    console.error('DEBUG: Failed to provide manual guidance:', error.message)
    return null
  }
}
