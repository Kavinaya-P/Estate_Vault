const DeadmanSwitch = require('../models/DeadmanSwitch');
const Nominee = require('../models/Nominee');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { sendEmail, emailTemplates } = require('../config/email');
const { auditLog, AUDIT_ACTIONS } = require('../config/audit');
const { logger } = require('../config/logger');
const getFrontendBaseUrl = () => (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const getNomineePortalUrl = (nomineeToken, ownerEmail) => {
  if (!nomineeToken || !ownerEmail) return `${getFrontendBaseUrl()}/nominee-portal`;
  const query = new URLSearchParams({ token: nomineeToken, owner: ownerEmail });
  return `${getFrontendBaseUrl()}/nominee-portal?${query.toString()}`;
};

// ─── TEST 1: Simulate 30 days passed — trigger dead man's switch ───
const simulateTrigger = async (req, res) => {
  try {
    const userId = req.userId;

    // Set lastConfirmed to 31 days ago — makes it overdue
    const pastDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const pastDue  = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

    await DeadmanSwitch.findOneAndUpdate(
      { userId },
      {
        lastConfirmed:     pastDate,
        nextCheckDue:      pastDue,
        warningSent:       true,
        warningSentAt:     new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        triggered:         true,
        triggeredAt:       new Date(),
        consecutiveMisses: 1,
      }
    );

    // Notify primary nominee first (or secondary if no primary)
    const nominees = await Nominee.find({ vaultOwnerId: userId, status: 'accepted' }).sort({ priorityLevel: 1 });
    const owner    = await User.findById(userId);
    const notified = [];
    
    const primary = nominees.find(n => n.priorityLevel === 1);
    const secondary = nominees.find(n => n.priorityLevel === 2);
    const activeNominee = primary || secondary;

    if (activeNominee) {
      const nomineePortalUrl = getNomineePortalUrl(activeNominee.nomineeAccessToken, owner?.email);
      const { subject, html } = emailTemplates.deadmanTriggered(activeNominee.fullName, owner.fullName, nomineePortalUrl);
      await sendEmail({ to: activeNominee.email, subject, html });
      notified.push({ name: activeNominee.fullName, email: activeNominee.email, priority: activeNominee.priorityLevel });
      
      // Update DeadmanSwitch immediately if it escalated directly to secondary
      if (!primary && secondary) {
        await DeadmanSwitch.findOneAndUpdate({ userId }, { escalatedToSecondary: true, escalatedAt: new Date() });
      }
    }

    await auditLog({
      userId,
      action: AUDIT_ACTIONS.DEADMAN_TRIGGERED,
      metadata: { simulated: true, nomineesNotified: notified.length },
      severity: 'critical',
    });

    return res.json({
      success: true,
      message: 'Dead man\'s switch triggered (simulated).',
      simulated: {
        lastConfirmed:     pastDate,
        triggeredAt:       new Date(),
        consecutiveMisses: 1,
        nomineesNotified:  notified,
      }
    });
  } catch (err) {
    logger.error('simulateTrigger error:', err);
    return res.status(500).json({ success: false, error: 'Simulation failed.' });
  }
};

// ─── TEST 2: Simulate warning state (25 days passed) ──────────────
const simulateWarning = async (req, res) => {
  try {
    const userId = req.userId;

    // Set to 26 days ago — past warning threshold but not yet triggered
    const pastDate  = new Date(Date.now() - 26 * 24 * 60 * 60 * 1000);
    const dueSoon   = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000); // 4 days left

    await DeadmanSwitch.findOneAndUpdate(
      { userId },
      {
        lastConfirmed:     pastDate,
        nextCheckDue:      dueSoon,
        warningSent:       true,
        warningSentAt:     new Date(),
        triggered:         false,
        consecutiveMisses: 0,
      }
    );

    // Send warning email to the owner
    const owner = await User.findById(userId);
    const checkinUrl = `${getFrontendBaseUrl()}/deadman`;
    const { subject, html } = emailTemplates.deadmanWarning(owner.fullName, 4, checkinUrl);
    await sendEmail({ to: owner.email, subject, html });

    await auditLog({
      userId,
      action: AUDIT_ACTIONS.DEADMAN_WARNING_SENT,
      metadata: { simulated: true, daysLeft: 4 },
      severity: 'warning',
    });

    return res.json({
      success: true,
      message: 'Warning state simulated. Warning email sent to vault owner.',
      simulated: {
        lastConfirmed:  pastDate,
        nextCheckDue:   dueSoon,
        daysLeft:       4,
        warningSent:    true,
        emailSentTo:    owner.email,
      }
    });
  } catch (err) {
    logger.error('simulateWarning error:', err);
    return res.status(500).json({ success: false, error: 'Simulation failed.' });
  }
};

// ─── TEST 3: Simulate nominee notification flow ────────────────────
const simulateNomineeFlow = async (req, res) => {
  try {
    const userId  = req.userId;
    const owner   = await User.findById(userId);
    const nominees = await Nominee.find({ vaultOwnerId: userId, status: 'accepted' }).sort({ priorityLevel: 1 });

    if (nominees.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No nominees found. Add at least one nominee first.',
      });
    }

    const steps   = [];
    const primary = nominees.find(n => n.priorityLevel === 1);
    const secondary = nominees.find(n => n.priorityLevel === 2);

    // Step 1 — Simulate invitation sent
    steps.push({
      step: 1,
      event: 'Invitation Sent',
      description: `Invitation email sent to nominee(s) when they were added`,
      nominees: nominees.map(n => ({ name: n.fullName, email: n.email, priority: n.priorityLevel, status: n.status })),
    });

    // Step 2 — Simulate dead man trigger notification
    let activeNominee = primary || secondary;
    if (activeNominee) {
      const { subject, html } = emailTemplates.deadmanTriggered(
        activeNominee.fullName,
        owner.fullName,
        getNomineePortalUrl(activeNominee.nomineeAccessToken, owner?.email)
      );
      await sendEmail({ to: activeNominee.email, subject, html });
    }

    steps.push({
      step: 2,
      event: 'Dead Man\'s Switch Triggered',
      description: `Active priority nominee notified that owner hasn't checked in`,
      emailSentTo: activeNominee ? activeNominee.email : 'None',
    });

    // Step 3 — Priority resolution logic
    steps.push({
      step: 3,
      event: 'Priority & 72-Hour Resolution',
      description: primary
        ? `Primary nominee (${primary.fullName}) has 72 hours to upload the certificate.`
        : secondary
          ? `No primary found. Secondary nominee (${secondary?.fullName}) immediately gets 72 hours to upload.`
          : 'No accepted nominees found — vault remains permanently locked.',
      resolvedTo: activeNominee ? { name: activeNominee.fullName, email: activeNominee.email, priority: activeNominee.priorityLevel } : null,
      note: 'If 72 hours pass without an upload, access is revoked and escalated to the next level.',
    });

    // Step 4 — Vault unlock simulation (email only, not actually unlocking)
    if (activeNominee) {
      const { subject, html } = emailTemplates.vaultUnlocked(
        activeNominee.fullName,
        owner.fullName,
        getNomineePortalUrl(activeNominee.nomineeAccessToken, owner?.email)
      );
      await sendEmail({ to: activeNominee.email, subject, html });

      steps.push({
        step: 4,
        event: 'Vault Access Granted (Simulated)',
        description: `After admin approval of death certificate, vault unlock email sent to ${activeNominee.fullName}`,
        emailSentTo: activeNominee.email,
        note: 'Vault is NOT actually unlocked — this is a simulation only',
      });
    }

    await auditLog({
      userId,
      action: 'NOMINEE_FLOW_SIMULATED',
      metadata: { simulated: true, steps: steps.length, nomineesInvolved: nominees.length },
      severity: 'info',
    });

    return res.json({
      success: true,
      message: 'Nominee notification flow simulated successfully.',
      owner: { name: owner.fullName, email: owner.email },
      steps,
    });
  } catch (err) {
    logger.error('simulateNomineeFlow error:', err);
    return res.status(500).json({ success: false, error: 'Simulation failed.' });
  }
};

// ─── TEST 4: Reset all test state back to normal ──────────────────
const resetTestState = async (req, res) => {
  try {
    const userId = req.userId;
    const now    = new Date();
    const nextDue = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await DeadmanSwitch.findOneAndUpdate(
      { userId },
      {
        lastConfirmed:     now,
        nextCheckDue:      nextDue,
        warningSent:       false,
        warningSentAt:     null,
        triggered:         false,
        triggeredAt:       null,
        consecutiveMisses: 0,
      }
    );

    await auditLog({ userId, action: 'TEST_STATE_RESET', metadata: { simulated: true } });

    return res.json({
      success: true,
      message: 'Test state reset. Dead man\'s switch back to normal.',
      nextCheckDue: nextDue,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Reset failed.' });
  }
};

// ─── GET /api/test/audit-log ───────────────────────────────────────
const getAuditLog = async (req, res) => {
  try {
    const logs = await AuditLog.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({ success: true, logs });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch audit log.' });
  }
};

module.exports = { simulateTrigger, simulateWarning, simulateNomineeFlow, resetTestState, getAuditLog };
