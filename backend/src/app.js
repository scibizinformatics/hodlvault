import express from 'express'

const app = express() // create an express app

app.use(express.json())

// routes import
import vaultRouter from './routes/vault.route.js'
import walletPreferencesRouter from './routes/wallet-preferences.route.js'
import activityLogRouter from './routes/activity-log.route.js'
import autoWithdrawalRouter from './routes/auto-withdrawal.route.js'

// routes declaration
app.use('/api/v1/vaults', vaultRouter)
app.use('/api/v1/wallet/preferences', walletPreferencesRouter)
app.use('/api/v1/activity-logs', activityLogRouter)
app.use('/api/v1/auto-withdrawal', autoWithdrawalRouter)

// example route: http://localhost:4000/api/v1/vaults

export default app
