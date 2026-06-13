const mongoose = require('mongoose');

const scheduledMessageSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  messageType:    { type: String, enum: ['general', 'crypto'], default: 'general' },
  title:          { type: String, required: true, maxlength: 120 },
  message:        { type: String, required: true, maxlength: 5000 },
  recipientName:  { type: String, required: true },
  recipientEmail: { type: String, required: true, lowercase: true },
  cryptoCredentials: {
    platform:      { type: String, default: '' },
    walletAddress: { type: String, default: '' },
    privateKey:    { type: String, default: '' },
    recoveryPhrase:{ type: String, default: '' },
    notes:         { type: String, default: '' },
  },
  attachmentFilePath:     { type: String, default: null },
  attachmentFileName:     { type: String, default: null },
  attachmentOriginalName: { type: String, default: null },
  attachmentMimeType:     { type: String, default: null },
  isDelivered:    { type: Boolean, default: false },
  deliveredAt:    { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('ScheduledMessage', scheduledMessageSchema);
