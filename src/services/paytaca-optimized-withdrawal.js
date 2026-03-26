/**
 * Paytaca-Optimized Withdrawal Service
 * Addresses Paytaca-specific issues with covenant contracts
 */
import { hexToBin } from '@bitauth/libauth'
import { placeholderSignature } from 'cashscript'
// import { hexToBin } from '@bitauth/libauth'

/**
 * Serialize object for JSON RPC (BigInt → string, Uint8Array → hex)
 */
// function serializeForWc(obj) {
//   if (obj === null || obj === undefined) return obj
//   if (typeof obj === 'bigint') return obj.toString()
//   if (obj instanceof Uint8Array) return binToHex(obj)
//   if (Array.isArray(obj)) return obj.map(serializeForWc)
//   if (typeof obj === 'object') {
//     const out = {}
//     for (const k of Object.keys(obj)) out[k] = serializeForWc(obj[k])
//     return out
//   }
//   return obj
// }

/**
 * Paytaca-optimized withdrawal with multiple fallback strategies
 */
export async function paytacaOptimizedWithdrawal(
  contract,
  ownerAddress,
  oracleMessageHex,
  oracleSigHex,
  ownerPkHex,
  walletConnectRequest,
) {
  console.log('oraclemessage:', oracleMessageHex)
  console.log('ownerPkHex:', ownerPkHex)
  console.log('walletConnectRequest:', walletConnectRequest)
  console.log('contract:', contract)
  try {
    const minerFee = 1000n
    const utxos = await contract.getUtxos()
    console.log('UTXOs available for withdrawal:', utxos)
    const utxo = utxos.reduce((best, current) =>
      current.satoshis > best.satoshis ? current : best,
    )
    const amount = utxo.satoshis - minerFee
    const oracleSigBin = hexToBin(oracleSigHex)
    const txHex = await contract.functions
      .spend(
        ownerPkHex,
        placeholderSignature(), // you probably need wallet connect for this signature
        hexToBin(oracleMessageHex),
        oracleSigBin,
      )
      .to({ to: ownerAddress, amount: amount })
      .withHardcodedFee(minerFee)
      .build()

    console.log('Built transaction hex:', txHex)
  } catch (error) {
    console.error('Error building transaction:', error)
    return
  }

  // const { TransactionBuilder } = await import('cashscript')
  // const provider = contract.provider

  // try {
  //   const utxos = await contract.getUtxos()
  //   if (!utxos.length) {
  //     throw new Error('No funds available in vault')
  //   }

  //   // Use the largest UTXO
  //   const utxo = utxos.reduce((best, current) =>
  //     current.satoshis > best.satoshis ? current : best,
  //   )

  //   const minerFee = 1000n
  //   const amount = utxo.satoshis - minerFee

  //   if (amount <= 0n) {
  //     throw new Error('Insufficient balance for fee')
  //   }

  //   console.log('Paytaca optimized withdrawal:', {
  //     from: contract.address,
  //     to: ownerAddress,
  //     amount: amount.toString(),
  //     utxo: utxo.satoshis.toString(),
  //   })

  //   const oracleMessage = hexToBin(oracleMessageHex)
  //   const oracleSig = hexToBin(oracleSigHex)

  //   let strategy1Error, strategy2Error, strategy3Error

  //   // STRATEGY 1: Standard covenant approach with SIGHASH_UTXOS
  //   try {
  //     console.log('Trying strategy 1: Standard covenant with SIGHASH_UTXOS...')

  //     const placeholderSig = {
  //       signature: new Uint8Array(65),
  //       sighashType: 0x41, // SIGHASH_ALL | SIGHASH_UTXOS for covenant compatibility
  //     }
  //     const placeholderPk = hexToBin(ownerPkHex || '00'.repeat(33))

  //     const txBuilder = new TransactionBuilder({ provider })
  //       .addInput(
  //         utxo,
  //         contract.unlock.spend(placeholderPk, placeholderSig, oracleMessage, oracleSig),
  //       )
  //       .addOutput({ to: ownerAddress, amount })
  //       .setLocktime(0)

  //     const wcPayload = txBuilder.generateWcTransactionObject({
  //       broadcast: false,
  //       userPrompt: 'Withdraw vault funds (Covenant)',
  //     })

  //     const transactionHex =
  //       typeof wcPayload.transaction === 'string' ? wcPayload.transaction : txBuilder.build()

  //     const serializedPayload = serializeForWc({
  //       transaction: transactionHex,
  //       sourceOutputs: wcPayload.sourceOutputs,
  //       broadcast: false, // Let Paytaca handle broadcasting
  //       userPrompt: 'Withdraw vault funds (Covenant)',
  //     })

  //     const result = await walletConnectRequest('bch_signTransaction', serializedPayload)
  //     console.log('Strategy 1 success:', result)
  //     return result
  //   } catch (error) {
  //     strategy1Error = error
  //     console.warn('Strategy 1 failed:', error.message)
  //   }

  //   // STRATEGY 2: Simplified transaction without covenant hints
  //   try {
  //     console.log('Trying strategy 2: Simplified transaction...')

  //     const placeholderSig = {
  //       signature: new Uint8Array(65),
  //       sighashType: 0x01, // Try standard SIGHASH_ALL
  //     }
  //     const placeholderPk = hexToBin(ownerPkHex || '00'.repeat(33))

  //     const txBuilder = new TransactionBuilder({ provider })
  //       .addInput(
  //         utxo,
  //         contract.unlock.spend(placeholderPk, placeholderSig, oracleMessage, oracleSig),
  //       )
  //       .addOutput({ to: ownerAddress, amount })
  //       .setLocktime(0)

  //     const wcPayload = txBuilder.generateWcTransactionObject({
  //       broadcast: false,
  //       userPrompt: 'Withdraw vault funds (Standard)',
  //     })

  //     const transactionHex =
  //       typeof wcPayload.transaction === 'string' ? wcPayload.transaction : txBuilder.build()

  //     const serializedPayload = serializeForWc({
  //       transaction: transactionHex,
  //       sourceOutputs: wcPayload.sourceOutputs,
  //       broadcast: true, // Auto-broadcast
  //       userPrompt: 'Withdraw vault funds (Standard)',
  //     })

  //     const result = await walletConnectRequest('bch_sendTransaction', serializedPayload)
  //     console.log('Strategy 2 success:', result)
  //     return result
  //   } catch (error) {
  //     strategy2Error = error
  //     console.warn('Strategy 2 failed:', error.message)
  //   }

  //   // STRATEGY 3: Manual transaction construction
  //   try {
  //     console.log('Trying strategy 3: Manual transaction construction...')

  //     // Create minimal transaction object
  //     const manualPayload = {
  //       transaction: {
  //         version: 2,
  //         locktime: 0,
  //         inputs: [
  //           {
  //             txid: utxo.txid,
  //             vout: utxo.vout,
  //             script: '', // Empty script for wallet to fill
  //             sequence: 0xffffffff,
  //             value: utxo.satoshis.toString(),
  //           },
  //         ],
  //         outputs: [
  //           {
  //             address: ownerAddress,
  //             value: amount.toString(),
  //           },
  //         ],
  //       },
  //       sourceOutputs: [
  //         {
  //           txid: utxo.txid,
  //           vout: utxo.vout,
  //           script: binToHex(utxo.script),
  //           value: utxo.satoshis.toString(),
  //         },
  //       ],
  //       broadcast: true,
  //       userPrompt: 'Withdraw vault funds (Manual)',
  //     }

  //     const result = await walletConnectRequest('bch_sendTransaction', manualPayload)
  //     console.log('Strategy 3 success:', result)
  //     return result
  //   } catch (error) {
  //     strategy3Error = error
  //     console.warn('Strategy 3 failed:', error.message)
  //   }

  //   // All strategies failed
  //   const lastError = strategy1Error || strategy2Error || strategy3Error
  //   throw new Error(`All Paytaca strategies failed. Last error: ${lastError?.message || 'Unknown'}`)
  // } catch (error) {
  //   console.error('Paytaca optimized withdrawal failed:', error)
  //   throw error
  // }
}
