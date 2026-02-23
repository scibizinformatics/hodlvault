/**
 * WalletConnect Boot File (v1.6.3)
 * Real Paytaca connectivity via WalletConnect v2 Sign Client + Modal.
 * Using Paytaca-compatible chain IDs: bch:bchtest (testnet) and bch:bitcoincash (mainnet).
 * Reference: https://github.com/mainnet-pat/wc2-bch-bcr
 */

import { boot } from 'quasar/wrappers'
import SignClient from '@walletconnect/sign-client'
import { WalletConnectModal } from '@walletconnect/modal'

// Paytaca/WalletConnect v2 BCH chain IDs (wc2-bch-bcr spec)
// bch:bchtest = testnet, bch:bitcoincash = mainnet, bch:bchreg = regtest
const BCH_TESTNET_CHAIN = 'bch:bchtest'
const BCH_MAINNET_CHAIN = 'bch:bitcoincash'

/** BCH config for WalletConnect v2 (matches wc2-bch-bcr spec for Paytaca compatibility) */
const REQUIRED_NAMESPACES = {
  bch: {
    chains: [BCH_TESTNET_CHAIN, BCH_MAINNET_CHAIN],
    methods: ['bch_getAddresses', 'bch_signTransaction', 'bch_signMessage'],
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
    chains: [BCH_TESTNET_CHAIN, BCH_MAINNET_CHAIN],
    themeMode: 'light',
    themeVariables: { '--wcm-z-index': '9999' },
  })
  return modal
}

export function initializeWalletConnect(store) {
  return {
    async connect() {
      if (!store) return null
      try {
        const client = await getSignClient()

        const existingSessions = client.session.getAll()
        const bchSession = existingSessions.find(
          (s) => s.namespaces?.bch?.accounts?.length
        )
        if (bchSession) {
          currentSession = bchSession
          await syncSessionToStore(store, client, bchSession)
          return store.state.wallet?.address ?? null
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
      } catch (err) {
        const m = getModal()
        if (m && typeof m.closeModal === 'function') m.closeModal()
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

    async request(method, params) {
      const client = await getSignClient()
      if (!currentSession?.topic) {
        throw new Error('Wallet not connected. Connect Paytaca first.')
      }
      const chainId = currentSession.namespaces?.bch?.chains?.[0] ?? BCH_TESTNET_CHAIN
      return await client.request({
        chainId,
        topic: currentSession.topic,
        request: { method, params },
      })
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