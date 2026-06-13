const crypto = require('crypto');
const Nominee = require('../models/Nominee');
const User = require('../models/User');
const { auditLog, AUDIT_ACTIONS } = require('../config/audit');
const { sendEmail, emailTemplates } = require('../config/email');

const getInviteBaseUrl = (req) => {
  if (process.env.NOMINEE_INVITE_BASE_URL) return process.env.NOMINEE_INVITE_BASE_URL.replace(/\/$/, '');
  if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.includes('localhost')) return process.env.FRONTEND_URL.replace(/\/$/, '');
  const origin = req.headers.origin || req.headers.referer;
  if (origin) { try { return new URL(origin).origin; } catch {} }
  return process.env.FRONTEND_URL || 'http://localhost:3000';
};

const getNominees = async (req, res) => {
  try {
    const nominees = await Nominee.find({ vaultOwnerId: req.userId }).sort({ priorityLevel: 1, createdAt: 1 });
    return res.json({ success: true, nominees });
  } catch { return res.status(500).json({ success: false, error: 'Failed to fetch nominees.' }); }
};

const addNominee = async (req, res) => {
  try {
    const { fullName, email, relationship, priorityLevel, phone } = req.body;
    if (!fullName || !email) return res.status(400).json({ success: false, error: 'Full name and email are required.' });
    const existingCount = await Nominee.countDocuments({ vaultOwnerId: req.userId, priorityLevel });
    if (existingCount >= 1) {
      const label = priorityLevel === 1 ? 'primary' : 'secondary';
      return res.status(400).json({ success: false, error: `You already have a ${label} nominee. Remove them first.` });
    }
    const owner = await User.findById(req.userId);
    if (owner.email === email.toLowerCase()) return res.status(400).json({ success: false, error: 'You cannot add yourself as a nominee.' });

    const invitationToken   = crypto.randomBytes(32).toString('hex');
    const invitationExpiry  = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const nomineeAccessToken = crypto.randomBytes(40).toString('hex');
    const nomineeUser = await User.findOne({ email: email.toLowerCase() });

    const nominee = await Nominee.create({
      vaultOwnerId: req.userId, fullName, email: email.toLowerCase(),
      relationship, priorityLevel: priorityLevel || 1, phone,
      invitationToken, invitationExpiry, nomineeAccessToken,
      nomineeUserId: nomineeUser?._id || null,
    });

    const baseUrl    = getInviteBaseUrl(req);
    const acceptUrl  = `${baseUrl}/accept-nomination?token=${invitationToken}&action=accept`;
    const declineUrl = `${baseUrl}/accept-nomination?token=${invitationToken}&action=decline`;
    const { subject, html } = emailTemplates.nomineeInvite(fullName, owner.fullName, acceptUrl, declineUrl);
    await sendEmail({ to: email, subject, html });
    await auditLog({ userId: req.userId, action: AUDIT_ACTIONS.NOMINEE_ADDED, metadata: { email, priorityLevel }, ipAddress: req.ip });
    return res.status(201).json({ success: true, message: 'Nominee added. Invitation email sent.', nominee });
  } catch (err) {
    console.error('addNominee error:', err);
    return res.status(500).json({ success: false, error: 'Failed to add nominee.' });
  }
};

const removeNominee = async (req, res) => {
  try {
    const nominee = await Nominee.findOneAndDelete({ _id: req.params.nomineeId, vaultOwnerId: req.userId });
    if (!nominee) return res.status(404).json({ success: false, error: 'Nominee not found.' });
    await auditLog({ userId: req.userId, action: 'NOMINEE_REMOVED', metadata: { nomineeId: req.params.nomineeId }, ipAddress: req.ip });
    return res.json({ success: true, message: 'Nominee removed.' });
  } catch { return res.status(500).json({ success: false, error: 'Failed to remove nominee.' }); }
};

const acceptInvitation = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, error: 'Token required.' });
    const nominee = await Nominee.findOne({ invitationToken: token, invitationExpiry: { $gt: new Date() } });
    if (!nominee) return res.status(400).json({ success: false, error: 'Invalid or expired invitation. Ask vault owner to resend.' });
    await Nominee.findByIdAndUpdate(nominee._id, { status: 'accepted', invitationToken: null, invitationExpiry: null });
    const owner = await User.findById(nominee.vaultOwnerId);
    if (owner) {
      const { subject, html } = emailTemplates.nomineeAccepted(owner.fullName, nominee.fullName, nominee.email);
      await sendEmail({ to: owner.email, subject, html }).catch(() => {});
    }
    return res.json({ success: true, message: 'Invitation accepted. You are now a registered nominee.', nomineeAccessToken: nominee.nomineeAccessToken });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to accept invitation.' });
  }
};

const declineInvitation = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, error: 'Token required.' });
    const nominee = await Nominee.findOne({ invitationToken: token, invitationExpiry: { $gt: new Date() } });
    if (!nominee) return res.status(400).json({ success: false, error: 'Invalid or expired invitation.' });
    await Nominee.findByIdAndUpdate(nominee._id, { status: 'declined', invitationToken: null, invitationExpiry: null });
    const owner = await User.findById(nominee.vaultOwnerId);
    if (owner) {
      const { subject, html } = emailTemplates.nomineeDeclined(owner.fullName, nominee.fullName, nominee.email);
      await sendEmail({ to: owner.email, subject, html }).catch(() => {});
    }
    return res.json({ success: true, message: 'Invitation declined.' });
  } catch { return res.status(500).json({ success: false, error: 'Failed to decline.' }); }
};

const resendInvitation = async (req, res) => {
  try {
    const nominee = await Nominee.findOne({ _id: req.params.nomineeId, vaultOwnerId: req.userId });
    if (!nominee) return res.status(404).json({ success: false, error: 'Nominee not found.' });
    if (nominee.status === 'accepted') return res.status(400).json({ success: false, error: 'Nominee already accepted.' });
    const invitationToken  = crypto.randomBytes(32).toString('hex');
    const invitationExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await Nominee.findByIdAndUpdate(nominee._id, { invitationToken, invitationExpiry, status: 'pending' });
    const baseUrl    = getInviteBaseUrl(req);
    const acceptUrl  = `${baseUrl}/accept-nomination?token=${invitationToken}&action=accept`;
    const declineUrl = `${baseUrl}/accept-nomination?token=${invitationToken}&action=decline`;
    const owner = await User.findById(req.userId);
    const { subject, html } = emailTemplates.nomineeInvite(nominee.fullName, owner.fullName, acceptUrl, declineUrl);
    await sendEmail({ to: nominee.email, subject, html });
    return res.json({ success: true, message: 'Invitation resent.' });
  } catch { return res.status(500).json({ success: false, error: 'Failed to resend.' }); }
};

module.exports = { getNominees, addNominee, removeNominee, acceptInvitation, declineInvitation, resendInvitation };
