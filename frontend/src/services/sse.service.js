/**
 * Server-Sent Events (SSE) Service
 * Provides real-time updates from backend
 */

import store from '../store'

let eventSource = null
let reconnectTimeout = null
let isConnecting = false

/**
 * Connect to SSE stream
 */
export function connectSSE() {
  // Prevent multiple simultaneous connections
  if (isConnecting || eventSource?.readyState === EventSource.OPEN) {
    return
  }

  const walletAddress = store.state.wallet?.address
  if (!walletAddress) {
    console.log('[SSE] No wallet address, skipping connection')
    return
  }

  // Close existing connection
  disconnectSSE()

  isConnecting = true

  // Create SSE connection with wallet address in headers via query param
  // Note: EventSource doesn't support custom headers, so we use query param
  const apiUrl = process.env.VUE_APP_API_URL || 'http://localhost:4000/api/v1'
  const url = `${apiUrl}/events/stream?walletAddress=${encodeURIComponent(walletAddress)}`

  console.log('[SSE] Connecting...')
  eventSource = new EventSource(url)

  eventSource.onopen = () => {
    console.log('[SSE] Connected successfully')
    isConnecting = false
    clearTimeout(reconnectTimeout)
  }

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      console.log('[SSE] Received:', data)
      handleSSEEvent(data)
    } catch (err) {
      console.warn('[SSE] Failed to parse message:', err)
    }
  }

  eventSource.onerror = (error) => {
    console.warn('[SSE] Connection error:', error)
    isConnecting = false

    // Auto-reconnect after 5 seconds
    reconnectTimeout = setTimeout(() => {
      console.log('[SSE] Attempting reconnect...')
      connectSSE()
    }, 5000)
  }
}

/**
 * Handle incoming SSE events
 */
function handleSSEEvent(data) {
  switch (data.type) {
    case 'VAULT_WITHDRAWN':
      // Emit custom event for components to listen
      window.dispatchEvent(new CustomEvent('vault-withdrawn', { detail: data }))
      break
    case 'DEPOSIT_CONFIRMED':
      // Emit custom event for deposit confirmation (real-time balance update)
      window.dispatchEvent(new CustomEvent('deposit-confirmed', { detail: data }))
      break
    case 'NEW_ACTIVITY':
      // Emit custom event for new activity log entry
      window.dispatchEvent(new CustomEvent('new-activity', { detail: data }))
      break
    case 'connected':
      console.log('[SSE]', data.message)
      break
    default:
      console.log('[SSE] Unknown event type:', data.type)
  }
}

/**
 * Disconnect SSE
 */
export function disconnectSSE() {
  clearTimeout(reconnectTimeout)

  if (eventSource) {
    eventSource.close()
    eventSource = null
    console.log('[SSE] Disconnected')
  }

  isConnecting = false
}

/**
 * Check if SSE is connected
 */
export function isSSEConnected() {
  return eventSource?.readyState === EventSource.OPEN
}
