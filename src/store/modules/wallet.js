/**
 * Vuex wallet module: persistent wallet state across the app.
 * Enhanced with state validation and reconciliation support.
 * State: address, publicKey, privateKey (from generated wallet).
 */

function loadPersistedWallet() {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem('hodl-vault-wallet')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return {
      address: parsed.address ?? null,
      publicKey: parsed.publicKey ?? null,
      privateKey: null,
    }
  } catch {
    return null
  }
}

const persisted = loadPersistedWallet()

const state = {
  address: persisted?.address ?? null,
  publicKey: persisted?.publicKey ?? null,
  privateKey: persisted?.privateKey ?? null,
}

const mutations = {
  SET_WALLET(state, payload) {
    // Validate payload before setting
    if (payload && typeof payload === 'object') {
      state.address = payload.address ?? null
      state.publicKey = payload.publicKey ?? null
      state.privateKey = payload.privateKey ?? null

      // Only persist if we have valid data
      if (state.address || state.publicKey) {
        persistWalletState(state)
      } else {
        clearPersistedWallet()
      }

      console.log('Wallet store: State updated', {
        address: state.address,
        hasPublicKey: !!state.publicKey,
      })
    } else {
      console.warn('Wallet store: Invalid payload for SET_WALLET', payload)
    }
  },

  SET_PUBLIC_KEY(state, publicKey) {
    if (typeof publicKey === 'string' || publicKey === null) {
      state.publicKey = publicKey

      // Update persistence
      if (state.address || state.publicKey) {
        persistWalletState(state)
      } else {
        clearPersistedWallet()
      }

      console.log('Wallet store: Public key updated', { hasPublicKey: !!publicKey })
    } else {
      console.warn('Wallet store: Invalid public key', publicKey)
    }
  },

  CLEAR_WALLET(state) {
    const oldState = { ...state }

    state.address = null
    state.publicKey = null
    state.privateKey = null

    clearPersistedWallet()

    console.log('Wallet store: State cleared', {
      hadAddress: !!oldState.address,
      hadPublicKey: !!oldState.publicKey,
    })
  },
}

const actions = {
  loginUser({ commit }, walletData) {
    console.log('Wallet store: loginUser action called', walletData)
    commit('SET_WALLET', walletData)
  },

  setWallet({ commit }, walletData) {
    console.log('Wallet store: setWallet action called', walletData)
    commit('SET_WALLET', walletData)
  },

  clearWallet({ commit }) {
    console.log('Wallet store: clearWallet action called')
    commit('CLEAR_WALLET')
  },

  // Enhanced action for validation
  validateWalletState({ state }) {
    const issues = []

    // Check if we have address but no public key
    if (state.address && !state.publicKey) {
      issues.push('address_without_public_key')
    }

    // Check if we have public key but no address
    if (state.publicKey && !state.address) {
      issues.push('public_key_without_address')
    }

    // Check address format
    if (state.address && !isValidCashAddress(state.address)) {
      issues.push('invalid_address_format')
    }

    // Check public key format
    if (state.publicKey && !isValidPublicKey(state.publicKey)) {
      issues.push('invalid_public_key_format')
    }

    if (issues.length > 0) {
      console.warn('Wallet store: Validation issues found', issues)
      return { valid: false, issues }
    }

    return { valid: true, issues: [] }
  },
}

// Enhanced persistence functions
function persistWalletState(state) {
  if (typeof localStorage === 'undefined') return

  try {
    const walletData = {
      address: state.address,
      publicKey: state.publicKey,
      timestamp: Date.now(),
    }

    localStorage.setItem('hodl-vault-wallet', JSON.stringify(walletData))
    console.log('Wallet store: State persisted')
  } catch (error) {
    console.warn('Wallet store: Failed to persist state', error)
  }
}

function clearPersistedWallet() {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.removeItem('hodl-vault-wallet')
    console.log('Wallet store: Persisted state cleared')
  } catch (error) {
    console.warn('Wallet store: Failed to clear persisted state', error)
  }
}

// Validation helpers
function isValidCashAddress(address) {
  if (!address || typeof address !== 'string') return false

  // Basic BCH address validation
  const patterns = [
    /^bitcoincash:/, // mainnet
    /^bchtest:/, // testnet
    /^chipnet:/, // chipnet
  ]

  return patterns.some((pattern) => pattern.test(address))
}

function isValidPublicKey(publicKey) {
  if (!publicKey || typeof publicKey !== 'string') return false

  // Basic public key validation (hex string, 66 chars for compressed)
  return /^[0-9a-fA-F]{66}$/.test(publicKey)
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  // Add getters for better state access
  getters: {
    isConnected: (state) => !!state.address,
    hasPublicKey: (state) => !!state.publicKey,
    walletInfo: (state) => ({
      address: state.address,
      hasPublicKey: !!state.publicKey,
      shortAddress: state.address
        ? `${state.address.slice(0, 8)}...${state.address.slice(-8)}`
        : null,
    }),
  },
}
