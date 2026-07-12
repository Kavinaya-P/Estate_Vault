const mongoose = require('mongoose');

const vaultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  vaultName: { type: String, default: 'My Estate Vault' },
  encryptedData: { type: String, default: null }, // AES-256 blob (Phase 2)
  isLocked: { type: Boolean, default: false },
  assets: [
    {
      encryptedAsset: { type: String }, 
      assetType: { type: String, enum: ['password', 'document', 'crypto', 'note', 'other'] },
      label: { type: String },
      createdAt: { type: Date, default: Date.now },
    }
  ],
}, { timestamps: true });

module.exports = mongoose.model('Vault', vaultSchema);
