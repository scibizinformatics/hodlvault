/**
 * Simple withdrawal - send vault balance back to original funding address
 */

import { hexToBin, binToHex } from '@bitauth/libauth'

/**
 * Serialize object for JSON RPC (BigInt → string, Uint8Array → hex)
 */
function serializeForWc(obj) {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'bigint') return obj.toString()
  if (obj instanceof Uint8Array) return binToHex(obj)
  if (Array.isArray(obj)) return obj.map(serializeForWc)
  if (typeof obj === 'object') {
    const out = {}
    for (const k of Object.keys(obj)) out[k] = serializeForWc(obj[k])
    return out
  }
  return obj
}

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

    const minerFee = 1000n
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

    // Use placeholder signature for WalletConnect (like blockchain.js does)
    // IMPORTANT: Paytaca needs SIGHASH_ALL | SIGHASH_UTXOS (0x41) for covenant contracts
    const placeholderSig = {
      signature: new Uint8Array(65), // 65-byte placeholder signature
      sighashType: 0x41, // SIGHASH_ALL | SIGHASH_UTXOS for covenant compatibility
    }
    const placeholderPk = hexToBin(ownerPkHex || '00'.repeat(33))

    // Build the transaction
    const txBuilder = new TransactionBuilder({ provider })
      .addInput(
        utxo,
        contract.unlock.spend(
          placeholderPk, // placeholder public key
          placeholderSig, // placeholder signature
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

    // Serialize payload to handle BigInt values
    const serializedPayload = serializeForWc({
      transaction: transactionHex,
      sourceOutputs: wcPayload.sourceOutputs,
      broadcast: true, // Let wallet broadcast
      userPrompt: 'Withdraw vault funds to your wallet',
    })

    // Simple signing request
    const result = await walletConnectRequest('bch_signTransaction', serializedPayload)

    console.log('Withdrawal result:', result)
    return result
  } catch (error) {
    console.error('Simple withdrawal failed:', error)
    throw error
  }
}
