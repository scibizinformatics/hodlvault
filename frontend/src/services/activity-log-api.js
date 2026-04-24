import axios from 'axios'
import store from '../store'

const API_BASE_URL = process.env.VUE_APP_API_URL || '/api/v1'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(
  (config) => {
    const walletAddress = store.state.wallet?.address
    if (walletAddress) {
      config.headers['x-wallet-address'] = walletAddress
    }
    return config
  },
  (error) => Promise.reject(error),
)

export const activityLogApi = {
  async getHistory(limit = 50, skip = 0, activityType = null) {
    const params = { limit, skip }
    if (activityType) params.activityType = activityType

    const response = await apiClient.get('/activity-logs', { params })
    return response.data
  },

  async getStats() {
    const response = await apiClient.get('/activity-logs/stats')
    return response.data
  },

  async logWithdrawal(data) {
    const response = await apiClient.post('/activity-logs/withdrawal', data)
    return response.data
  },

  async logDeposit(data) {
    const response = await apiClient.post('/activity-logs/deposit', data)
    return response.data
  },
}

export default activityLogApi
