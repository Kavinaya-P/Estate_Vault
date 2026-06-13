const { deliverMessages } = require('./messageController');
const DeathRequest = require('../models/DeathRequest');
const Nominee = require('../models/Nominee');
const Vault = require('../models/Vault');
const User = require('../models/User');
const Admin = require('../models/Admin');
const ScheduledMessage = require('../models/ScheduledMessage');
const { auditLog, AUDIT_ACTIONS } = require('../config/audit');
const { sendEmail, emailTemplates } = require('../config/email');
const { decrypt } = require('../config/encryption');
const {
  decodeAssetPayload,
  parseDataUrl,
  extensionByMime,
  sanitizeDownloadFilename,
} = require('../config/vaultAsset');
const path = require('path');
const fs = require('fs');
const getFrontendBaseUrl = () => (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const getNomineePortalUrl = (nomineeToken, ownerEmail) => {
  const query = new URLSearchParams({ token: nomineeToken, owner: ownerEmail });
  return `${getFrontendBaseUrl()}/nominee-portal?${query.toString()}`;
};
const getBackendBaseUrl = (req) => {
  const forwardedProtoRaw = req.headers['x-forwarded-proto'];
  const forwardedProto = Array.isArray(forwardedProtoRaw) ? forwardedProtoRaw[0] : forwardedProtoRaw;
  const protocol = (forwardedProto || req.protocol || 'http').split(',')[0].trim();
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${protocol}://${host}`;
};

const createHttpError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const resolveNomineeAndOwner = async (nomineeToken, vaultOwnerEmail) => {
  if (!nomineeToken || !vaultOwnerEmail) {
    throw createHttpError(400, 'nomineeToken and vaultOwnerEmail are required.');
  }

  const owner = await User.findOne({ email: vaultOwnerEmail.toLowerCase() });
  if (!owner) throw createHttpError(404, 'Vault owner not found.');

  const nominee = await Nominee.findOne({
    vaultOwnerId: owner._id,
    status: 'accepted',
    nomineeAccessToken: nomineeToken,
  });
  if (!nominee) throw createHttpError(403, 'Invalid nominee token.');

  return { owner, nominee };
};

const ensureApprovedNomineeAccess = async (nomineeToken, vaultOwnerEmail) => {
  const { owner, nominee } = await resolveNomineeAndOwner(nomineeToken, vaultOwnerEmail);
  const approvedRequest = await DeathRequest.findOne({
    userId: owner._id,
    status: 'approved',
  }).sort({ reviewedAt: -1, createdAt: -1 });
  if (!approvedRequest) {
    throw createHttpError(403, 'Vault access is not available until admin approval.');
  }

  const vault = await Vault.findOne({ userId: owner._id });
  if (!vault || vault.isLocked) {
    throw createHttpError(403, 'Vault is still locked.');
  }

  return { owner, nominee, approvedRequest, vault };
};

const buildNomineeAssetDownloadUrl = (backendBaseUrl, assetId, nomineeToken, vaultOwnerEmail) =>
  `${backendBaseUrl}/api/death/vault-document/${assetId}?nomineeToken=${encodeURIComponent(nomineeToken)}&vaultOwnerEmail=${encodeURIComponent(vaultOwnerEmail)}`;

const buildNomineeMessageAttachmentUrl = (backendBaseUrl, messageId, nomineeToken, vaultOwnerEmail) =>
  `${backendBaseUrl}/api/death/message-attachment/${messageId}?nomineeToken=${encodeURIComponent(nomineeToken)}&vaultOwnerEmail=${encodeURIComponent(vaultOwnerEmail)}`;

const resolveExistingFilePath = (inputPath) => {
  if (!inputPath || typeof inputPath !== 'string') return null;

  const candidates = [
    inputPath,
    path.resolve(inputPath),
    path.resolve(process.cwd(), inputPath),
    path.resolve(__dirname, '..', inputPath),
    path.resolve(__dirname, '..', '..', inputPath),
  ];

  const normalized = [...new Set(candidates.map((p) => path.normalize(p)))];
  for (const filePath of normalized) {
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
};

// ── POST /api/death/request (Public — Nominee Portal) ──
// Nominee submits death certificate via general portal using their invitation token
const submitDeathRequest = async (req, res) => {
  try {
    const { nomineeToken, vaultOwnerEmail } = req.body;

    if (!nomineeToken || !vaultOwnerEmail) {
      return res.status(400).json({ success: false, error: 'Nominee token and vault owner email are required.' });
    }

    // Find the vault owner
    const owner = await User.findOne({ email: vaultOwnerEmail.toLowerCase() });
    if (!owner) return res.status(404).json({ success: false, error: 'Vault owner not found.' });

    // Verify nominee via their invitation token (stored at acceptance time)
    const nominee = await Nominee.findOne({
      vaultOwnerId: owner._id,
      status: 'accepted',
      nomineeAccessToken: nomineeToken,
    });

    if (!nominee) {
      return res.status(403).json({ success: false, error: 'Invalid nominee token or you are not an accepted nominee for this vault.' });
    }

    // Check for existing pending request
    const existing = await DeathRequest.findOne({ userId: owner._id, status: { $in: ['pending', 'under_review'] } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'A death verification request is already pending for this vault.' });
    }

    let certificateFilePath = null;
    let certificateFileName = null;
    let certificateOriginalName = null;

    if (req.file) {
      certificateFilePath = req.file.path;
      certificateFileName = req.file.filename;
      certificateOriginalName = req.file.originalname;
    } else {
      return res.status(400).json({ success: false, error: 'Death certificate file is required.' });
    }

    const deathRequest = await DeathRequest.create({
      userId: owner._id,
      requestedByNomineeId: nominee._id,
      requestedByEmail: nominee.email,
      certificateFilePath,
      certificateFileName,
      certificateOriginalName,
    });

    await auditLog({
      userId: owner._id,
      action: AUDIT_ACTIONS.DEATH_REQUEST_SUBMITTED,
      metadata: { requestedBy: nominee.email },
      severity: 'critical',
    });

    // Notify all admins via email
    const admins = await Admin.find({ isActive: true });
    const adminPanelUrl = `${getFrontendBaseUrl()}/admin/panel`;
    for (const admin of admins) {
      const { subject, html } = emailTemplates.adminDeathCertificateSubmitted(
        admin.fullName, nominee.fullName, owner.fullName, adminPanelUrl
      );
      await sendEmail({ to: admin.email, subject, html }).catch(() => {});
    }

    return res.status(201).json({
      success: true,
      message: 'Death certificate submitted successfully. An admin will review it shortly and you will be notified by email.',
      requestId: deathRequest._id,
    });
  } catch (err) {
    console.error('submitDeathRequest error:', err);
    return res.status(500).json({ success: false, error: 'Failed to submit death request.' });
  }
};

// ── GET /api/admin/death/requests (Admin) ──────────
const getAllRequests = async (req, res) => {
  try {
    const requests = await DeathRequest.find()
      .populate('userId', 'email fullName status')
      .populate('requestedByNomineeId', 'fullName email priorityLevel')
      .sort({ createdAt: -1 });
    return res.json({ success: true, requests });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch requests.' });
  }
};

// ── GET /api/admin/death/requests/:id (Admin) ──────
const getRequest = async (req, res) => {
  try {
    const request = await DeathRequest.findById(req.params.id)
      .populate('userId', 'email fullName status createdAt')
      .populate('requestedByNomineeId', 'fullName email priorityLevel relationship');
    if (!request) return res.status(404).json({ success: false, error: 'Request not found.' });
    return res.json({ success: true, request });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch request.' });
  }
};

// ── POST /api/admin/death/requests/:id/approve (Admin) ─
const approveRequest = async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const request = await DeathRequest.findById(req.params.id).populate('userId');
    if (!request) return res.status(404).json({ success: false, error: 'Request not found.' });
    if (request.status === 'approved') return res.status(400).json({ success: false, error: 'Already approved.' });

    const now = new Date();
    await DeathRequest.findByIdAndUpdate(req.params.id, {
      status: 'approved',
      adminNotes: adminNotes || null,
      reviewedBy: req.adminId,
      reviewedAt: now,
      vaultUnlockedAt: now,
    });

    // Mark user deceased and unlock vault
    await User.findByIdAndUpdate(request.userId._id, { status: 'deceased' });
    await Vault.findOneAndUpdate({ userId: request.userId._id }, { isLocked: false });

    // Deliver all scheduled messages
    await deliverMessages(request.userId._id, request.userId.fullName).catch(e => console.error('Message delivery error:', e));

    // Notify the requesting nominee — send vault access email
    const nominee = await Nominee.findById(request.requestedByNomineeId);
    if (nominee) {
      const portalUrl = nominee.nomineeAccessToken
        ? getNomineePortalUrl(nominee.nomineeAccessToken, request.userId.email)
        : `${getFrontendBaseUrl()}/nominee-portal`;
      const { subject, html } = emailTemplates.vaultUnlocked(nominee.fullName, request.userId.fullName, portalUrl);
      await sendEmail({ to: nominee.email, subject, html });
    }

    await auditLog({
      userId: req.adminId,
      action: AUDIT_ACTIONS.DEATH_REQUEST_APPROVED,
      resourceId: request._id,
      metadata: { vaultOwner: request.userId.email },
      severity: 'critical',
    });

    return res.json({ success: true, message: 'Death request approved. Vault unlocked and nominee notified.' });
  } catch (err) {
    console.error('approveRequest error:', err);
    return res.status(500).json({ success: false, error: 'Failed to approve request.' });
  }
};

// ── POST /api/admin/death/requests/:id/reject (Admin) ─
const rejectRequest = async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const request = await DeathRequest.findById(req.params.id)
      .populate('userId', 'fullName')
      .populate('requestedByNomineeId', 'fullName email');

    if (!request) return res.status(404).json({ success: false, error: 'Request not found.' });

    await DeathRequest.findByIdAndUpdate(req.params.id, {
      status: 'rejected',
      adminNotes: adminNotes || null,
      reviewedBy: req.adminId,
      reviewedAt: new Date(),
    });

    // Notify nominee of rejection
    if (request.requestedByNomineeId) {
      const { subject, html } = emailTemplates.deathRequestRejected(
        request.requestedByNomineeId.fullName,
        request.userId.fullName,
        adminNotes
      );
      await sendEmail({ to: request.requestedByNomineeId.email, subject, html }).catch(() => {});
    }

    await auditLog({
      userId: req.adminId,
      action: AUDIT_ACTIONS.DEATH_REQUEST_REJECTED,
      resourceId: request._id,
      severity: 'warning',
    });

    return res.json({ success: true, message: 'Death request rejected and nominee notified.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to reject request.' });
  }
};

// ── GET /api/admin/death/certificate/:filename (Admin) ─
const downloadCertificate = async (req, res) => {
  try {
    const { filename } = req.params;
    const safeFilename = path.basename(filename);
    if (safeFilename !== filename) {
      return res.status(400).json({ success: false, error: 'Invalid filename.' });
    }
    const uploadDir = path.resolve(process.env.UPLOAD_PATH || './uploads');
    const filePath = path.join(uploadDir, safeFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File not found.' });
    }
    return res.download(filePath, safeFilename);
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to download file.' });
  }
};

// ── GET /api/death/nominee-status (Public) ──────────
// Let nominee check the status of their submitted request
const getNomineeRequestStatus = async (req, res) => {
  try {
    const { nomineeToken, vaultOwnerEmail } = req.query;
    const { owner, nominee } = await resolveNomineeAndOwner(nomineeToken, vaultOwnerEmail);

    const request = await DeathRequest.findOne({ userId: owner._id, requestedByNomineeId: nominee._id })
      .sort({ createdAt: -1 });

    return res.json({ success: true, request: request ? { status: request.status, submittedAt: request.createdAt, adminNotes: request.adminNotes } : null });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.statusCode ? err.message : 'Failed to fetch status.' });
  }
};

// GET /api/death/vault-access (Public nominee token flow)
// Lets approved nominee securely fetch decrypted vault data.
const getNomineeVaultAccess = async (req, res) => {
  try {
    const { nomineeToken, vaultOwnerEmail } = req.query;
    const backendBaseUrl = getBackendBaseUrl(req);
    const { owner, nominee, approvedRequest, vault } = await ensureApprovedNomineeAccess(nomineeToken, vaultOwnerEmail);

    const decryptedAssets = vault.assets.map((asset) => {
      const decoded = decodeAssetPayload(asset.encryptedAsset, decrypt);
      if (!decoded.ok || typeof decoded.data !== 'object' || decoded.data === null) {
        return {
          id: asset._id,
          assetType: asset.assetType,
          label: asset.label,
          createdAt: asset.createdAt,
          error: decoded.error || 'Decryption failed',
        };
      }

      const assetData = { ...decoded.data };
      const parsedDataUrl = parseDataUrl(assetData.fileData);
      if (parsedDataUrl) {
        const fallbackBaseName = sanitizeDownloadFilename(asset.label || 'document');
        const preferredName = sanitizeDownloadFilename(assetData.fileName || fallbackBaseName, fallbackBaseName);
        assetData.documentDownload = {
          fileName: preferredName,
          mimeType: (assetData.fileType || parsedDataUrl.mimeType || 'application/octet-stream').toLowerCase(),
          downloadUrl: buildNomineeAssetDownloadUrl(backendBaseUrl, asset._id, nomineeToken, vaultOwnerEmail),
        };
        delete assetData.fileData;
      }

      return {
        id: asset._id,
        assetType: asset.assetType,
        label: asset.label,
        createdAt: asset.createdAt,
        ...assetData,
      };
    });

    const scheduledMessages = await ScheduledMessage.find({
      userId: owner._id,
      isDelivered: true,
    })
      .sort({ deliveredAt: -1 })
      .select('title message messageType recipientName recipientEmail cryptoCredentials deliveredAt attachmentFilePath attachmentFileName attachmentOriginalName attachmentMimeType');

    const deliveredMessages = scheduledMessages.map((msg) => ({
      id: msg._id,
      title: msg.title,
      message: msg.message,
      messageType: msg.messageType,
      recipientName: msg.recipientName,
      recipientEmail: msg.recipientEmail,
      cryptoCredentials: msg.messageType === 'crypto' ? msg.cryptoCredentials : null,
      deliveredAt: msg.deliveredAt,
      attachment: msg.attachmentFilePath
        ? {
          fileName: sanitizeDownloadFilename(msg.attachmentOriginalName || msg.attachmentFileName || 'attachment'),
          mimeType: (msg.attachmentMimeType || 'application/octet-stream').toLowerCase(),
          downloadUrl: buildNomineeMessageAttachmentUrl(backendBaseUrl, msg._id, nomineeToken, vaultOwnerEmail),
        }
        : null,
    }));

    return res.json({
      success: true,
      owner: {
        id: owner._id,
        fullName: owner.fullName,
        email: owner.email,
      },
      nominee: {
        id: nominee._id,
        fullName: nominee.fullName,
        email: nominee.email,
        priorityLevel: nominee.priorityLevel,
      },
      approval: {
        reviewedAt: approvedRequest.reviewedAt,
        adminNotes: approvedRequest.adminNotes,
      },
      vault: {
        id: vault._id,
        vaultName: vault.vaultName,
        assetCount: vault.assets.length,
        assets: decryptedAssets,
        updatedAt: vault.updatedAt,
      },
      deliveredMessages,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.statusCode ? err.message : 'Failed to fetch nominee vault access.' });
  }
};

// GET /api/death/vault-document/:assetId (Public nominee token flow)
// Streams a stored document asset for an approved nominee.
const downloadNomineeVaultDocument = async (req, res) => {
  try {
    const { nomineeToken, vaultOwnerEmail } = req.query;
    const { assetId } = req.params;
    const { owner, vault } = await ensureApprovedNomineeAccess(nomineeToken, vaultOwnerEmail);

    const asset = vault.assets.id(assetId);
    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found.' });
    }

    const decoded = decodeAssetPayload(asset.encryptedAsset, decrypt);
    if (!decoded.ok || typeof decoded.data !== 'object' || decoded.data === null) {
      return res.status(422).json({ success: false, error: decoded.error || 'Unable to decrypt document asset.' });
    }

    const parsedDataUrl = parseDataUrl(decoded.data.fileData);
    if (!parsedDataUrl) {
      return res.status(404).json({ success: false, error: 'No downloadable document found for this asset.' });
    }

    const fileBuffer = Buffer.from(parsedDataUrl.base64Data, 'base64');
    const mimeType = (decoded.data.fileType || parsedDataUrl.mimeType || 'application/octet-stream').toLowerCase();
    const fallbackName = sanitizeDownloadFilename(asset.label || `${owner.fullName}-document`, 'document');
    const requestedName = sanitizeDownloadFilename(decoded.data.fileName || fallbackName, fallbackName);
    const ext = extensionByMime(mimeType);
    const finalName = path.extname(requestedName) ? requestedName : `${requestedName}${ext}`;

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${finalName}"`);
    return res.send(fileBuffer);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.statusCode ? err.message : 'Failed to download vault document.' });
  }
};

// GET /api/death/message-attachment/:messageId (Public nominee token flow)
// Downloads delivered scheduled-message attachments for approved nominee access.
const downloadNomineeMessageAttachment = async (req, res) => {
  try {
    const { nomineeToken, vaultOwnerEmail } = req.query;
    const { messageId } = req.params;
    const { owner } = await ensureApprovedNomineeAccess(nomineeToken, vaultOwnerEmail);

    const message = await ScheduledMessage.findOne({
      _id: messageId,
      userId: owner._id,
      isDelivered: true,
    });
    if (!message) {
      return res.status(404).json({ success: false, error: 'Delivered message not found.' });
    }
    const filePath = resolveExistingFilePath(message.attachmentFilePath);
    if (!filePath) {
      return res.status(404).json({ success: false, error: 'Attachment file not found.' });
    }

    const fileName = sanitizeDownloadFilename(
      message.attachmentOriginalName || message.attachmentFileName || 'attachment'
    );
    return res.download(filePath, fileName);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.statusCode ? err.message : 'Failed to download message attachment.' });
  }
};

module.exports = {
  submitDeathRequest,
  getAllRequests,
  getRequest,
  approveRequest,
  rejectRequest,
  downloadCertificate,
  getNomineeRequestStatus,
  getNomineeVaultAccess,
  downloadNomineeVaultDocument,
  downloadNomineeMessageAttachment,
};
