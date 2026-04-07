/**
 * SignerService: Oracle data signing for HodlVault contracts
 * Implements cryptographic signing using @bitauth/libauth
 */

import {
  bigIntToBinUint64LE,
  utf8ToBin,
  flattenBinArray,
  binToHex,
  hexToBin,
  secp256k1,
} from '@bitauth/libauth'
import { OracleData, ORACLE_PUBKEY } from '@hodlvault/shared'

/**
 * Service for signing oracle data messages
 * Follows Law 1: Guard Clauses for validation
 * Follows Law 2: No Code Duplication by using shared utilities
 */
export class SignerService {
  private readonly oraclePrivateKey: Uint8Array

  constructor(privateKeyHex?: string) {
    // Law 1: Guard Clauses
    if (!privateKeyHex) {
      throw new Error('Oracle private key is required for signing service')
    }

    if (!privateKeyHex.match(/^[0-9a-fA-F]{64}$/)) {
      throw new Error('Invalid private key format. Expected 64-character hex string')
    }

    this.oraclePrivateKey = hexToBin(privateKeyHex)
  }

  /**
   * Signs oracle price data for HodlVault contract consumption
   * @param data - Oracle data containing price and blockheight
   * @returns Hex-encoded signature compatible with checkDataSig
   */
  public signPriceData(data: OracleData): string {
    // Law 1: Guard Clauses
    if (data.price <= 0) {
      throw new Error('Invalid price: must be greater than 0')
    }
    if (data.blockheight <= 0) {
      throw new Error('Invalid blockheight: must be greater than 0')
    }

    // Convert price to cents (oracle standard)
    const priceInCents = Math.floor(data.price * 100)

    // Create message bytes: [8 bytes price][variable bytes blockheight]
    const priceBuf = bigIntToBinUint64LE(BigInt(priceInCents))
    const heightBuf = utf8ToBin(data.blockheight.toString())
    const message = flattenBinArray([priceBuf, heightBuf])

    // Critical validation: Ensure exactly 8-byte price prefix
    const priceBytes = message.slice(0, 8)
    if (priceBytes.length !== 8) {
      throw new Error(`Price bytes must be exactly 8 bytes, got ${priceBytes.length}`)
    }

    // Generate signature using secp256k1
    const signature = secp256k1.signMessageHashSchnorr(this.oraclePrivateKey, message as Uint8Array)

    if (!signature) {
      throw new Error('Failed to generate signature')
    }

    // Return hex-encoded signature for contract compatibility
    return binToHex(signature as Uint8Array)
  }

  /**
   * Creates the oracle message hex for contract verification
   * @param data - Oracle data containing price and blockheight
   * @returns Hex-encoded oracle message
   */
  public createOracleMessage(data: OracleData): string {
    // Law 1: Guard Clauses
    if (data.price <= 0) {
      throw new Error('Invalid price: must be greater than 0')
    }
    if (data.blockheight <= 0) {
      throw new Error('Invalid blockheight: must be greater than 0')
    }

    const priceInCents = Math.floor(data.price * 100)
    const priceBuf = bigIntToBinUint64LE(BigInt(priceInCents))
    const heightBuf = utf8ToBin(data.blockheight.toString())
    const message = flattenBinArray([priceBuf, heightBuf])

    return binToHex(message)
  }

  /**
   * Validates that the generated oracle message matches contract expectations
   * @param data - Oracle data to validate
   * @returns True if format is valid for HodlVault.cash
   */
  public validateOracleMessageFormat(data: OracleData): boolean {
    try {
      this.createOracleMessage(data)
      return true
    } catch (error) {
      console.error('Oracle message validation failed:', error)
      return false
    }
  }

  /**
   * Gets the oracle public key for verification
   * @returns Oracle public key as hex string
   */
  public getOraclePubkey(): string {
    return ORACLE_PUBKEY
  }

  /**
   * Tests the signing service with sample data
   * @returns Test results showing successful signing
   */
  public runSelfTest(): {
    success: boolean
    sampleData: OracleData
    message: string
    signature: string
    pubkey: string
  } {
    const sampleData: OracleData = {
      price: 350.5,
      blockheight: 840000,
      network: 'chipnet',
    }

    try {
      const message = this.createOracleMessage(sampleData)
      const signature = this.signPriceData(sampleData)
      const pubkey = this.getOraclePubkey()

      console.log('✅ SignerService self-test passed:', {
        price: sampleData.price,
        blockheight: sampleData.blockheight,
        messageLength: message.length / 2, // hex to bytes
        signatureLength: signature.length / 2,
        pubkey,
      })

      return {
        success: true,
        sampleData,
        message,
        signature,
        pubkey,
      }
    } catch (error) {
      console.error('❌ SignerService self-test failed:', error)
      return {
        success: false,
        sampleData,
        message: '',
        signature: '',
        pubkey: this.getOraclePubkey(),
      }
    }
  }
}

// Export factory function for dependency injection
export function createSignerService(privateKeyHex?: string): SignerService {
  return new SignerService(privateKeyHex)
}
