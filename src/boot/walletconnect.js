/**
 * WalletConnect Boot File (v2.1.1)
 * Real Paytaca connectivity via WalletConnect v2 Sign Client + Modal.
 * Using Paytaca-compatible chain IDs: bch:bchtest (testnet) and bch:bitcoincash (mainnet).
 * Reference: https://github.com/mainnet-pat/wc2-bch-bcr
 *
 * Enhanced with unified state management to prevent race conditions
 * and synchronization issues between Paytaca and system state.
 */

import { boot } from 'quasar/wrappers'
import SignClient from '@walletconnect/sign-client'
import { WalletConnectModal } from '@walletconnect/modal'
import { base64ToBin, binToHex, hexToBin, secp256k1, sha256 } from '@bitauth/libauth'
import { connectionStateManager } from 'src/services/ConnectionStateManager'
import { SessionHealthMonitor } from 'src/services/SessionHealthMonitor'
import { StateReconciliationService } from 'src/services/StateReconciliationService'

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
let sessionHealthMonitor = null
let stateReconciliationService = null
let globalStore = null // Global store reference for event listeners
let sessionMonitoringInterval = null // Global monitoring interval

// Legacy variable for backward compatibility
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

async function getSignClient() {
  if (signClient) return signClient
  signClient = await SignClient.init({
    projectId: PROJECT_ID,
    metadata: MODAL_METADATA,
  })

  // Add session event listeners for better state management
  signClient.on('session_event', ({ event, chainId }) => {
    console.log('WalletConnect: Session event', { event, chainId })

    // Handle session events like addressesChanged
    if (event.name === 'addressesChanged' && connectionStateManager.getSession()) {
      // Refresh wallet state when addresses change
      syncSessionToStore(signClient, connectionStateManager.getSession())
        .then(() => {
          // Trigger reconciliation after address change
          if (stateReconciliationService) {
            stateReconciliationService.performReconciliation().catch((err) => {
              console.warn('WalletConnect: Reconciliation after address change failed', err)
            })
          }
        })
        .catch((err) => {
          console.warn('WalletConnect: Failed to sync session after address change', err)
        })
    }
  })

  signClient.on('session_delete', ({ topic }) => {
    console.log('WalletConnect: Session deleted by wallet', { topic })

    // IMMEDIATELY clear all connection state
    connectionStateManager.setSession(null)
    currentSession = null

    // Stop health monitoring
    if (sessionHealthMonitor) {
      sessionHealthMonitor.stopMonitoring()
    }

    // CRITICAL: Clear Vuex store immediately for reactive UI update
    if (globalStore) {
      globalStore.commit('wallet/CLEAR_WALLET')
      console.log('WalletConnect: Vuex store cleared due to session deletion')
    }

    // Show user notification
    if (typeof window !== 'undefined' && window.$q) {
      window.$q.notify({
        type: 'info',
        message: 'Wallet disconnected from Paytaca',
        icon: 'logout',
        timeout: 3000,
      })
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
async function cleanupStaleSessions(client) {
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
  return {
    async connect() {
      console.log('WalletConnect: Connection requested')

      // Use the unified state manager
      if (connectionStateManager.isConnecting()) {
        console.log('WalletConnect: Connection already in progress, returning existing promise')
        return connectionStateManager.getConnectionPromise()
      }

      if (connectionStateManager.isConnected()) {
        console.log('WalletConnect: Already connected, returning address')
        return store.state.wallet?.address ?? null
      }

      // Set connecting state
      connectionStateManager.setState(connectionStateManager.states.CONNECTING)

      const connectionPromise = this._performConnection(store)
      connectionStateManager.setConnectionPromise(connectionPromise)

      try {
        const result = await connectionPromise
        return result
      } finally {
        connectionStateManager.clearConnectionPromise()
      }
    },

    async _performConnection(store) {
      if (!store) return null

      try {
        const client = await getSignClient()

        // Clean up stale sessions first
        await cleanupStaleSessions(client)

        // Check for existing valid sessions
        const existingSessions = client.session.getAll()
        const bchSession = existingSessions.find((s) => s.namespaces?.bch?.accounts?.length)

        if (bchSession) {
          const methods = bchSession.namespaces?.bch?.methods ?? []
          const hasRequiredMethods = REQUIRED_METHODS.every((m) => methods.includes(m))

          if (hasRequiredMethods && bchSession.expiry * 1000 > Date.now()) {
            console.log('WalletConnect: Found existing valid session')
            connectionStateManager.setSession(bchSession)
            await syncSessionToStore(store, client, bchSession)
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

            // Add timeout for QR code display with better error handling
            const qrTimeout = setTimeout(() => {
              console.warn('WalletConnect: QR code display timeout, attempting to reopen modal')
              wcModal.closeModal()
              setTimeout(() => {
                wcModal.openModal({ uri }).catch((err) => {
                  console.error('WalletConnect: Failed to reopen modal', err)
                  connectionStateManager.setState(connectionStateManager.states.ERROR, {
                    reason: 'modal_failed',
                    message: 'Failed to display QR code',
                  })
                })
              }, 500)
            }, 5000)

            // Clear timeout when modal is closed
            const originalCloseModal = wcModal.closeModal
            wcModal.closeModal = function (...args) {
              clearTimeout(qrTimeout)
              return originalCloseModal.apply(this, args)
            }
          } catch (modalError) {
            console.error('WalletConnect: Failed to open WalletConnect modal:', modalError)
            connectionStateManager.setState(connectionStateManager.states.ERROR, {
              reason: 'modal_failed',
              message: 'Failed to display QR code. Please try again.',
            })
            throw new Error('Failed to display QR code. Please try again.')
          }
        }

        const session = await approval()

        // Ensure modal is properly closed
        if (wcModal && typeof wcModal.closeModal === 'function') {
          wcModal.closeModal()
        }

        // Update state manager with new session
        connectionStateManager.setSession(session)
        currentSession = session // Keep for backward compatibility

        await syncSessionToStore(store, client, session)

        // Start health monitoring for new session
        if (sessionHealthMonitor) {
          sessionHealthMonitor.startMonitoring()
        }

        return store.state.wallet?.address ?? null
      } catch (err) {
        // Enhanced error handling and cleanup
        const m = getModal()
        if (m && typeof m.closeModal === 'function') {
          try {
            m.closeModal()
          } catch (closeError) {
            console.warn('WalletConnect: Failed to close modal:', closeError)
          }
        }

        // Update state manager with error
        connectionStateManager.setState(connectionStateManager.states.ERROR, {
          reason: 'connection_failed',
          message: err?.message || 'Connection failed',
        })

        try {
          await this.disconnect()
        } catch {
          // ignore disconnect errors during recovery
        }

        // Enhanced error logging
        console.error('WalletConnect: Connection error:', {
          message: err?.message,
          code: err?.code,
          data: err?.data,
          stack: err?.stack,
        })

        throw err
      }
    },

    async disconnect() {
      console.log('WalletConnect: Disconnect requested from system')

      try {
        // Stop health monitoring
        if (sessionHealthMonitor) {
          sessionHealthMonitor.stopMonitoring()
        }

        // Stop aggressive session monitoring
        stopAggressiveSessionMonitoring()

        // Disconnect WalletConnect session (this will notify Paytaca)
        const session = connectionStateManager.getSession()
        if (signClient && session?.topic) {
          console.log('WalletConnect: Disconnecting session', session.topic)
          await signClient.disconnect({ topic: session.topic })
          console.log('WalletConnect: Session disconnected, Paytaca should be notified')
        }
      } catch (e) {
        console.debug('WalletConnect: Disconnect ignored:', e)
      }

      // Clear ALL state using state manager
      connectionStateManager.reset()
      currentSession = null

      if (globalStore) {
        globalStore.commit('wallet/CLEAR_WALLET')
        console.log('WalletConnect: Vuex store cleared due to system disconnect')
      }

      // Show user notification
      if (typeof window !== 'undefined' && window.$q) {
        window.$q.notify({
          type: 'info',
          message: 'Disconnected from Paytaca wallet',
          icon: 'logout',
          timeout: 3000,
        })
      }

      console.log('WalletConnect: Disconnect completed - Paytaca should show disconnected')
    },

    isConnected() {
      // Use unified state manager
      return connectionStateManager.isConnected() && !!globalStore?.state?.wallet?.address
    },

    getAddress() {
      return globalStore?.state?.wallet?.address ?? null
    },

    getSignatureTemplate() {
      return null
    },

    getOwnerPublicKeyHex() {
      return globalStore?.state?.wallet?.publicKey ?? null
    },

    getSessionTopic() {
      return connectionStateManager.getSession()?.topic ?? null
    },

    getChainId() {
      return connectionStateManager.getSession()?.namespaces?.bch?.chains?.[0] ?? null
    },

    async request(method, params) {
      const client = await getSignClient()
      const session = connectionStateManager.getSession()

      if (!session?.topic) {
        throw new Error('Wallet not connected. Connect Paytaca first.')
      }

      const chainId = session.namespaces?.bch?.chains?.[0] ?? BCH_CHIPNET_CHAIN

      try {
        return await client.request({
          chainId,
          topic: session.topic,
          request: { method, params },
        })
      } catch (error) {
        // If request fails, trigger reconciliation
        if (stateReconciliationService) {
          console.log('WalletConnect: Request failed, triggering reconciliation')
          stateReconciliationService.performReconciliation().catch((err) => {
            console.warn('WalletConnect: Reconciliation failed after request error', err)
          })
        }
        throw error
      }
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
    const client = await getSignClient()
    const sessions = client.session.getAll()
    const bchSession = sessions.find((s) => s.namespaces?.bch?.accounts?.length)

    if (bchSession && bchSession.expiry * 1000 > Date.now()) {
      // Check if session has required methods
      const methods = bchSession.namespaces?.bch?.methods ?? []
      const hasRequiredMethods = REQUIRED_METHODS.every((m) => methods.includes(m))

      if (hasRequiredMethods) {
        console.log('WalletConnect: Restoring existing session')
        connectionStateManager.setSession(bchSession)
        currentSession = bchSession // Keep for backward compatibility
        await syncSessionToStore(client, bchSession)

        // Start health monitoring for restored session
        if (sessionHealthMonitor) {
          sessionHealthMonitor.startMonitoring()
        }
      } else {
        // Clean up invalid session
        await client.disconnect({ topic: bchSession.topic })
      }
    } else if (bchSession) {
      // Clean up expired session
      await client.disconnect({ topic: bchSession.topic })
    }

    // Perform initial reconciliation if we have any state
    if (bchSession || store.state.wallet?.address) {
      setTimeout(() => {
        if (stateReconciliationService) {
          stateReconciliationService.performReconciliation().catch((err) => {
            console.warn('WalletConnect: Initial reconciliation failed', err)
          })
        }
      }, 2000)
    }
  } catch (e) {
    console.debug('WalletConnect: Session restore failed:', e)
  }
}

export default boot(({ app }) => {
  const store = app.config.globalProperties.$store
  if (!store) {
    console.warn('WalletConnect boot: Vuex store not available yet')
    return
  }

  // Set global store reference for event listeners
  globalStore = store

  const wc = initializeWalletConnect(store)
  app.config.globalProperties.$walletConnect = wc
  app.provide('walletConnect', wc)

  // Initialize enhanced services after boot
  initializeEnhancedServices(store)

  // Start aggressive session monitoring for instant disconnection detection
  startAggressiveSessionMonitoring()

  // Restore existing sessions
  restoreSessionIfAny(store)
})

/**
 * Initialize enhanced connection management services
 */
function initializeEnhancedServices(store) {
  // Initialize health monitor
  sessionHealthMonitor = new SessionHealthMonitor(connectionStateManager, signClient)

  // Initialize reconciliation service
  stateReconciliationService = new StateReconciliationService(
    connectionStateManager,
    store,
    signClient,
  )

  // Set up state change listeners
  connectionStateManager.addStateChangeListener((newState, oldState, data) => {
    console.log('WalletConnect: State changed', { from: oldState, to: newState, data })

    // Trigger reconciliation on error states
    if (newState === connectionStateManager.states.ERROR && stateReconciliationService) {
      setTimeout(() => {
        stateReconciliationService.performReconciliation().catch((err) => {
          console.warn('WalletConnect: Auto-reconciliation failed', err)
        })
      }, 1000)
    }
  })

  // Set up reconciliation listeners
  stateReconciliationService.addReconciliationListener((event, data) => {
    console.log('WalletConnect: Reconciliation event', event, data)

    if (event === 'reconciliation_completed' && !data.success) {
      // Show user notification for failed reconciliation
      if (typeof window !== 'undefined' && window.$q) {
        window.$q.notify({
          type: 'warning',
          message: 'Connection issues detected. Please try reconnecting.',
          timeout: 5000,
        })
      }
    }
  })

  console.log('WalletConnect: Enhanced services initialized')
}

/**
 * Aggressive session monitoring for instant disconnection detection
 */
function startAggressiveSessionMonitoring() {
  const checkSession = async () => {
    try {
      if (!signClient) return

      const sessions = signClient.session.getAll()
      const bchSession = sessions.find((s) => s.namespaces?.bch?.accounts?.length)

      // If we think we're connected but no session exists, force disconnect
      if (connectionStateManager.isConnected() && !bchSession) {
        console.log('WalletConnect: Session lost, forcing disconnect')

        // Clear all state immediately
        connectionStateManager.reset()
        currentSession = null

        if (globalStore) {
          globalStore.commit('wallet/CLEAR_WALLET')
        }

        // Show notification
        if (typeof window !== 'undefined' && window.$q) {
          window.$q.notify({
            type: 'warning',
            message: 'Wallet connection lost - Paytaca disconnected',
            icon: 'warning',
            timeout: 3000,
          })
        }

        return
      }

      // If session exists but is expired, force disconnect
      if (bchSession && bchSession.expiry * 1000 < Date.now()) {
        console.log('WalletConnect: Session expired, forcing disconnect')

        connectionStateManager.reset()
        currentSession = null

        if (globalStore) {
          globalStore.commit('wallet/CLEAR_WALLET')
        }

        return
      }

      // Test if session is responsive by making a lightweight request
      if (bchSession && connectionStateManager.isConnected()) {
        try {
          await signClient.request({
            topic: bchSession.topic,
            chainId: bchSession.namespaces?.bch?.chains?.[0] || 'bch:chipnet',
            request: { method: 'bch_getAddresses', params: {} },
          })
        } catch (error) {
          if (error.code === -32001 || error.message?.includes('session')) {
            console.log('WalletConnect: Session unresponsive, forcing disconnect')

            connectionStateManager.reset()
            currentSession = null

            if (globalStore) {
              globalStore.commit('wallet/CLEAR_WALLET')
            }

            if (typeof window !== 'undefined' && window.$q) {
              window.$q.notify({
                type: 'warning',
                message: 'Wallet connection lost - Paytaca unresponsive',
                icon: 'warning',
                timeout: 3000,
              })
            }
          }
        }
      }
    } catch (error) {
      console.warn('WalletConnect: Session monitoring error', error)
    }
  }

  // Check every 2 seconds for instant responsiveness
  sessionMonitoringInterval = setInterval(checkSession, 2000)

  // Also check on visibility change (when user switches back to tab)
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        checkSession()
      }
    })
  }

  console.log('WalletConnect: Aggressive session monitoring started')
}

/**
 * Stop aggressive session monitoring
 */
function stopAggressiveSessionMonitoring() {
  if (sessionMonitoringInterval) {
    clearInterval(sessionMonitoringInterval)
    sessionMonitoringInterval = null
    console.log('WalletConnect: Aggressive session monitoring stopped')
  }
}
