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
    const balance = await contract.getBalance()
    console.log('balance:', balance)

    const amount = balance - minerFee
    console.log('amount:', amount)
    const oracleSigBin = hexToBin(oracleSigHex)
    const txHex = await contract.functions
      .spend(hexToBin(oracleMessageHex), oracleSigBin)
      .to([{ to: ownerAddress, amount: amount }])
      .withHardcodedFee(minerFee)
      .send()

    console.log('Built transaction hex:', txHex)
  } catch (error) {
    console.error('Error building transaction:', error)
    return
  }
}
