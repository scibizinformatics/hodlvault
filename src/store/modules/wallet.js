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
  loginUser({ commit }, walletData) {
    commit('SET_WALLET', walletData)
  },
  clearWallet({ commit }) {
    commit('CLEAR_WALLET')
  },
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
}
