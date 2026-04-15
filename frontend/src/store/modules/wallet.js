/**
 * Vuex wallet module: persistent wallet state across the app.
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
    state.address = payload.address ?? null
    state.publicKey = payload.publicKey ?? null
    state.privateKey = payload.privateKey ?? null
    if (typeof localStorage !== 'undefined') {
      try {
        if (state.address || state.publicKey) {
          localStorage.setItem(
            'hodl-vault-wallet',
            JSON.stringify({
              address: state.address,
              publicKey: state.publicKey,
            }),
          )
        } else {
          localStorage.removeItem('hodl-vault-wallet')
        }
      } catch {
        // ignore persistence errors
      }
    }
  },
  SET_PUBLIC_KEY(state, publicKey) {
    state.publicKey = publicKey ?? null
    if (typeof localStorage !== 'undefined') {
      try {
        if (state.address || state.publicKey) {
          localStorage.setItem(
            'hodl-vault-wallet',
            JSON.stringify({
              address: state.address,
              publicKey: state.publicKey,
            }),
          )
        }
      } catch {
        // ignore persistence errors
      }
    }
  },
  CLEAR_WALLET(state) {
    state.address = null
    state.publicKey = null
    state.privateKey = null
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('hodl-vault-wallet')
      } catch {
        // ignore persistence errors
      }
    }
  },
}

const actions = {
  loginUser({ commit, dispatch }, walletData) {
    commit('SET_WALLET', walletData)
    // Sync vaults with backend after wallet connection
    dispatch('syncWithBackend')
  },
  clearWallet({ commit }) {
    commit('CLEAR_WALLET')
  },

  /**
   * Sync vaults and preferences with backend
   * Called automatically after wallet connection
   */
  async syncWithBackend({ state }) {
    if (!state.address) return

    try {
      // Import vaultStorage dynamically to avoid circular dependencies
      const { vaultStorage } = await import('../../services/vault-storage.js')

      // Check backend availability
      await vaultStorage.checkBackendAvailability()

      if (vaultStorage.shouldUseBackend()) {
        // Sync vaults with backend
        await vaultStorage.syncVaultsWithBackend(state.address)
        console.log('Wallet synced with backend successfully')
      }
    } catch (error) {
      console.warn('Failed to sync with backend:', error)
      // Continue with localStorage fallback - user can still use the app
    }
  },

  /**
   * Check backend health manually
   * Can be called from UI to verify connection
   */
  async checkBackendHealth() {
    try {
      const { vaultStorage } = await import('../../services/vault-storage.js')
      const isAvailable = await vaultStorage.checkBackendAvailability()
      return isAvailable
    } catch (error) {
      console.error('Backend health check failed:', error)
      return false
    }
  },
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
}
