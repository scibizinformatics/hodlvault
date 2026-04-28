/**
 * Server-Sent Events (SSE) Service
 * Manages real-time updates to connected clients
 */

// Store connected clients by wallet address
const clients = new Map()

/**
 * Add a client connection
 */
export function addClient(walletAddress, response) {
  const key = walletAddress.toLowerCase()
  
  // Close existing connection if any
  const existing = clients.get(key)
  if (existing && !existing.writableEnded) {
    existing.end()
  }
  
  clients.set(key, response)
  console.log(`[SSE] Client connected: ${key} (${clients.size} total)`)
  
  // Send initial connection message
  sendEvent(key, { type: 'connected', message: 'Real-time updates active' })
  
  // Clean up on disconnect
  response.on('close', () => {
    clients.delete(key)
    console.log(`[SSE] Client disconnected: ${key} (${clients.size} remaining)`)
  })
}

/**
 * Send event to a specific wallet address
 */
export function sendEvent(walletAddress, data) {
  const key = walletAddress.toLowerCase()
  const client = clients.get(key)
  
  if (client && !client.writableEnded) {
    client.write(`data: ${JSON.stringify(data)}\n\n`)
    return true
  }
  return false
}

/**
 * Broadcast event to all connected clients
 */
export function broadcastEvent(data) {
  let sent = 0
  clients.forEach((client, key) => {
    if (!client.writableEnded) {
      client.write(`data: ${JSON.stringify(data)}\n\n`)
      sent++
    } else {
      clients.delete(key)
    }
  })
  return sent
}

/**
 * Get connected client count
 */
export function getClientCount() {
  return clients.size
}
