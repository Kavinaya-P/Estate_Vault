const mongoose = require('mongoose');

const deadmanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  checkIntervalDays:  { type: Number, default: 30 },
  lastConfirmed:      { type: Date, default: Date.now },
  nextCheckDue: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  },
  warningSent:        { type: Boolean, default: false },
  warningSentAt:      { type: Date, default: null },
  triggered:          { type: Boolean, default: false },
  triggeredAt:        { type: Date, default: null },
  consecutiveMisses:  { type: Number, default: 0 },
  // 72-hour contest window
  contestWindowHours: { type: Number, default: 72 },
  contestDeadline:    { type: Date, default: null },
  contestCancelled:   { type: Boolean, default: false },
  contestCancelledAt: { type: Date, default: null },
  escalatedToSecondary: { type: Boolean, default: false },
  escalatedAt:        { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('DeadmanSwitch', deadmanSchema);
