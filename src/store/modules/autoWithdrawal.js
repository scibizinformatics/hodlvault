/**
 * Vuex module for auto-withdrawal functionality
 * Manages pre-signed transactions and auto-withdrawal state
 */

function loadAutoWithdrawalState() {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem('hodl-vault-auto-withdrawal')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return {
      enabled: parsed.enabled || false,
      activeVaults: parsed.activeVaults || [],
      preSignedTransactions: parsed.preSignedTransactions || {},
    }
  } catch {
    return null
  }
}

const persisted = loadAutoWithdrawalState()

const state = {
  enabled: persisted?.enabled || false,
  activeVaults: persisted?.activeVaults || [],
  preSignedTransactions: persisted?.preSignedTransactions || {},
  monitoring: false,
}

const mutations = {
  SET_AUTO_WITHDRAWAL_ENABLED(state, enabled) {
    state.enabled = enabled
    if (typeof localStorage !== 'undefined') {
      try {
        const currentState = {
          enabled,
          activeVaults: state.activeVaults,
          preSignedTransactions: state.preSignedTransactions,
        }
        localStorage.setItem('hodl-vault-auto-withdrawal', JSON.stringify(currentState))
      } catch {
        // ignore persistence errors
      }
    }
  },

  ADD_ACTIVE_VAULT(state, vault) {
    const existingIndex = state.activeVaults.findIndex(v => v.contractAddress === vault.contractAddress)
    if (existingIndex === -1) {
      state.activeVaults.push({
        ...vault,
        addedAt: Date.now(),
        lastChecked: Date.now(),
      })
    } else {
      state.activeVaults[existingIndex] = {
        ...state.activeVaults[existingIndex],
        ...vault,
        lastChecked: Date.now(),
      }
    }
    
    // Persist state
    if (typeof localStorage !== 'undefined') {
      try {
        const currentState = {
          enabled: state.enabled,
          activeVaults: state.activeVaults,
          preSignedTransactions: state.preSignedTransactions,
        }
        localStorage.setItem('hodl-vault-auto-withdrawal', JSON.stringify(currentState))
      } catch {
        // ignore persistence errors
      }
    }
  },

  REMOVE_ACTIVE_VAULT(state, contractAddress) {
    state.activeVaults = state.activeVaults.filter(v => v.contractAddress !== contractAddress)
    
    // Also remove pre-signed transactions for this vault
    if (state.preSignedTransactions[contractAddress]) {
      delete state.preSignedTransactions[contractAddress]
    }
    
    // Persist state
    if (typeof localStorage !== 'undefined') {
      try {
        const currentState = {
          enabled: state.enabled,
          activeVaults: state.activeVaults,
          preSignedTransactions: state.preSignedTransactions,
        }
        localStorage.setItem('hodl-vault-auto-withdrawal', JSON.stringify(currentState))
      } catch {
        // ignore persistence errors
      }
    }
  },

  STORE_PRE_SIGNED_TRANSACTIONS(state, { contractAddress, transactions }) {
    state.preSignedTransactions[contractAddress] = transactions
    
    // Persist state
    if (typeof localStorage !== 'undefined') {
      try {
        const currentState = {
          enabled: state.enabled,
          activeVaults: state.activeVaults,
          preSignedTransactions: state.preSignedTransactions,
        }
        localStorage.setItem('hodl-vault-auto-withdrawal', JSON.stringify(currentState))
      } catch {
        // ignore persistence errors
      }
    }
  },

  MARK_TRANSACTION_USED(state, { contractAddress, priceTarget }) {
    const transactions = state.preSignedTransactions[contractAddress]
    if (transactions) {
      const targetTx = transactions.find(tx => tx.priceTarget === priceTarget)
      if (targetTx) {
        targetTx.used = true
        targetTx.usedAt = Date.now()
      }
    }
    
    // Persist state
    if (typeof localStorage !== 'undefined') {
      try {
        const currentState = {
          enabled: state.enabled,
          activeVaults: state.activeVaults,
          preSignedTransactions: state.preSignedTransactions,
        }
        localStorage.setItem('hodl-vault-auto-withdrawal', JSON.stringify(currentState))
      } catch {
        // ignore persistence errors
      }
    }
  },

  SET_MONITORING(state, monitoring) {
    state.monitoring = monitoring
  },

  CLEAR_AUTO_WITHDRAWAL_STATE(state) {
    state.enabled = false
    state.activeVaults = []
    state.preSignedTransactions = {}
    state.monitoring = false
    
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('hodl-vault-auto-withdrawal')
      } catch {
        // ignore persistence errors
      }
    }
  },
}

const actions = {
  enableAutoWithdrawal({ commit }) {
    commit('SET_AUTO_WITHDRAWAL_ENABLED', true)
  },

  disableAutoWithdrawal({ commit }) {
    commit('SET_AUTO_WITHDRAWAL_ENABLED', false)
  },

  addVault({ commit }, vault) {
    commit('ADD_ACTIVE_VAULT', vault)
  },

  removeVault({ commit }, contractAddress) {
    commit('REMOVE_ACTIVE_VAULT', contractAddress)
  },

  storePreSignedTransactions({ commit }, { contractAddress, transactions }) {
    commit('STORE_PRE_SIGNED_TRANSACTIONS', { contractAddress, transactions })
  },

  markTransactionUsed({ commit }, { contractAddress, priceTarget }) {
    commit('MARK_TRANSACTION_USED', { contractAddress, priceTarget })
  },

  startMonitoring({ commit }) {
    commit('SET_MONITORING', true)
  },

  stopMonitoring({ commit }) {
    commit('SET_MONITORING', false)
  },

  clearAutoWithdrawalState({ commit }) {
    commit('CLEAR_AUTO_WITHDRAWAL_STATE')
  },
}

const getters = {
  isEnabled: state => state.enabled,
  activeVaults: state => state.activeVaults,
  getPreSignedTransactions: state => contractAddress => state.preSignedTransactions[contractAddress] || [],
  isMonitoring: state => state.monitoring,
  getVaultByAddress: state => contractAddress => 
    state.activeVaults.find(v => v.contractAddress === contractAddress),
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
}
