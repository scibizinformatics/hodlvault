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
        error: 'Vault has no balance to withdraw',
      }
    }

    const utxo = utxos.reduce((best, current) =>
      current.satoshis > best.satoshis ? current : best,
    )

    // ✅ Validate: Check if balance is sufficient for fee
    if (utxo.satoshis <= minerFee) {
      console.error('❌ Balance too low to cover miner fee')
      return {
        success: false,
        error: `Balance (${utxo.satoshis} sats) is too low to cover miner fee (${minerFee} sats)`,
      }
    }

    const amount = utxo.satoshis - minerFee
    const oracleSigBin = hexToBin(oracleSigHex)
    const txHex = await contract.functions
      .spend(hexToBin(oracleMessageHex), oracleSigBin)
      .to([{ to: ownerAddress, amount: amount }])
      .withHardcodedFee(minerFee)
      .send()

    console.log('Built transaction hex:', txHex)

    // ✅ Return success with transaction details
    return {
      success: true,
      txHex,
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
