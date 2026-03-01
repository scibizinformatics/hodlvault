/**
* WalletConnect Boot File (v2.1.0)
 * Real Paytaca connectivity via WalletConnect v2 Sign Client + Modal.
 * Using Paytaca-compatible chain IDs: bch:bchtest (testnet) and bch:bitcoincash (mainnet).
 * Reference: https://github.com/mainnet-pat/wc2-bch-bcr
 */

import { boot } from 'quasar/wrappers'
import SignClient from '@walletconnect/sign-client'
import { WalletConnectModal } from '@walletconnect/modal'
import { base64ToBin, binToHex, hexToBin, secp256k1, sha256 } from '@bitauth/libauth'

// Paytaca/WalletConnect v2 BCH chain IDs (wc2-bch-bcr spec)
// bch:bchtest = testnet3, bch:chipnet = chipnet, bch:bitcoincash = mainnet, bch:bchreg = regtest
const BCH_TESTNET_CHAIN = 'bch:bchtest'
const BCH_CHIPNET_CHAIN = 'bch:chipnet'
const BCH_MAINNET_CHAIN = 'bch:bitcoincash'

/** BCH config for WalletConnect v2 (matches wc2-bch-bcr spec for Paytaca compatibility) */
const REQUIRED_METHODS = ['bch_getAddresses', 'bch_signTransaction', 'bch_signMessage']

const REQUIRED_NAMESPACES = {
  bch: {
    chains: [BCH_TESTNET_CHAIN, BCH_CHIPNET_CHAIN, BCH_MAINNET_CHAIN],
    methods: REQUIRED_METHODS,
    events: ['addressesChanged'],
  },
}

// Optional namespaces for wallets that support additional BCH methods
const OPTIONAL_NAMESPACES = {
  bch: {
    chains: [BCH_TESTNET_CHAIN, BCH_CHIPNET_CHAIN, BCH_MAINNET_CHAIN],
    methods: REQUIRED_METHODS,
    events: ['addressesChanged'],
  },
}

const MODAL_METADATA = {
  name: 'BCH Hodl Vault',
  description: 'HodlVault – lock BCH until price target',
  url: typeof window !== 'undefined' ? window.location.origin : '',
  icons: ['https://quasar.dev/img/icons/favicon-192x192.png'],
}

const PROJECT_ID = typeof import.meta !== 'undefined' && import.meta.env?.VITE_WALLETCONNECT_PROJECT_ID
  ? import.meta.env.VITE_WALLETCONNECT_PROJECT_ID
  : 'YOUR_REOWN_PROJECT_ID'

// Validate PROJECT_ID on init
if (PROJECT_ID === 'YOUR_REOWN_PROJECT_ID') {
  console.warn(
    '⚠️ WalletConnect PROJECT_ID not set! Set VITE_WALLETCONNECT_PROJECT_ID in .env or get one from https://cloud.reown.com'
  )
}

let signClient = null
let modal = null
let currentSession = null

const BITCOIN_SIGNED_MESSAGE_PREFIX = (() => {
  const encoder = new TextEncoder()
  const text = encoder.encode('Bitcoin Signed Message:\n')
  const out = new Uint8Array(1 + text.length)
  out[0] = 0x18
  out.set(text, 1)
  return out
})()

function encodeBitcoinVarInt(n) {
  if (n < 0xfd) return Uint8Array.from([n])
  if (n <= 0xffff) return Uint8Array.from([0xfd, n & 0xff, (n >>> 8) & 0xff])
  if (n <= 0xffffffff) {
    return Uint8Array.from([
      0xfe,
      n & 0xff,
      (n >>> 8) & 0xff,
      (n >>> 16) & 0xff,
      (n >>> 24) & 0xff,
    ])
  }
  throw new Error('Message too long')
}

function concatBytes(...parts) {
  const total = parts.reduce((sum, p) => sum + p.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const p of parts) {
    out.set(p, offset)
    offset += p.length
  }
  return out
}

function hash256(payload) {
  return sha256.hash(sha256.hash(payload))
}

function hashBitcoinSignedMessage(message) {
  const encoder = new TextEncoder()
  const msg = encoder.encode(message)
  const preimage = concatBytes(
    BITCOIN_SIGNED_MESSAGE_PREFIX,
    encodeBitcoinVarInt(msg.length),
    msg
  )
  return hash256(preimage)
}

function isHexString(value) {
  return typeof value === 'string' && /^[0-9a-fA-F]+$/.test(value)
}

function tryExtractCompactSignature(buffer) {
  if (buffer.length === 65 && buffer[0] >= 27 && buffer[0] <= 35) {
    return buffer
  }
  for (let i = 0; i <= buffer.length - 65; i++) {
    const header = buffer[i]
    if (header >= 27 && header <= 35) {
      return buffer.slice(i, i + 65)
    }
  }
  return null
}

export async function recoverPublicKey(store) {
  if (!store) throw new Error('Vuex store not available')

  const client = await getSignClient()
  if (!currentSession?.topic) {
    throw new Error('Wallet not connected. Connect Paytaca first.')
  }

  const chainId = currentSession.namespaces?.bch?.chains?.[0] ?? BCH_CHIPNET_CHAIN
  const message = 'Login to HodlVault'

  const signatureResponse = await client.request({
    chainId,
    topic: currentSession.topic,
    request: { method: 'bch_signMessage', params: { message, userPrompt: message } },
  })

  console.log('Raw Paytaca Signature:', signatureResponse)

  if (!signatureResponse) {
    throw new Error('Wallet did not return a message signature')
  }

  const rawString = typeof signatureResponse === 'string'
    ? signatureResponse.trim()
    : JSON.stringify(signatureResponse)

  let decoded = base64ToBin(rawString)
  let sigWithHeader = tryExtractCompactSignature(decoded)

  if (!sigWithHeader && isHexString(rawString) && rawString.length % 2 === 0) {
    const hexDecoded = hexToBin(rawString)
    sigWithHeader = tryExtractCompactSignature(hexDecoded)
  }

  if (!sigWithHeader) {
    throw new Error(`Unable to locate compact signature in payload (decoded length: ${decoded.length})`)
  }

  const header = sigWithHeader[0]
  if (header < 27 || header > 35) {
    throw new Error(`Unexpected signature header: ${header}`)
  }

  let recoveryId = header - 27
  const compressed = recoveryId >= 4
  if (compressed) recoveryId -= 4

  const compactSig = sigWithHeader.slice(1) // 64 bytes: r||s
  const messageHash = hashBitcoinSignedMessage(message)

  let pubKey = compressed
    ? secp256k1.recoverPublicKeyCompressed(compactSig, recoveryId, messageHash)
    : secp256k1.recoverPublicKeyUncompressed(compactSig, recoveryId, messageHash)

  if (typeof pubKey === 'string') throw new Error(pubKey)

  if (!compressed) {
    const compressedPub = secp256k1.compressPublicKey(pubKey)
    if (typeof compressedPub === 'string') throw new Error(compressedPub)
    pubKey = compressedPub
  }

  if (!secp256k1.validatePublicKey(pubKey)) {
    throw new Error('Recovered public key is invalid')
  }

  const publicKeyHex = binToHex(pubKey)
  store.commit('wallet/SET_PUBLIC_KEY', publicKeyHex)
  return publicKeyHex
}

async function getSignClient() {
  if (signClient) return signClient
  signClient = await SignClient.init({
    projectId: PROJECT_ID,
    metadata: MODAL_METADATA,
  })
  return signClient
}

function getModal() {
  if (modal) return modal
  // Modal chains must match namespace chains for Paytaca compatibility
  modal = new WalletConnectModal({
    projectId: PROJECT_ID,
    chains: [BCH_TESTNET_CHAIN, BCH_CHIPNET_CHAIN, BCH_MAINNET_CHAIN],
    themeMode: 'light',
    themeVariables: { '--wcm-z-index': '9999' },
  })
  return modal
}

export function initializeWalletConnect(store) {
  return {
    async connect() {
      if (!store) return null
      const timeoutMs = 10000
      const connectFlow = async () => {
        const client = await getSignClient()

        const existingSessions = client.session.getAll()
        const bchSession = existingSessions.find(
          (s) => s.namespaces?.bch?.accounts?.length
        )
        if (bchSession) {
          const methods = bchSession.namespaces?.bch?.methods ?? []
          const hasRequiredMethods = REQUIRED_METHODS.every((m) => methods.includes(m))
          if (!hasRequiredMethods) {
            try {
              await client.disconnect({ topic: bchSession.topic })
            } catch {
              // ignore disconnect errors for stale sessions
            }
          } else {
            currentSession = bchSession
            await syncSessionToStore(store, client, bchSession)
            return store.state.wallet?.address ?? null
          }
        }

        // Delete old pairings to prevent "Old Session" conflicts
        try {
          const pairings = client.core?.pairing?.getPairings?.() ?? []
          for (const p of pairings) {
            if (p?.topic) {
              await client.core.pairing.disconnect({ topic: p.topic }).catch(() => { /* skip per-pairing errors */ })
            }
          }
        } catch {
          // ignore if pairing API unavailable
        }

        // Use requiredNamespaces as per wc2-bch-bcr spec (Paytaca expects this format)
        const { uri, approval } = await client.connect({
          requiredNamespaces: REQUIRED_NAMESPACES,
          optionalNamespaces: OPTIONAL_NAMESPACES,
        })

        const wcModal = getModal()
        if (uri) {
          await wcModal.openModal({ uri })
        }

        const session = await approval()
        if (wcModal && typeof wcModal.closeModal === 'function') wcModal.closeModal()
        currentSession = session

        await syncSessionToStore(store, client, session)
        return store.state.wallet?.address ?? null
      }

      try {
        const result = await Promise.race([
          connectFlow(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('WalletConnect connection timed out. Please try again.')),
              timeoutMs
            )
          ),
        ])
        return result
      } catch (err) {
        const m = getModal()
        if (m && typeof m.closeModal === 'function') m.closeModal()
        try {
          await this.disconnect()
        } catch {
          // ignore disconnect errors during recovery
        }
        // Enhanced error logging for debugging
        console.error('WalletConnect connection error:', {
          message: err?.message,
          code: err?.code,
          data: err?.data,
          stack: err?.stack,
        })
        throw err
      }
    },

    async disconnect() {
      if (signClient && currentSession?.topic) {
        try {
          await signClient.disconnect({ topic: currentSession.topic })
        } catch (e) {
          // ignore disconnection errors
          console.debug('WalletConnect disconnect ignored:', e)
        }
      }
      if (store) store.commit('wallet/CLEAR_WALLET')
      currentSession = null
    },

    isConnected() {
      return !!store?.state?.wallet?.address
    },

    getAddress() {
      return store?.state?.wallet?.address ?? null
    },

    getSignatureTemplate() {
      return null
    },

    getOwnerPublicKeyHex() {
      return store?.state?.wallet?.publicKey ?? null
    },

    getSessionTopic() {
      return currentSession?.topic ?? null
    },

    getChainId() {
      return currentSession?.namespaces?.bch?.chains?.[0] ?? null
    },

    async request(method, params) {
      const client = await getSignClient()
      if (!currentSession?.topic) {
        throw new Error('Wallet not connected. Connect Paytaca first.')
      }
      const chainId = currentSession.namespaces?.bch?.chains?.[0] ?? BCH_CHIPNET_CHAIN
      return await client.request({
        chainId,
        topic: currentSession.topic,
        request: { method, params },
      })
    },

    async recoverPublicKey() {
      return await recoverPublicKey(store)
    },
  }
}

async function syncSessionToStore(store, client, session) {
  const chainId = session.namespaces?.bch?.chains?.[0] ?? BCH_TESTNET_CHAIN
  try {
    const addresses = await client.request({
      chainId,
      topic: session.topic,
      request: { method: 'bch_getAddresses', params: {} },
    })
    const address = Array.isArray(addresses) && addresses.length
      ? addresses[0]
      : null
    
    // Try to extract public key from session accounts or request it
    let publicKey = null
    try {
      // Check if public key is in session accounts (format: "bch:chainId:address" or similar)
      const accounts = session.namespaces?.bch?.accounts ?? []
      // Some wallets provide public key in account metadata
      if (accounts.length > 0 && accounts[0].includes(':')) {
        // Account format might contain public key info, but typically we need to request it
        // Paytaca may provide it via a separate method or in session metadata
      }
      
      // Try requesting public key if Paytaca supports it (some wallets do)
      // Note: This is optional - if not supported, we'll proceed with address only
      try {
        const pubKeyResult = await client.request({
          chainId,
          topic: session.topic,
          request: { method: 'bch_getPublicKey', params: {} },
        })
        if (pubKeyResult && typeof pubKeyResult === 'string') {
          publicKey = pubKeyResult
        }
      } catch {
        // Method not supported - that's okay, we'll work with address only
      }
    } catch {
      // Public key extraction failed - continue with address only
    }
    
    if (address) {
      store.commit('wallet/SET_WALLET', {
        address,
        publicKey,
        privateKey: null,
      })
    }
  } catch (e) {
    console.warn('WalletConnect: could not get addresses', e)
  }
}

async function restoreSessionIfAny(store) {
  if (!store) return
  try {
    const client = await getSignClient()
    const sessions = client.session.getAll()
    const bchSession = sessions.find((s) => s.namespaces?.bch?.accounts?.length)
    if (bchSession) {
      currentSession = bchSession
      await syncSessionToStore(store, client, bchSession)
    }
  } catch (e) {
    // ignore session restore errors
    console.debug('WalletConnect session restore failed:', e)
  }
}

export default boot(({ app }) => {
  const store = app.config.globalProperties.$store
  if (!store) {
    console.warn('WalletConnect boot: Vuex store not available yet')
  }
  const wc = initializeWalletConnect(store)
  app.config.globalProperties.$walletConnect = wc
  app.provide('walletConnect', wc)
  restoreSessionIfAny(store)
})