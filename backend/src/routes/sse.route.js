/**
 * Server-Sent Events (SSE) Routes
 * Provides real-time updates to connected clients
 */

import express from 'express'
import { addClient } from '../services/sse.service.js'

const router = express.Router()

/**
 * GET /api/v1/events/stream
 * SSE endpoint for real-time vault updates
 * Accepts walletAddress via query param (EventSource doesn't support headers)
 */
router.get('/stream', (req, res) => {
  const walletAddress = req.query.walletAddress || req.headers['x-wallet-address']

  if (!walletAddress) {
    return res.status(400).json({ message: 'Wallet address required' })
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // Disable nginx buffering
  res.setHeader('Access-Control-Allow-Origin', '*') // Allow all origins for SSE

  // Send headers immediately
  res.flushHeaders()

  // Add client to SSE service
  addClient(walletAddress, res)
})

export default router
