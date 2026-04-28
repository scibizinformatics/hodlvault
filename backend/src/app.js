import express from 'express'

const app = express() // create an express app

app.use(express.json())

// routes import
import vaultRouter from './routes/vault.route.js'
import walletPreferencesRouter from './routes/wallet-preferences.route.js'
import activityLogRouter from './routes/activity-log.route.js'
import autoWithdrawalRouter from './routes/auto-withdrawal.route.js'
import depositWatchRouter from './routes/deposit-watch.route.js'
import sseRouter from './routes/sse.route.js'

// routes declaration
app.use('/api/v1/vaults', vaultRouter)
app.use('/api/v1/wallet/preferences', walletPreferencesRouter)
app.use('/api/v1/activity-logs', activityLogRouter)
app.use('/api/v1/auto-withdrawal', autoWithdrawalRouter)
app.use('/api/v1/deposit-watch', depositWatchRouter)
app.use('/api/v1/events', sseRouter)

// example route: http://localhost:4000/api/v1/vaults

// Global error handler
app.use((err, req, res, next) => {
  console.error('[GlobalError]', err.message, err.stack)
  res.status(500).json({ message: 'Internal server error', error: err.message })
})

export default app
