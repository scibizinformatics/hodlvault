import dotenv from 'dotenv'
import connectDB from './config/database.js'
import app from './app.js'

dotenv.config({
  path: '../.env',
})

const startServer = async () => {
  try {
    console.log('MONGODB_URI:', process.env.MONGODB_URI)
    await connectDB()
    console.log('✅ MongoDB connected successfully')
  } catch (err) {
    console.log('⚠️ MongoDB connection failed - starting in mock mode', err.message)
    console.log('   Note: Data will not persist. Fix MongoDB for production use.')
  }

  app.on('error', (error) => {
    console.log('ERROR', error)
    throw error
  })

  app.listen(process.env.PORT || 8000, () => {
    console.log(`✅ Server is running at port: ${process.env.PORT || 8000}`)
    console.log(`   API available at: http://localhost:${process.env.PORT || 8000}/api/v1`)
  })
}

startServer()
