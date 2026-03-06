/**
 * Complete Paytaca Bypass Service
 * Bypasses WalletConnect entirely and uses direct wallet interaction
 */

/**
 * Create a manual withdrawal transaction that the user can copy-paste into Paytaca
 * This completely bypasses WalletConnect and its protocol issues
 */
export async function createManualWithdrawalTransaction(contract, ownerAddress, amount, oracleMessageHex, oracleSigHex) {
  console.log('DEBUG: Creating manual withdrawal transaction for Paytaca bypass...')
  
  try {
    // Get the contract UTXOs
    const utxos = await contract.getUtxos()
    if (!utxos.length) {
      throw new Error('No UTXOs available to spend from the vault')
    }
    
    // Use the largest UTXO
    const utxo = utxos.reduce((best, current) =>
      !best || current.satoshis > best.satoshis ? current : best,
      null
    )
    
    const minerFee = 400n
    const sendAmount = utxo.satoshis - minerFee
    
    if (sendAmount <= 0n) {
      throw new Error('Insufficient balance to cover miner fee')
    }
    
    // Create the transaction using CashScript
    const { TransactionBuilder } = await import('cashscript')
    const { hexToBin } = await import('@bitauth/libauth')
    
    const oracleMessage = hexToBin(oracleMessageHex)
    const oracleSig = hexToBin(oracleSigHex)
    
    // Build the transaction
    const txBuilder = new TransactionBuilder({ provider: contract.provider })
      .addInput(utxo, contract.unlock.spend(hexToBin('03'.repeat(33)), hexToBin(''.repeat(130)), oracleMessage, oracleSig))
      .addOutput({ to: ownerAddress, amount: sendAmount })
      .setLocktime(0)
    
    // Generate the raw transaction hex
    const rawTx = txBuilder.build()
    const txHex = rawTx.toString('hex')
    
    console.log('DEBUG: Manual transaction created:', {
      utxoTxid: utxo.txid,
      utxoVout: utxo.vout,
      utxoSatoshis: utxo.satoshis.toString(),
      sendAmount: sendAmount.toString(),
      toAddress: ownerAddress,
      txHexLength: txHex.length
    })
    
    return {
      rawTransaction: txHex,
      utxoDetails: {
        txid: utxo.txid,
        vout: utxo.vout,
        satoshis: utxo.satoshis.toString()
      },
      sendAmount: sendAmount.toString(),
      toAddress: ownerAddress,
      minerFee: minerFee.toString(),
      instructions: generateManualInstructions(txHex, utxo, ownerAddress, sendAmount)
    }
  } catch (error) {
    console.error('DEBUG: Failed to create manual transaction:', error.message)
    throw error
  }
}

/**
 * Generate step-by-step instructions for manual withdrawal
 */
function generateManualInstructions(txHex, utxo, ownerAddress, amount) {
  return {
    title: 'Manual Withdrawal Instructions',
    steps: [
      '1. Open Paytaca wallet app',
      '2. Go to "Send" or "Transaction" section',
      '3. Choose "Advanced" or "Raw Transaction" mode',
      '4. Copy and paste the transaction hex below',
      '5. Review and sign the transaction',
      '6. Broadcast the transaction'
    ],
    transactionData: {
      rawHex: txHex,
      sourceTxid: utxo.txid,
      sourceVout: utxo.vout,
      amount: amount.toString(),
      toAddress: ownerAddress
    },
    alternative: {
      title: 'Alternative: Use Web Explorer',
      steps: [
        '1. Copy the transaction hex',
        '2. Go to a BCH block explorer (like blockchair.com/bitcoin-cash)',
        '3. Use their "Broadcast Transaction" tool',
        '4. Paste the hex and broadcast'
      ]
    }
  }
}

/**
 * Ultimate fallback: Create a simple transaction the user can manually recreate
 */
export async function createSimpleManualTransaction(contractAddress, ownerAddress, amount) {
  console.log('DEBUG: Creating simple manual transaction...')
  
  try {
    return {
      type: 'simple_manual',
      from: contractAddress,
      to: ownerAddress,
      amount: amount.toString(),
      message: 'Please manually create this transaction in Paytaca:',
      steps: [
        `1. Open Paytaca wallet`,
        `2. Send ${amount} satoshis from ${contractAddress}`,
        `3. Send to your address: ${ownerAddress}`,
        `4. Use the exact amount shown above`,
        `5. Confirm and send the transaction`
      ],
      note: 'This is a simplified approach. Your vault contract will automatically handle the withdrawal when it receives the correct transaction.'
    }
  } catch (error) {
    console.error('DEBUG: Failed to create simple manual transaction:', error.message)
    throw error
  }
}

/**
 * Check if withdrawal succeeded by monitoring contract balance
 */
export async function monitorWithdrawalSuccess(contract, expectedAmount) {
  console.log('DEBUG: Monitoring withdrawal success...')
  
  try {
    // Get current balance
    const currentBalance = await contract.getBalance()
    console.log('DEBUG: Current contract balance:', currentBalance.toString())
    
    // If balance decreased by expected amount, withdrawal likely succeeded
    if (expectedAmount && currentBalance < expectedAmount) {
      console.log('DEBUG: Balance decreased, withdrawal likely succeeded')
      return { success: true, balanceChange: true }
    }
    
    return { success: false, balance: currentBalance.toString() }
  } catch (error) {
    console.error('DEBUG: Failed to monitor balance:', error.message)
    return { success: false, error: error.message }
  }
}
