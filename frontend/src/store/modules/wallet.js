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
   * Two-way sync: Backend → LocalStorage (immediate) AND LocalStorage → Backend (migration)
   */
  async syncWithBackend({ state }) {
    if (!state.address) {
      console.log('No wallet address, skipping backend sync')
      return
    }

    try {
      // Import vaultStorage dynamically to avoid circular dependencies
      const { vaultStorage } = await import('src/services/vault-storage')

      // Check if backend is available
      const isAvailable = await vaultStorage.checkBackendAvailability()
      console.log('Backend availability check:', isAvailable)

      if (isAvailable) {
        // ✅ TWO-WAY SYNC: First fetch from backend (source of truth)
        console.log('🔄 Fetching vaults from backend for immediate sync...')
        const backendVaults = await vaultStorage.getVaultsByWallet(state.address)
        console.log(`✅ Fetched ${backendVaults.length} vaults from backend`)

        // Sync backend vaults to localStorage for offline access and fast loading
        if (backendVaults.length > 0) {
          const allLocalVaults = vaultStorage.getAllVaultsLocal()
          const otherWalletsVaults = allLocalVaults.filter((v) => v.walletAddress !== state.address)

          // Merge: Keep other wallets' vaults + update current wallet's vaults from backend
          const mergedVaults = [...otherWalletsVaults, ...backendVaults]
          localStorage.setItem('hodl-vault-all-vaults', JSON.stringify(mergedVaults))
          console.log('💾 Synced backend vaults to localStorage for fast access')
        }

        // Then sync any local-only vaults to backend (migration)
        await vaultStorage.syncVaultsWithBackend(state.address)
        console.log('Vault sync with backend completed')
      } else {
        console.warn('Backend not available, operating in localStorage-only mode')
      }
    } catch (error) {
      console.error('Backend sync failed:', error)
    }
  },

  /**
   * Check backend health (can be called manually)
   */
  async checkBackendHealth() {
    try {
      const { vaultStorage } = await import('src/services/vault-storage')
      const isAvailable = await vaultStorage.checkBackendAvailability()
      return { available: isAvailable }
    } catch (error) {
      console.error('Backend health check failed:', error)
      return { available: false, error: error.message }
    }
  },
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
}
