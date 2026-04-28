import mongoose from 'mongoose'

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}`, {
      // Connection pool settings
      maxPoolSize: 10,
      minPoolSize: 5,
      // Retry settings
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      // Reconnection settings
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true,
    })

    console.log(`\n MongoDB connected !!!
            ${connectionInstance.connection.host}`)

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err.message)
    })

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Will attempt to reconnect...')
    })

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully')
    })
  } catch (error) {
    console.log('MongoDB connection failed', error)
    throw error
  }
}

export default connectDB
