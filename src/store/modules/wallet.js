/**
 * Vuex wallet module: persistent wallet state across the app.
 * State: address, publicKey, privateKey (from generated wallet).
 */

const state = {
  address: null,
  publicKey: null,
  privateKey: null,
}

const mutations = {
  SET_WALLET(state, payload) {
    state.address = payload.address ?? null
    state.publicKey = payload.publicKey ?? null
    state.privateKey = payload.privateKey ?? null
  },
  SET_PUBLIC_KEY(state, publicKey) {
    state.publicKey = publicKey ?? null
  },
  CLEAR_WALLET(state) {
    state.address = null
    state.publicKey = null
    state.privateKey = null
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
