const router = require('express').Router();
const upload = require('../middleware/upload');
const {
  submitDeathRequest,
  getNomineeRequestStatus,
  getNomineeVaultAccess,
  downloadNomineeVaultDocument,
  downloadNomineeMessageAttachment,
} = require('../controllers/deathController');

// ── Public routes — no auth required ──────────────
// Nominees use their nomineeAccessToken to authenticate
router.post('/request',        upload.single('certificate'), submitDeathRequest);
router.get('/nominee-status',  getNomineeRequestStatus);
router.get('/vault-access',    getNomineeVaultAccess);
router.get('/vault-document/:assetId', downloadNomineeVaultDocument);
router.get('/message-attachment/:messageId', downloadNomineeMessageAttachment);

module.exports = router;
