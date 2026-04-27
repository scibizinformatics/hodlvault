import mongoose from 'mongoose'

const vaultSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    contractAddress: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    priceTargetCents: {
      type: Number,
      required: true,
      min: 0,
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    ownerPkhHex: {
      type: String,
      required: true,
      trim: true,
    },
    oraclePkHex: {
      type: String,
      required: true,
      trim: true,
    },
    originalFundingAddress: {
      type: String,
      required: true,
      trim: true,
    },
    vaultSalt: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    autoWithdrawal: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'withdrawn', 'expired'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Compound indexes for common queries
vaultSchema.index({ walletAddress: 1, status: 1 })
vaultSchema.index({ walletAddress: 1, createdAt: -1 })
vaultSchema.index({ autoWithdrawal: 1, status: 1 })

// Virtual for formatted balance in BCH
vaultSchema.virtual('balanceBCH').get(function () {
  return this.balance / 100000000 // Convert satoshis to BCH
})

// Virtual for checking if vault has funds
vaultSchema.virtual('hasFunds').get(function () {
  return this.balance > 0
})

// Static method to find vaults by wallet address
vaultSchema.statics.findByWalletAddress = function (walletAddress) {
  return this.find({ walletAddress }).sort({ createdAt: -1 })
}

// Static method to check for duplicate vault parameters
vaultSchema.statics.checkDuplicate = function (walletAddress, priceTargetCents) {
  return this.findOne({
    walletAddress: walletAddress.toLowerCase(),
    priceTargetCents: { $gte: priceTargetCents - 0.01, $lte: priceTargetCents + 0.01 },
  })
}

// Instance method to update balance
vaultSchema.methods.updateBalance = function (newBalance) {
  this.balance = Number(newBalance)
  this.updatedAt = new Date()
  // Skip validation for partial updates (priceTargetCents may be missing in old vaults)
  return this.save({ validateBeforeSave: false })
}

// Instance method to mark as withdrawn
vaultSchema.methods.markAsWithdrawn = function () {
  this.status = 'withdrawn'
  this.updatedAt = new Date()
  return this.save()
}

// Pre-save middleware to ensure data consistency
vaultSchema.pre('save', function (next) {
  if (this.isNew) {
    // Normalize addresses to lowercase
    this.contractAddress = this.contractAddress.toLowerCase()
    this.walletAddress = this.walletAddress.toLowerCase()
  }
  next()
})

const Vault = mongoose.model('Vault', vaultSchema)

export { Vault }
