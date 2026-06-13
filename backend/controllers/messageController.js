const fs = require('fs');
const ScheduledMessage = require('../models/ScheduledMessage');
const { auditLog } = require('../config/audit');
const { sendEmail } = require('../config/email');

const trim = (value) => (typeof value === 'string' ? value.trim() : value);
const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
const deleteIfExists = (filePath) => {
  if (!filePath) return;
  if (!fs.existsSync(filePath)) return;
  try { fs.unlinkSync(filePath); } catch {}
};

const parseCryptoCredentials = (body = {}) => {
  const creds = {
    platform: trim(body.cryptoPlatform || ''),
    walletAddress: trim(body.cryptoWalletAddress || ''),
    privateKey: trim(body.cryptoPrivateKey || ''),
    recoveryPhrase: trim(body.cryptoRecoveryPhrase || ''),
    notes: trim(body.cryptoNotes || ''),
  };
  const hasAny = Object.values(creds).some(hasText);
  return { hasAny, creds };
};

const buildAttachmentPayload = (file) => {
  if (!file) return null;
  return {
    attachmentFilePath: file.path,
    attachmentFileName: file.filename,
    attachmentOriginalName: file.originalname,
    attachmentMimeType: file.mimetype,
  };
};

const getMessages = async (req, res) => {
  try {
    const messages = await ScheduledMessage.find({ userId: req.userId }).sort({ createdAt: -1 });
    return res.json({ success: true, messages });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch messages.' });
  }
};

const createMessage = async (req, res) => {
  try {
    const { title, message, recipientName, recipientEmail } = req.body;
    const requestedType = trim(req.body.messageType || 'general');
    const { hasAny, creds } = parseCryptoCredentials(req.body);

    if (!title || !message || !recipientEmail) {
      return res.status(400).json({ success: false, error: 'Title, message, and recipient email are required.' });
    }

    const messageType = requestedType === 'crypto' || hasAny ? 'crypto' : 'general';
    const attachment = buildAttachmentPayload(req.file);

    const msg = await ScheduledMessage.create({
      userId: req.userId,
      title: trim(title),
      message: trim(message),
      recipientName: trim(recipientName) || trim(recipientEmail),
      recipientEmail: trim(recipientEmail).toLowerCase(),
      messageType,
      cryptoCredentials: creds,
      ...attachment,
    });

    await auditLog({
      userId: req.userId,
      action: 'SCHEDULED_MESSAGE_CREATED',
      metadata: { recipientEmail, messageType, hasAttachment: !!attachment },
    });

    return res.status(201).json({ success: true, message: 'Message saved.', data: msg });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to create message.' });
  }
};

const updateMessage = async (req, res) => {
  try {
    const existing = await ScheduledMessage.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDelivered: false,
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Message not found or already delivered.' });
    }

    const { title, message, recipientName, recipientEmail } = req.body;
    const requestedType = trim(req.body.messageType || 'general');
    const removeAttachment = req.body.removeAttachment === 'true';
    const { hasAny, creds } = parseCryptoCredentials(req.body);

    if (!title || !message || !recipientEmail) {
      return res.status(400).json({ success: false, error: 'Title, message, and recipient email are required.' });
    }

    existing.title = trim(title);
    existing.message = trim(message);
    existing.recipientName = trim(recipientName) || trim(recipientEmail);
    existing.recipientEmail = trim(recipientEmail).toLowerCase();
    existing.messageType = requestedType === 'crypto' || hasAny ? 'crypto' : 'general';
    existing.cryptoCredentials = creds;

    if (req.file) {
      deleteIfExists(existing.attachmentFilePath);
      Object.assign(existing, buildAttachmentPayload(req.file));
    } else if (removeAttachment) {
      deleteIfExists(existing.attachmentFilePath);
      existing.attachmentFilePath = null;
      existing.attachmentFileName = null;
      existing.attachmentOriginalName = null;
      existing.attachmentMimeType = null;
    }

    await existing.save();
    return res.json({ success: true, message: 'Updated.', data: existing });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to update.' });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const msg = await ScheduledMessage.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
      isDelivered: false,
    });
    if (!msg) return res.status(404).json({ success: false, error: 'Message not found or already delivered.' });

    deleteIfExists(msg.attachmentFilePath);
    return res.json({ success: true, message: 'Deleted.' });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to delete.' });
  }
};

const renderCryptoSection = (msg) => {
  if (msg.messageType !== 'crypto') return '';
  const creds = msg.cryptoCredentials || {};
  const lines = [
    creds.platform ? `<div><strong>Platform:</strong> ${creds.platform}</div>` : '',
    creds.walletAddress ? `<div><strong>Wallet Address:</strong> ${creds.walletAddress}</div>` : '',
    creds.privateKey ? `<div><strong>Private Key:</strong> ${creds.privateKey}</div>` : '',
    creds.recoveryPhrase ? `<div><strong>Recovery Phrase:</strong> ${creds.recoveryPhrase}</div>` : '',
    creds.notes ? `<div><strong>Notes:</strong> ${creds.notes}</div>` : '',
  ].filter(Boolean).join('');
  if (!lines) return '';
  return `
    <div style="margin-top:24px;padding:14px;border:1px solid #2a2a35;background:#121218;">
      <div style="font-size:12px;letter-spacing:1px;color:#c9a84c;margin-bottom:10px;text-transform:uppercase;">
        Crypto Credentials
      </div>
      <div style="font-size:12px;line-height:1.8;color:#eeeef8;word-break:break-all;">
        ${lines}
      </div>
    </div>
  `;
};

// Called by deathController after vault unlock
const deliverMessages = async (userId, ownerName) => {
  const messages = await ScheduledMessage.find({ userId, isDelivered: false });
  const results = [];

  for (const msg of messages) {
    try {
      const html = `
        <div style="font-family:monospace;background:#0a0a0b;color:#c8c8d8;padding:40px;max-width:520px;margin:0 auto;border:1px solid #2a2a35;">
          <div style="color:#c9a84c;font-size:20px;margin-bottom:8px;letter-spacing:2px;">ESTATE VAULT</div>
          <div style="color:#5a5a6e;font-size:11px;margin-bottom:32px;letter-spacing:1px;">A FINAL MESSAGE FROM ${ownerName.toUpperCase()}</div>
          <div style="font-size:18px;color:#eeeef8;margin-bottom:20px;">${msg.title}</div>
          <div style="line-height:1.9;font-size:13px;white-space:pre-wrap;border-left:2px solid #c9a84c;padding-left:16px;">${msg.message}</div>
          ${renderCryptoSection(msg)}
          <p style="color:#5a5a6e;font-size:11px;margin-top:32px;">This message was written by ${ownerName} and scheduled for delivery through Digital Estate Vault.</p>
        </div>`;

      const attachments = [];
      if (msg.attachmentFilePath && fs.existsSync(msg.attachmentFilePath)) {
        attachments.push({
          filename: msg.attachmentOriginalName || msg.attachmentFileName || 'attachment',
          path: msg.attachmentFilePath,
          contentType: msg.attachmentMimeType || undefined,
        });
      }

      await sendEmail({
        to: msg.recipientEmail,
        subject: `A message from ${ownerName} - ${msg.title}`,
        html,
        attachments,
      });

      await ScheduledMessage.findByIdAndUpdate(msg._id, { isDelivered: true, deliveredAt: new Date() });
      results.push({ id: msg._id, recipient: msg.recipientEmail, status: 'sent' });
    } catch (err) {
      results.push({ id: msg._id, recipient: msg.recipientEmail, status: 'failed', error: err.message });
    }
  }

  return results;
};

module.exports = { getMessages, createMessage, updateMessage, deleteMessage, deliverMessages };
