const AuditLog = require('../models/AuditLog');
const { logger } = require('./logger');

const AUDIT_ACTIONS = {
  // Auth
  USER_REGISTERED:          'USER_REGISTERED',
  USER_LOGIN_SUCCESS:       'USER_LOGIN_SUCCESS',
  USER_LOGIN_FAILED:        'USER_LOGIN_FAILED',
  USER_LOGOUT:              'USER_LOGOUT',
  // 2FA
  /* TWO_FA_SETUP_INITIATED:   'TWO_FA_SETUP_INITIATED',
  TWO_FA_ENABLED:           'TWO_FA_ENABLED',
  TWO_FA_VERIFIED:          'TWO_FA_VERIFIED',
  TWO_FA_FAILED:            'TWO_FA_FAILED', */
  // Vault
  VAULT_CREATED:            'VAULT_CREATED',
  VAULT_ACCESSED:           'VAULT_ACCESSED',
  ASSET_ADDED:              'ASSET_ADDED',
  // Nominees
  NOMINEE_ADDED:            'NOMINEE_ADDED',
  // Dead Man's Switch
  CHECKIN_CONFIRMED:        'CHECKIN_CONFIRMED',
  DEADMAN_WARNING_SENT:     'DEADMAN_WARNING_SENT',
  DEADMAN_TRIGGERED:        'DEADMAN_TRIGGERED',
  // Death Verification
  DEATH_REQUEST_SUBMITTED:  'DEATH_REQUEST_SUBMITTED',
  DEATH_REQUEST_APPROVED:   'DEATH_REQUEST_APPROVED',
  DEATH_REQUEST_REJECTED:   'DEATH_REQUEST_REJECTED',
  // System
  RATE_LIMIT_HIT:           'RATE_LIMIT_HIT',
};

const auditLog = async ({ userId, action, resourceType, resourceId, ipAddress, userAgent, metadata, severity = 'info' }) => {
  try {
    await AuditLog.create({ userId, action, resourceType, resourceId, ipAddress, userAgent, metadata, severity });
    logger.info(`AUDIT [${severity.toUpperCase()}]: ${action}`, { userId });
  } catch (err) {
    logger.error('Audit log write failed:', err.message);
  }
};

module.exports = { auditLog, AUDIT_ACTIONS };
