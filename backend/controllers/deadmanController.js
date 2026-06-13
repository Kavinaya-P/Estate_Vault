const DeadmanSwitch = require('../models/DeadmanSwitch');
const User = require('../models/User');
const Nominee = require('../models/Nominee');
const { auditLog, AUDIT_ACTIONS } = require('../config/audit');
const { sendEmail, emailTemplates } = require('../config/email');
const getFrontendBaseUrl = () => (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const getNomineePortalUrl = (nomineeToken, ownerEmail) => {
  const query = new URLSearchParams({ token: nomineeToken, owner: ownerEmail });
  return `${getFrontendBaseUrl()}/nominee-portal?${query.toString()}`;
};

// GET /api/deadman
const getStatus = async (req, res) => {
  try {
    const deadman = await DeadmanSwitch.findOne({ userId: req.userId });
    if (!deadman) return res.status(404).json({ success: false, error: 'Dead man switch not found.' });

    const now = new Date();
    const daysUntilDue = Math.ceil((deadman.nextCheckDue - now) / (1000 * 60 * 60 * 24));
    let contestHoursLeft = null;
    if (deadman.triggered && deadman.contestDeadline && !deadman.contestCancelled) {
      contestHoursLeft = Math.max(0, Math.ceil((deadman.contestDeadline - now) / (1000 * 60 * 60)));
    }

    return res.json({
      success: true,
      deadman: {
        lastConfirmed:      deadman.lastConfirmed,
        nextCheckDue:       deadman.nextCheckDue,
        checkIntervalDays:  deadman.checkIntervalDays,
        daysUntilDue:       Math.max(0, daysUntilDue),
        isOverdue:          now > deadman.nextCheckDue,
        warningSent:        deadman.warningSent,
        triggered:          deadman.triggered,
        triggeredAt:        deadman.triggeredAt,
        consecutiveMisses:  deadman.consecutiveMisses,
        contestWindowHours: deadman.contestWindowHours,
        contestDeadline:    deadman.contestDeadline,
        contestHoursLeft,
        contestCancelled:   deadman.contestCancelled,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to get status.' });
  }
};

// POST /api/deadman/checkin
const confirmCheckin = async (req, res) => {
  try {
    const now = new Date();
    const deadman = await DeadmanSwitch.findOne({ userId: req.userId });
    if (!deadman) return res.status(404).json({ success: false, error: 'Not found.' });

    const nextDue = new Date(now.getTime() + deadman.checkIntervalDays * 24 * 60 * 60 * 1000);
    const wasTriggered = deadman.triggered;
    const withinContest = wasTriggered && deadman.contestDeadline && now <= deadman.contestDeadline;

    await DeadmanSwitch.findOneAndUpdate({ userId: req.userId }, {
      lastConfirmed:     now,
      nextCheckDue:      nextDue,
      warningSent:       false,
      warningSentAt:     null,
      triggered:         false,
      triggeredAt:       null,
      consecutiveMisses: 0,
      contestDeadline:   null,
      contestCancelled:  wasTriggered ? true : false,
      contestCancelledAt: wasTriggered ? now : null,
    });

    await User.findByIdAndUpdate(req.userId, { lastCheckin: now });
    await auditLog({ userId: req.userId, action: AUDIT_ACTIONS.CHECKIN_CONFIRMED, ipAddress: req.ip, metadata: { cancelledTrigger: withinContest } });

    return res.json({
      success: true,
      message: withinContest ? '✓ Check-in confirmed. Trigger cancelled within contest window.' : '✓ Check-in confirmed.',
      nextCheckDue: nextDue,
      cancelledTrigger: withinContest,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Check-in failed.' });
  }
};

// PATCH /api/deadman/interval
const updateInterval = async (req, res) => {
  try {
    const { days } = req.body;
    if (!days || days < 7 || days > 365) {
      return res.status(400).json({ success: false, error: 'Interval must be between 7 and 365 days.' });
    }
    const now = new Date();
    const nextDue = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    await DeadmanSwitch.findOneAndUpdate({ userId: req.userId }, { checkIntervalDays: days, nextCheckDue: nextDue });
    return res.json({ success: true, message: `Interval updated to ${days} days.` });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to update interval.' });
  }
};

// Cron job
const runDeadmanCheck = async () => {
  const { logger } = require('../config/logger');
  try {
    const now = new Date();
    const warningThreshold = new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000);
    const triggerThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Warnings
    const warningCandidates = await DeadmanSwitch.find({
      lastConfirmed: { $lt: warningThreshold },
      warningSent: false,
      triggered: false,
    }).populate('userId');

    for (const deadman of warningCandidates) {
      const user = deadman.userId;
      if (!user || user.status === 'deceased') continue;
      const daysLeft = Math.max(0, Math.ceil((deadman.nextCheckDue - now) / (1000 * 60 * 60 * 24)));
      const checkinUrl = `${getFrontendBaseUrl()}/deadman`;
      const { subject, html } = emailTemplates.deadmanWarning(user.fullName, daysLeft, checkinUrl);
      await sendEmail({ to: user.email, subject, html });
      await DeadmanSwitch.findByIdAndUpdate(deadman._id, { warningSent: true, warningSentAt: now });
      await auditLog({ userId: user._id, action: AUDIT_ACTIONS.DEADMAN_WARNING_SENT, severity: 'warning' });
      logger.info(`Warning sent to ${user.email}`);
    }

    // Triggers
    const triggerCandidates = await DeadmanSwitch.find({
      lastConfirmed: { $lt: triggerThreshold },
      triggered: false,
    }).populate('userId');

    for (const deadman of triggerCandidates) {
      const user = deadman.userId;
      if (!user || user.status === 'deceased') continue;
      const contestDeadline = new Date(now.getTime() + (deadman.contestWindowHours || 72) * 60 * 60 * 1000);
      await DeadmanSwitch.findByIdAndUpdate(deadman._id, {
        triggered: true, triggeredAt: now,
        consecutiveMisses: deadman.consecutiveMisses + 1,
        contestDeadline, contestCancelled: false,
      });
      const nominees = await Nominee.find({ vaultOwnerId: user._id, status: 'accepted' }).sort({ priorityLevel: 1 });
      for (const nominee of nominees) {
        const portalUrl = nominee.nomineeAccessToken
          ? getNomineePortalUrl(nominee.nomineeAccessToken, user.email)
          : `${getFrontendBaseUrl()}/nominee-portal`;
        const { subject, html } = emailTemplates.deadmanTriggered(nominee.fullName, user.fullName, portalUrl);
        await sendEmail({ to: nominee.email, subject, html }).catch(() => {});
      }
      await auditLog({ userId: user._id, action: AUDIT_ACTIONS.DEADMAN_TRIGGERED, severity: 'critical', metadata: { contestDeadline, nomineesNotified: nominees.length } });
      logger.warn(`Dead man triggered for ${user.email}`);
    }
  } catch (err) {
    logger.error('runDeadmanCheck error:', err);
  }
};

module.exports = { getStatus, confirmCheckin, updateInterval, runDeadmanCheck };
