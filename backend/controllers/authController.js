const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const User = require('../models/User');
const Vault = require('../models/Vault');
const DeadmanSwitch = require('../models/DeadmanSwitch');
const { auditLog, AUDIT_ACTIONS } = require('../config/audit');
const { sendEmail, emailTemplates } = require('../config/email');

const SALT_ROUNDS = 12;
const OTP_EXPIRY_MINUTES = 10;

// ── Helpers ────────────────────────────────────────
const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const generateOtp = () => crypto.randomInt(100000, 999999).toString();

const clientInfo = (req) => ({
  ipAddress: req.ip || req.connection?.remoteAddress,
  userAgent: req.get('User-Agent'),
});

// ── POST /api/auth/register ─────────────────────────
const register = async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    const { ipAddress, userAgent } = clientInfo(req);

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const otp = generateOtp();
    const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const user = await User.create({
      email,
      passwordHash,
      fullName,
      status: 'pending_verification',
      emailVerification: { otp, expiry, verified: false },
    });

    // Create vault + dead man's switch
    await Vault.create({ userId: user._id, vaultName: `${fullName}'s Estate Vault` });
    await DeadmanSwitch.create({ userId: user._id });

    // Send OTP email
    const { subject, html } = emailTemplates.emailVerificationOtp(fullName, otp);
    await sendEmail({ to: email, subject, html });

    await auditLog({ userId: user._id, action: AUDIT_ACTIONS.USER_REGISTERED, ipAddress, userAgent, metadata: { email } });

    return res.status(201).json({
      success: true,
      message: 'Account created. A 6-digit verification code has been sent to your email.',
      userId: user._id,
      email: user.email,
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  }
};

// ── POST /api/auth/verify-email ─────────────────────
const verifyEmail = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId)
      .select('+emailVerification.otp +emailVerification.expiry +emailVerification.verified');

    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });
    if (user.emailVerification.verified) {
      return res.status(400).json({ success: false, error: 'Email already verified.' });
    }
    if (!user.emailVerification.otp || user.emailVerification.expiry < new Date()) {
      return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new one.' });
    }
    if (user.emailVerification.otp !== otp.trim()) {
      return res.status(401).json({ success: false, error: 'Invalid OTP. Please try again.' });
    }

    await User.findByIdAndUpdate(userId, {
      status: 'active',
      'emailVerification.verified': true,
      'emailVerification.otp': null,
      'emailVerification.expiry': null,
    });

    const token = generateToken(user._id);
    const updatedUser = await User.findById(user._id);

    await auditLog({ userId: user._id, action: 'EMAIL_VERIFIED', ipAddress: req.ip });

    return res.status(200).json({
      success: true,
      message: 'Email verified. Welcome to Estate Vault.',
      token,
      user: { id: updatedUser._id, email: updatedUser.email, fullName: updatedUser.fullName, status: updatedUser.status },
    });
  } catch (err) {
    console.error('verifyEmail error:', err);
    return res.status(500).json({ success: false, error: 'Verification failed.' });
  }
};

// ── POST /api/auth/resend-verification ─────────────
const resendVerificationOtp = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId).select('+emailVerification.verified');

    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });
    if (user.emailVerification?.verified) {
      return res.status(400).json({ success: false, error: 'Email already verified.' });
    }

    const otp = generateOtp();
    const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await User.findByIdAndUpdate(userId, {
      'emailVerification.otp': otp,
      'emailVerification.expiry': expiry,
    });

    const { subject, html } = emailTemplates.emailVerificationOtp(user.fullName, otp);
    await sendEmail({ to: user.email, subject, html });

    return res.json({ success: true, message: 'New verification code sent.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to resend OTP.' });
  }
};

// ── POST /api/auth/login ────────────────────────────
// Step 1: Verify password → send email OTP
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { ipAddress, userAgent } = clientInfo(req);

    const user = await User.findOne({ email }).select('+passwordHash +loginOtp');

    if (!user) {
      await bcrypt.hash(password, SALT_ROUNDS); // timing-safe
      await auditLog({ action: AUDIT_ACTIONS.USER_LOGIN_FAILED, ipAddress, userAgent, metadata: { email, reason: 'user_not_found' }, severity: 'warning' });
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    if (user.status === 'suspended') return res.status(403).json({ success: false, error: 'Account suspended. Contact support.' });
    if (user.status === 'pending_verification') return res.status(403).json({ success: false, error: 'Please verify your email before logging in.' });
    if (user.status === 'deceased') return res.status(403).json({ success: false, error: 'This account is inactive.' });

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      await auditLog({ userId: user._id, action: AUDIT_ACTIONS.USER_LOGIN_FAILED, ipAddress, userAgent, metadata: { reason: 'wrong_password' }, severity: 'warning' });
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    // Generate and store login OTP
    const otp = generateOtp();
    const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await User.findByIdAndUpdate(user._id, {
      'loginOtp.otp': otp,
      'loginOtp.expiry': expiry,
    });

    // Send login OTP to user's email
    const { subject, html } = emailTemplates.loginOtp(user.fullName, otp);
    await sendEmail({ to: user.email, subject, html });

    await auditLog({ userId: user._id, action: 'LOGIN_OTP_SENT', ipAddress, userAgent });

    return res.status(200).json({
      success: true,
      requiresOtp: true,
      message: 'Password verified. A 6-digit login code has been sent to your email.',
      userId: user._id,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'Login failed.' });
  }
};

// ── POST /api/auth/verify-login-otp ────────────────
// Step 2: Verify email OTP → issue JWT
const verifyLoginOtp = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const { ipAddress, userAgent } = clientInfo(req);

    const user = await User.findById(userId).select('+loginOtp.otp +loginOtp.expiry');

    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });
    if (!user.loginOtp?.otp || user.loginOtp.expiry < new Date()) {
      return res.status(400).json({ success: false, error: 'OTP has expired. Please log in again.' });
    }
    if (user.loginOtp.otp !== otp.trim()) {
      await auditLog({ userId: user._id, action: 'LOGIN_OTP_FAILED', ipAddress, severity: 'warning' });
      return res.status(401).json({ success: false, error: 'Invalid OTP. Please try again.' });
    }

    // Clear OTP and update last login
    await User.findByIdAndUpdate(user._id, {
      'loginOtp.otp': null,
      'loginOtp.expiry': null,
      lastLogin: new Date(),
    });

    const token = generateToken(user._id);
    const freshUser = await User.findById(user._id);

    await auditLog({ userId: user._id, action: AUDIT_ACTIONS.USER_LOGIN_SUCCESS, ipAddress, userAgent });

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: freshUser._id,
        email: freshUser.email,
        fullName: freshUser.fullName,
        status: freshUser.status,
      },
    });
  } catch (err) {
    console.error('verifyLoginOtp error:', err);
    return res.status(500).json({ success: false, error: 'OTP verification failed.' });
  }
};

// ── GET /api/auth/me ────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        status: user.status,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch profile.' });
  }
};

module.exports = { register, verifyEmail, resendVerificationOtp, login, verifyLoginOtp, getMe };
