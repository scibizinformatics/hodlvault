import express from 'express'

const app = express() // create an express app

app.use(express.json())

// routes import
import postRouter from './routes/post.route.js'
import vaultRouter from './routes/vault.route.js'
import walletPreferencesRouter from './routes/wallet-preferences.route.js'

// routes declaration
app.use('/api/v1/posts', postRouter)
app.use('/api/v1/vaults', vaultRouter)
app.use('/api/v1/wallet/preferences', walletPreferencesRouter)

// example route: http://localhost:4000/api/v1/vaults

export default app
