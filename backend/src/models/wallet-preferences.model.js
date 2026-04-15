import mongoose from 'mongoose'

const walletPreferencesSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    preferences: {
      autoWithdrawal: {
        type: Boolean,
        default: false,
      },
      notifications: {
        type: Boolean,
        default: true,
      },
      defaultOracle: {
        type: String,
        default: 'oracles.cash',
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'auto',
      },
    },
  },
  {
    timestamps: true,
  }
)

// Static method to find preferences by wallet address
walletPreferencesSchema.statics.findByWalletAddress = function (walletAddress) {
  return this.findOne({ walletAddress: walletAddress.toLowerCase() })
}

// Static method to get or create preferences
walletPreferencesSchema.statics.getOrCreate = async function (walletAddress) {
  const normalizedAddress = walletAddress.toLowerCase()
  
  let preferences = await this.findOne({ walletAddress: normalizedAddress })
  
  if (!preferences) {
    preferences = new this({
      walletAddress: normalizedAddress,
      preferences: {
        autoWithdrawal: false,
        notifications: true,
        defaultOracle: 'oracles.cash',
        theme: 'auto',
      },
    })
    await preferences.save()
  }
  
  return preferences
}

// Static method to update preferences
walletPreferencesSchema.statics.updatePreferences = async function (walletAddress, newPreferences) {
  const normalizedAddress = walletAddress.toLowerCase()
  
  // Allowed preference fields
  const allowedFields = ['autoWithdrawal', 'notifications', 'defaultOracle', 'theme']
  const updateData = {}
  
  allowedFields.forEach((field) => {
    if (newPreferences[field] !== undefined) {
      updateData[`preferences.${field}`] = newPreferences[field]
    }
  })
  
  const preferences = await this.findOneAndUpdate(
    { walletAddress: normalizedAddress },
    { $set: updateData },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  )
  
  return preferences
}

// Static method to delete preferences
walletPreferencesSchema.statics.deleteByWalletAddress = function (walletAddress) {
  return this.findOneAndDelete({ walletAddress: walletAddress.toLowerCase() })
}

const WalletPreferences = mongoose.model('WalletPreferences', walletPreferencesSchema)

export { WalletPreferences }
