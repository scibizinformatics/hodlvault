/**
 * Simple withdrawal - send vault balance back to original funding address
 */

import { hexToBin } from '@bitauth/libauth'

/**
 * Simple withdrawal - just send vault balance back to original funding address
 */
export async function simpleWithdrawal(
  contract,
  ownerAddress,
  oracleMessageHex,
  oracleSigHex,
  ownerPkHex,
  walletConnectRequest,
) {
  const { TransactionBuilder } = await import('cashscript')
  const provider = contract.provider

  try {
    const utxos = await contract.getUtxos()
    if (!utxos.length) {
      throw new Error('No funds available in vault')
    }

    // Use the largest UTXO
    const utxo = utxos.reduce((best, current) =>
      current.satoshis > best.satoshis ? current : best,
    )

    const minerFee = 400n
    const amount = utxo.satoshis - minerFee

    if (amount <= 0n) {
      throw new Error('Insufficient balance for fee')
    }

    console.log('Simple withdrawal:', {
      from: contract.address,
      to: ownerAddress,
      amount: amount.toString(),
      utxo: utxo.satoshis.toString(),
    })

    const oracleMessage = hexToBin(oracleMessageHex)
    const oracleSig = hexToBin(oracleSigHex)

    // Create proper signature template for WalletConnect
    const ownerSigTemplate = {
      signature: new Uint8Array(64), // Placeholder 64-byte signature
      publicKey: hexToBin(ownerPkHex || '00'.repeat(33)),
    }

    // Build the transaction
    const txBuilder = new TransactionBuilder({ provider })
      .addInput(
        utxo,
        contract.unlock.spend(
          hexToBin(ownerPkHex || '00'.repeat(33)), // owner public key
          ownerSigTemplate, // proper signature template
          oracleMessage,
          oracleSig,
        ),
      )
      .addOutput({ to: ownerAddress, amount })
      .setLocktime(0)

    // Use WalletConnect to sign
    const wcPayload = txBuilder.generateWcTransactionObject({
      broadcast: false,
      userPrompt: 'Withdraw vault funds',
    })

    const transactionHex =
      typeof wcPayload.transaction === 'string' ? wcPayload.transaction : txBuilder.build()

    // Simple signing request
    const result = await walletConnectRequest('bch_signTransaction', {
      transaction: transactionHex,
      sourceOutputs: wcPayload.sourceOutputs,
      broadcast: true, // Let wallet broadcast
      userPrompt: 'Withdraw vault funds to your wallet',
    })

    console.log('Withdrawal result:', result)
    return result
  } catch (error) {
    console.error('Simple withdrawal failed:', error)
    throw error
  }
}
