const mongoose = require('mongoose');

const deathRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  requestedByNomineeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Nominee',
    required: true,
  },
  requestedByEmail: { type: String, required: true },
  certificateFilePath: { type: String, default: null },
  certificateFileName: { type: String, default: null },
  certificateOriginalName: { type: String, default: null },
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected'],
    default: 'pending',
  },
  adminNotes: { type: String, default: null },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null,
  },
  reviewedAt: { type: Date, default: null },
  vaultUnlockedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('DeathRequest', deathRequestSchema);
