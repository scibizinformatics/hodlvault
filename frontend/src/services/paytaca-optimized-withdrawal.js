/**
 * Paytaca-Optimized Withdrawal Service
 * Addresses Paytaca-specific issues with covenant contracts
 */
import { hexToBin } from '@bitauth/libauth'
// import { hexToBin } from '@bitauth/libauth'

export async function paytacaOptimizedWithdrawal(
  contract,
  ownerAddress,
  oracleMessageHex,
  oracleSigHex,
) {
  console.log('oraclemessage:', oracleMessageHex)
  console.log('contract:', contract)
  try {
    const minerFee = 1000n
    const utxos = await contract.getUtxos()
    console.log('utxos:', utxos)
    console.log('utxos length:', utxos.length)

    // ✅ Validate: Check if there are any UTXOs
    if (!utxos || utxos.length === 0) {
      console.error('❌ No UTXOs found - vault has no balance')
      return {
        success: false,
        error: 'Vault has no balance to withdraw - it may have been auto-withdrawn already',
      }
    }

    // ✅ Support multiple deposits: combine ALL UTXOs
    const totalSatoshis = utxos.reduce((sum, u) => sum + BigInt(u.satoshis), 0n)
    console.log(`💰 Total balance from ${utxos.length} UTXO(s): ${totalSatoshis} sats`)

    // ✅ Validate: Check if total balance is sufficient for fee
    if (totalSatoshis <= minerFee) {
      console.error('❌ Total balance too low to cover miner fee')
      return {
        success: false,
        error: `Total balance (${totalSatoshis} sats) is too low to cover miner fee (${minerFee} sats)`,
      }
    }

    const amount = totalSatoshis - minerFee
    const oracleSigBin = hexToBin(oracleSigHex)

    // ✅ Build transaction with ALL UTXOs as inputs (combines multiple deposits)
    const txHex = await contract.functions
      .spend(hexToBin(oracleMessageHex), oracleSigBin)
      .from(utxos)
      .to([{ to: ownerAddress, amount: amount }])
      .withHardcodedFee(minerFee)
      .send()

    console.log('Built transaction hex:', txHex)

    // Extract txHash from CashScript response (could be string or object)
    const txHash = txHex.txid || txHex

    // ✅ Return success with transaction details
    return {
      success: true,
      txHex,
      txHash,
      amountSatoshis: Number(amount),
    }
  } catch (error) {
    console.error('Error building transaction:', error)
    // ✅ Return failure with error message
    return {
      success: false,
      error: error.message || 'Transaction failed',
    }
  }
}
