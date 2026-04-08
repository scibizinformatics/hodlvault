/**
 * Shared TypeScript interfaces and utilities for HodlVault
 * Used by both frontend and backend to ensure type safety
 */

import { binToHex } from '@bitauth/libauth'

// Constants
export const ORACLE_PUBKEY = '02d09db08af1ff4e8453919cc866a4be427d7bfe18f2c05e5444c196fcf6fd2818' // USD/BCH Oracle

// Interfaces
export interface OracleData {
  price: number
  blockheight: number
  network: 'mainnet' | 'testnet3' | 'chipnet'
}

export interface SignatureResponse {
  success: boolean
  data: {
    oracleMessage: string
    signature: string
    oraclePubkey: string
  }
}

export interface Vault {
  contractAddress: string
  ownerAddress: string
  priceTarget: number
  currentBalance: number
  isActive: boolean
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Utilities
export function serializeForWc(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'bigint') return obj.toString()
  if (obj instanceof Uint8Array) return binToHex(obj)
  if (Array.isArray(obj)) return obj.map(serializeForWc)
  if (typeof obj === 'object' && obj !== null) {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(obj)) out[k] = serializeForWc(obj[k])
    return out
  }
  return obj
}

export function inferNetworkFromAddress(address: string): 'mainnet' | 'testnet3' | 'chipnet' {
  if (typeof address !== 'string') return 'chipnet'
  const prefix = address.includes(':') ? address.split(':')[0] : null
  if (prefix === 'bitcoincash') return 'mainnet'
  if (prefix === 'bchtest') return 'chipnet' // Default to chipnet for bchtest
  if (prefix === 'chipnet') return 'chipnet'
  return 'chipnet'
}

// Re-export bitauth utilities for convenience
export { binToHex, hexToBin } from '@bitauth/libauth'
