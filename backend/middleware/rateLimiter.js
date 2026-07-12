const rateLimit = require('express-rate-limit');
const { auditLog, AUDIT_ACTIONS } = require('../config/audit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests. Try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many auth attempts. Try again in 15 minutes.' },
  handler: async (req, res, next, options) => {
    await auditLog({ action: AUDIT_ACTIONS.RATE_LIMIT_HIT, ipAddress: req.ip, metadata: { endpoint: req.path }, severity: 'warning' });
    res.status(options.statusCode).json(options.message);
  }
});

const twoFaLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many 2FA attempts. Wait 5 minutes.' },
}); 

module.exports = { apiLimiter, authLimiter, twoFaLimiter };
