/**
 * HodlVault Backend Server
 * Express.js API for oracle data signing and price fetching
 */

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
// import { ORACLE_PUBKEY } from '@hodlvault/shared'
const ORACLE_PUBKEY = '02d09db08af1ff4e8453919cc866a4be427d7bfe18f2c05e5444c196fcf6fd2818'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(helmet())
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:9000'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)
app.use(express.json())

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'HodlVault Backend is running',
    timestamp: new Date().toISOString(),
    oraclePubkey: ORACLE_PUBKEY,
  })
})

// Import API routes
import oracleRoutes from './routes/oracle'
import vaultRoutes from './routes/vault'

// Mount API routes
app.use('/api/v1/oracle', oracleRoutes)
app.use('/api/v1/vault', vaultRoutes)

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`,
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 HodlVault Backend running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
  console.log(`🔑 Oracle Pubkey: ${ORACLE_PUBKEY}`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
})

export default app
