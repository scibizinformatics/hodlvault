import axios from 'axios'
import store from '../store'

/**
 * API Service for HodlVault Backend
 * All requests automatically include wallet address from Vuex store
 */

// Use proxy path in development, direct URL in production
const API_BASE_URL = process.env.VUE_APP_API_URL || '/api/v1'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Request interceptor - adds wallet address header from store
 */
apiClient.interceptors.request.use(
  (config) => {
    const walletAddress = store.state.wallet?.address

    if (walletAddress) {
      config.headers['x-wallet-address'] = walletAddress
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

/**
 * Response interceptor - handle common errors
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', error.response.data)
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.request)
    } else {
      // Error in request setup
      console.error('Request Error:', error.message)
    }
    return Promise.reject(error)
  },
)

/**
 * Vault API Methods
 */
export const vaultApi = {
  /**
   * Get all vaults for the connected wallet
   * @param {Object} params - Query parameters (status, page, limit)
   * @returns {Promise<Object>} Vaults list with pagination
   */
  async getVaults(params = {}) {
    const response = await apiClient.get('/vaults', { params })
    return response.data
  },

  /**
   * Create a new vault
   * @param {Object} vaultData - Vault creation data
   * @returns {Promise<Object>} Created vault
   */
  async createVault(vaultData) {
    const response = await apiClient.post('/vaults', vaultData)
    return response.data
  },

  /**
   * Get a specific vault by ID
   * @param {string} id - Vault ID
   * @returns {Promise<Object>} Vault details
   */
  async getVaultById(id) {
    const response = await apiClient.get(`/vaults/${id}`)
    return response.data
  },

  /**
   * Update a vault
   * @param {string} id - Vault ID
   * @param {Object} data - Update data (name, status)
   * @returns {Promise<Object>} Updated vault
   */
  async updateVault(id, data) {
    const response = await apiClient.put(`/vaults/${id}`, data)
    return response.data
  },

  /**
   * Delete a vault
   * @param {string} id - Vault ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteVault(id) {
    const response = await apiClient.delete(`/vaults/${id}`)
    return response.data
  },

  /**
   * Check for duplicate vault parameters
   * @param {string} walletAddress - Wallet address
   * @param {number} priceTarget - Price target
   * @returns {Promise<Object>} Duplicate check result
   */
  async checkDuplicate(walletAddress, priceTarget) {
    const response = await apiClient.post('/vaults/check-duplicate', {
      walletAddress,
      priceTarget,
    })
    return response.data
  },

  /**
   * Update vault balance
   * @param {string} contractAddress - Contract address
   * @param {number} balance - New balance in satoshis
   * @returns {Promise<Object>} Updated vault
   */
  async updateVaultBalance(contractAddress, balance) {
    const response = await apiClient.put(`/vaults/${contractAddress}/balance`, {
      balance,
    })
    return response.data
  },

  /**
   * Get vault statistics for a wallet
   * @param {string} walletAddress - Wallet address
   * @returns {Promise<Object>} Vault statistics
   */
  async getVaultStats(walletAddress) {
    const response = await apiClient.get(`/vaults/stats/${walletAddress}`)
    return response.data
  },

  /**
   * Get vaults by wallet address (public endpoint)
   * @param {string} walletAddress - Wallet address
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Vaults list
   */
  async getVaultsByWallet(walletAddress, params = {}) {
    const response = await apiClient.get(`/vaults/wallet/${walletAddress}`, {
      params,
    })
    return response.data
  },
}

/**
 * Wallet Preferences API Methods
 */
export const preferencesApi = {
  /**
   * Get wallet preferences (creates default if not exists)
   * @returns {Promise<Object>} Wallet preferences
   */
  async getPreferences() {
    const response = await apiClient.get('/wallet/preferences')
    return response.data
  },

  /**
   * Update wallet preferences
   * @param {Object} preferences - Preferences to update
   * @returns {Promise<Object>} Updated preferences
   */
  async updatePreferences(preferences) {
    const response = await apiClient.put('/wallet/preferences', {
      preferences,
    })
    return response.data
  },

  /**
   * Delete wallet preferences
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deletePreferences() {
    const response = await apiClient.delete('/wallet/preferences')
    return response.data
  },
}

/**
 * Health check - test backend connectivity
 * @returns {Promise<boolean>} True if backend is reachable
 */
export async function checkBackendHealth() {
  try {
    await apiClient.get('/vaults/wallet/test', { timeout: 5000 })
    return true
  } catch (error) {
    if (error.response) {
      // Server responded, so it's online
      return true
    }
    return false
  }
}

/**
 * Export configured axios instance for custom requests
 */
export { apiClient }

/**
 * Default export with all APIs
 */
export default {
  vault: vaultApi,
  preferences: preferencesApi,
  checkHealth: checkBackendHealth,
  client: apiClient,
}
