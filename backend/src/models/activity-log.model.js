import mongoose from 'mongoose'

const activityLogSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    lowercase: true,
    index: true,
  },
  activityType: {
    type: String,
    required: true,
    enum: ['VAULT_CREATED', 'DEPOSIT', 'WITHDRAWAL', 'PRICE_TARGET_REACHED', 'VAULT_DELETED'],
  },
  vaultId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vault',
    required: false,
  },
  vaultName: {
    type: String,
    required: false,
  },
  contractAddress: {
    type: String,
    required: false,
  },
  details: {
    amountSatoshis: Number,
    amountBCH: Number,
    priceTargetCents: Number,
    currentPriceCents: Number,
    txHash: String,
    oracleMessageHex: String,
    notes: String,
  },
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED'],
    default: 'SUCCESS',
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
})

activityLogSchema.index({ walletAddress: 1, timestamp: -1 })

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema)
