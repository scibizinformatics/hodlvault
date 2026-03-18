/**
 * WalletConnect Boot File (v2.1.1)
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

const REQUIRED_NAMESPACES = {}

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

const PROJECT_ID =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_WALLETCONNECT_PROJECT_ID
    ? import.meta.env.VITE_WALLETCONNECT_PROJECT_ID
    : 'YOUR_REOWN_PROJECT_ID'

// Validate PROJECT_ID on init
if (PROJECT_ID === 'YOUR_REOWN_PROJECT_ID') {
  console.warn(
    '⚠️ WalletConnect PROJECT_ID not set! Set VITE_WALLETCONNECT_PROJECT_ID in .env or get one from https://cloud.reown.com',
  )
}

let signClient = null
let modal = null
let currentSession = null
let isConnecting = false // Prevent multiple simultaneous connections
let connectionPromise = null // Track ongoing connection attempts
let connectionStatusInterval = null // Periodic status checker

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
    return Uint8Array.from([0xfe, n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff])
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

// Periodic connection status checker
function startConnectionStatusChecker(store) {
  if (connectionStatusInterval) {
    clearInterval(connectionStatusInterval)
  }

  connectionStatusInterval = setInterval(async () => {
    if (currentSession && signClient) {
      try {
        // Check if session is still valid
        const sessions = signClient.session.getAll()
        const currentSessionExists = sessions.find((s) => s.topic === currentSession.topic)

        if (!currentSessionExists || currentSessionExists.expiry * 1000 < Date.now()) {
          console.log('Connection status checker: Session no longer valid, clearing state')
          currentSession = null
          if (store) {
            store.commit('wallet/CLEAR_WALLET')
          }
        }
      } catch (error) {
        console.warn('Connection status check failed:', error)
      }
    }
  }, 5000) // Check every 5 seconds
}

function stopConnectionStatusChecker() {
  if (connectionStatusInterval) {
    clearInterval(connectionStatusInterval)
    connectionStatusInterval = null
  }
}

function hash256(payload) {
  return sha256.hash(sha256.hash(payload))
}

function hashBitcoinSignedMessage(message) {
  const encoder = new TextEncoder()
  const msg = encoder.encode(message)
  const preimage = concatBytes(BITCOIN_SIGNED_MESSAGE_PREFIX, encodeBitcoinVarInt(msg.length), msg)
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

  const client = await getSignClient(store)
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

  const rawString =
    typeof signatureResponse === 'string'
      ? signatureResponse.trim()
      : JSON.stringify(signatureResponse)

  let decoded = base64ToBin(rawString)
  let sigWithHeader = tryExtractCompactSignature(decoded)

  if (!sigWithHeader && isHexString(rawString) && rawString.length % 2 === 0) {
    const hexDecoded = hexToBin(rawString)
    sigWithHeader = tryExtractCompactSignature(hexDecoded)
  }

  if (!sigWithHeader) {
    throw new Error(
      `Unable to locate compact signature in payload (decoded length: ${decoded.length})`,
    )
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

async function getSignClient(store) {
  if (signClient) return signClient
  signClient = await SignClient.init({
    projectId: PROJECT_ID,
    metadata: MODAL_METADATA,
  })

  // Add session event listeners for better state management
  signClient.on('session_event', ({ event, chainId }) => {
    console.log('WalletConnect session event:', { event, chainId })
    // Handle session events like addressesChanged
    if (event.name === 'addressesChanged' && currentSession) {
      // Refresh wallet state when addresses change
      syncSessionToStore(store, signClient, currentSession)
    }
  })

  signClient.on('session_delete', () => {
    console.log('WalletConnect session deleted - clearing wallet state')
    currentSession = null
    // Clear wallet state immediately when session is deleted externally
    if (store) {
      store.commit('wallet/CLEAR_WALLET')
    }
  })

  // Add session expire event listener
  signClient.on('session_expire', () => {
    console.log('WalletConnect session expired - clearing wallet state')
    currentSession = null
    if (store) {
      store.commit('wallet/CLEAR_WALLET')
    }
  })

  return signClient
}

function getModal() {
  if (modal) return modal
  // Enhanced modal configuration for better QR code display
  modal = new WalletConnectModal({
    projectId: PROJECT_ID,
    chains: [BCH_TESTNET_CHAIN, BCH_CHIPNET_CHAIN, BCH_MAINNET_CHAIN],
    themeMode: 'light',
    themeVariables: {
      '--wcm-z-index': '9999',
      '--wcm-background-color': '#ffffff',
      '--wcm-fallback-color': '#ffffff',
      '--wcm-accent-color': '#00d588',
      '--wcm-accent-fill-color': '#ffffff',
    },
    standaloneChains: [BCH_CHIPNET_CHAIN], // Default to chipnet
    qrModalSize: 'lg', // Larger QR code
    enableMobileWalletFocus: true, // Better mobile experience
  })
  return modal
}

// Enhanced session cleanup function
async function cleanupStaleSessions(client, store) {
  try {
    const sessions = client.session.getAll()
    const bchSessions = sessions.filter((s) => s.namespaces?.bch?.accounts?.length)

    for (const session of bchSessions) {
      try {
        // Check if session is still valid
        const methods = session.namespaces?.bch?.methods ?? []
        const hasRequiredMethods = REQUIRED_METHODS.every((m) => methods.includes(m))

        if (!hasRequiredMethods || session.expiry * 1000 < Date.now()) {
          console.log('Cleaning up stale session:', session.topic)
          await client.disconnect({ topic: session.topic })
          // Clear wallet state if this was the current session
          if (currentSession?.topic === session.topic) {
            currentSession = null
            if (store) {
              store.commit('wallet/CLEAR_WALLET')
            }
          }
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup session:', cleanupError)
      }
    }
  } catch (error) {
    console.warn('Session cleanup failed:', error)
  }
}

export function initializeWalletConnect(store) {
  // Start the connection status checker
  startConnectionStatusChecker(store)

  return {
    async connect() {
      // Prevent multiple simultaneous connections
      if (isConnecting) {
        console.log('Connection already in progress, returning existing promise')
        return connectionPromise
      }

      isConnecting = true
      connectionPromise = this._performConnection(store)

      try {
        const result = await connectionPromise
        return result
      } finally {
        isConnecting = false
        connectionPromise = null
      }
    },

    async _performConnection(store) {
      if (!store) return null

      try {
        const client = await getSignClient(store)

        // Clean up stale sessions first
        await cleanupStaleSessions(client, store)

        const existingSessions = client.session.getAll()
        const bchSession = existingSessions.find((s) => s.namespaces?.bch?.accounts?.length)
        if (bchSession) {
          const methods = bchSession.namespaces?.bch?.methods ?? []
          const hasRequiredMethods = REQUIRED_METHODS.every((m) => methods.includes(m))

          if (hasRequiredMethods && bchSession.expiry * 1000 > Date.now()) {
            currentSession = bchSession
            await syncSessionToStore(store, client, currentSession)
            return store.state.wallet?.address ?? null
          } else {
            // Disconnect invalid session
            try {
              await client.disconnect({ topic: bchSession.topic })
            } catch {
              // ignore disconnect errors for stale sessions
            }
          }
        }

        // Create new connection
        const { uri, approval } = await client.connect({
          requiredNamespaces: REQUIRED_NAMESPACES,
          optionalNamespaces: OPTIONAL_NAMESPACES,
        })

        const wcModal = getModal()

        // Enhanced QR code display with error handling
        if (uri) {
          try {
            // Add small delay to ensure modal is ready
            await new Promise((resolve) => setTimeout(resolve, 100))
            await wcModal.openModal({ uri })

            // Add timeout for QR code display
            const qrTimeout = setTimeout(() => {
              console.warn('QR code display timeout, attempting to reopen modal')
              wcModal.closeModal()
              setTimeout(() => wcModal.openModal({ uri }), 500)
            }, 5000)

            // Clear timeout when modal is closed
            const originalCloseModal = wcModal.closeModal
            wcModal.closeModal = function (...args) {
              clearTimeout(qrTimeout)
              return originalCloseModal.apply(this, args)
            }
          } catch (modalError) {
            console.error('Failed to open WalletConnect modal:', modalError)
            throw new Error('Failed to display QR code. Please try again.')
          }
        }

        const session = await approval()

        // Ensure modal is properly closed
        if (wcModal && typeof wcModal.closeModal === 'function') {
          wcModal.closeModal()
        }

        currentSession = session
        await syncSessionToStore(store, client, session)
        return store.state.wallet?.address ?? null
      } catch (err) {
        // Enhanced error handling and cleanup
        const m = getModal()
        if (m && typeof m.closeModal === 'function') {
          try {
            m.closeModal()
          } catch (closeError) {
            console.warn('Failed to close modal:', closeError)
          }
        }

        try {
          await this.disconnect()
        } catch {
          // ignore disconnect errors during recovery
        }

        // Enhanced error logging
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
      try {
        if (signClient && currentSession?.topic) {
          await signClient.disconnect({ topic: currentSession.topic })
        }
      } catch (e) {
        console.debug('WalletConnect disconnect ignored:', e)
      }

      // Clear ALL state
      currentSession = null
      isConnecting = false
      connectionPromise = null

      if (store) {
        store.commit('wallet/CLEAR_WALLET')
      }

      // Stop the connection status checker when disconnected
      stopConnectionStatusChecker()
    },

    isConnected() {
      return !!store?.state?.wallet?.address && !!currentSession?.topic
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
      const client = await getSignClient(store)
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
  const chainId = session.namespaces?.bch?.chains?.[0] ?? BCH_CHIPNET_CHAIN

  // Validate chain ID matches expected network
  console.log('DEBUG: WalletConnect session chain ID:', chainId)
  console.log('DEBUG: Expected chain IDs:', [
    BCH_CHIPNET_CHAIN,
    BCH_TESTNET_CHAIN,
    BCH_MAINNET_CHAIN,
  ])

  try {
    const addresses = await client.request({
      chainId,
      topic: session.topic,
      request: { method: 'bch_getAddresses', params: {} },
    })
    const address = Array.isArray(addresses) && addresses.length ? addresses[0] : null

    console.log('DEBUG: Retrieved wallet address:', address)

    // Try to extract public key from session accounts or request it
    let publicKey = null
    try {
      // Check if public key is in session accounts (format: "bch:chainId:address" or similar)
      const accounts = session.namespaces?.bch?.accounts ?? []
      console.log('DEBUG: Session accounts:', accounts)

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
          console.log('DEBUG: Retrieved public key from wallet')
        }
      } catch (pubKeyError) {
        console.log('DEBUG: bch_getPublicKey not supported:', pubKeyError.message)
        // Method not supported - that's okay, we'll work with address only
      }
    } catch (error) {
      console.warn('DEBUG: Public key extraction failed:', error.message)
      // Public key extraction failed - continue with address only
    }

    if (address) {
      // Validate address format matches chain ID
      const addressNetwork = inferNetworkFromAddress(address)
      const expectedNetwork = getNetworkFromChainId(chainId)

      console.log('DEBUG: Address network inference:', addressNetwork)
      console.log('DEBUG: Expected network from chain ID:', expectedNetwork)

      if (addressNetwork !== expectedNetwork) {
        console.warn('DEBUG: Network mismatch detected', {
          address,
          addressNetwork,
          expectedNetwork,
          chainId,
        })
      }

      store.commit('wallet/SET_WALLET', {
        address,
        publicKey,
        privateKey: null,
      })

      console.log('DEBUG: Wallet state updated successfully')
    } else {
      console.warn('DEBUG: No address retrieved from wallet')
    }
  } catch (e) {
    console.warn('WalletConnect: could not get addresses', e)
  }
}

function inferNetworkFromAddress(address) {
  if (typeof address !== 'string') return 'chipnet'
  const prefix = address.includes(':') ? address.split(':')[0] : null
  if (prefix === 'bitcoincash') return 'mainnet'
  if (prefix === 'bchtest') return 'chipnet' // Assume chipnet for bchtest
  if (prefix === 'chipnet') return 'chipnet'
  return 'chipnet'
}

function getNetworkFromChainId(chainId) {
  if (chainId === BCH_MAINNET_CHAIN) return 'mainnet'
  if (chainId === BCH_CHIPNET_CHAIN) return 'chipnet'
  if (chainId === BCH_TESTNET_CHAIN) return 'chipnet' // Map testnet to chipnet for our app
  return 'chipnet'
}

async function restoreSessionIfAny(store) {
  if (!store) return
  try {
    const client = await getSignClient(store)
    const sessions = client.session.getAll()
    const bchSession = sessions.find((s) => s.namespaces?.bch?.accounts?.length)

    if (bchSession && bchSession.expiry * 1000 > Date.now()) {
      // Check if session has required methods
      const methods = bchSession.namespaces?.bch?.methods ?? []
      const hasRequiredMethods = REQUIRED_METHODS.every((m) => methods.includes(m))

      if (hasRequiredMethods) {
        currentSession = bchSession
        await syncSessionToStore(store, client, bchSession)
      } else {
        // Clean up invalid session
        await client.disconnect({ topic: bchSession.topic })
      }
    } else if (bchSession) {
      // Clean up expired session
      await client.disconnect({ topic: bchSession.topic })
    }
  } catch (e) {
    console.debug('WalletConnect session restore failed:', e)
  }
}

export default boot(({ app }) => {
  const store = app.config.globalProperties.$store
  if (!store) {
    console.warn('WalletConnect boot: Vuex store not available yet')
    return
  }
  const wc = initializeWalletConnect(store)
  app.config.globalProperties.$walletConnect = wc
  app.provide('walletConnect', wc)
  restoreSessionIfAny(store)
})
