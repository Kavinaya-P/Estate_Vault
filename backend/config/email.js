const nodemailer = require('nodemailer');
const { logger } = require('./logger');

const createTransporter = () => {
  return nodemailer.createTransport({
    //service:'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    connectionTimeout: 10000,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  try {
    if (!process.env.GMAIL_USER || process.env.GMAIL_USER === 'your_gmail@gmail.com') {
      logger.warn(`[EMAIL SIMULATED] To: ${to} | Subject: ${subject}`);
      return { simulated: true };
    }
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"Digital Estate Vault" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
      attachments,
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error(`Email failed to ${to}: ${err.message}`);
    throw err;
  }
};

// ── Shared style block ─────────────────────────────
const styles = `
  font-family:monospace;background:#0a0a0b;color:#c8c8d8;
  padding:40px;max-width:520px;margin:0 auto;border:1px solid #2a2a35;
`;
const header = `
  <div style="color:#c9a84c;font-size:20px;margin-bottom:8px;letter-spacing:2px;">ESTATE VAULT</div>
  <div style="color:#5a5a6e;font-size:11px;margin-bottom:32px;letter-spacing:1px;">SECURE DIGITAL LEGACY PLATFORM</div>
`;
const footer = `<p style="color:#5a5a6e;font-size:11px;margin-top:32px;">If you did not initiate this action, contact support immediately.</p>`;

const otpBlock = (otp) => `
  <div style="display:flex;justify-content:center;gap:10px;margin:28px 0;">
    ${otp.split('').map(d => `
      <div style="width:44px;height:56px;display:flex;align-items:center;justify-content:center;
        background:#111118;border:1px solid #c9a84c;border-radius:4px;
        font-size:26px;font-weight:700;color:#c9a84c;letter-spacing:0;">
        ${d}
      </div>`).join('')}
  </div>
`;

// ── Email Templates ────────────────────────────────
const emailTemplates = {

  // Registration email OTP
  emailVerificationOtp: (userName, otp) => ({
    subject: '🔐 Estate Vault — Verify Your Email',
    html: `
      <div style="${styles}">
        ${header}
        <div style="font-size:18px;color:#eeeef8;margin-bottom:16px;">Verify Your Email</div>
        <p style="line-height:1.7;">Hi ${userName},</p>
        <p style="line-height:1.7;">Enter this 6-digit code to activate your Estate Vault account. The code expires in <strong style="color:#c9a84c;">10 minutes</strong>.</p>
        ${otpBlock(otp)}
        <p style="color:#5a5a6e;font-size:12px;text-align:center;">Do not share this code with anyone.</p>
        ${footer}
      </div>
    `,
  }),

  // Login OTP sent on every sign-in
  loginOtp: (userName, otp) => ({
    subject: '🔑 Estate Vault — Login Verification Code',
    html: `
      <div style="${styles}">
        ${header}
        <div style="font-size:18px;color:#eeeef8;margin-bottom:16px;">Login Verification</div>
        <p style="line-height:1.7;">Hi ${userName},</p>
        <p style="line-height:1.7;">A login attempt was detected. Use the code below to complete sign-in. Expires in <strong style="color:#c9a84c;">10 minutes</strong>.</p>
        ${otpBlock(otp)}
        <p style="color:#5a5a6e;font-size:12px;text-align:center;">If you did not try to log in, your password may be compromised — change it immediately.</p>
        ${footer}
      </div>
    `,
  }),

  // Nominee invitation (after user adds nominee)
  nomineeInvite: (nomineeName, ownerName, acceptUrl, declineUrl) => ({
    subject: `You've been added as a nominee — Digital Estate Vault`,
    html: `
      <div style="${styles}">
        ${header}
        <div style="font-size:18px;color:#eeeef8;margin-bottom:16px;">Nominee Invitation</div>
        <p style="line-height:1.7;">Hi ${nomineeName},</p>
        <p style="line-height:1.7;"><strong style="color:#c9a84c;">${ownerName}</strong> has added you as a nominee on their Digital Estate Vault. As a nominee, you will be contacted if the vault owner has passed away, and may be granted access to the vault after verified death confirmation.</p>
        <p style="line-height:1.7;">Please accept or decline this nomination below:</p>
        <div style="display:flex;gap:16px;margin:24px 0;">
          <a href="${acceptUrl}" style="flex:1;display:inline-block;padding:14px 20px;background:transparent;border:1px solid #c9a84c;color:#c9a84c;text-decoration:none;letter-spacing:2px;font-size:11px;text-transform:uppercase;text-align:center;">ACCEPT</a>
          <a href="${declineUrl}" style="flex:1;display:inline-block;padding:14px 20px;background:transparent;border:1px solid #5a5a6e;color:#5a5a6e;text-decoration:none;letter-spacing:2px;font-size:11px;text-transform:uppercase;text-align:center;">DECLINE</a>
        </div>
        <p style="color:#5a5a6e;font-size:11px;">This invitation expires in 7 days. If you did not expect this email, you may safely ignore it.</p>
      </div>
    `,
  }),

  // Nominee accepted confirmation to vault owner
  nomineeAccepted: (ownerName, nomineeName, nomineeEmail) => ({
    subject: `✅ Estate Vault — Nominee Accepted`,
    html: `
      <div style="${styles}">
        ${header}
        <div style="font-size:18px;color:#eeeef8;margin-bottom:16px;">Nominee Accepted</div>
        <p style="line-height:1.7;">Hi ${ownerName},</p>
        <p style="line-height:1.7;"><strong style="color:#c9a84c;">${nomineeName}</strong> (${nomineeEmail}) has accepted your nomination and is now registered as a nominee on your Estate Vault.</p>
        ${footer}
      </div>
    `,
  }),

  // Nominee declined - notify owner
  nomineeDeclined: (ownerName, nomineeName, nomineeEmail) => ({
    subject: `❌ Estate Vault — Nominee Declined`,
    html: `
      <div style="${styles}">
        ${header}
        <div style="font-size:18px;color:#eeeef8;margin-bottom:16px;">Nominee Declined</div>
        <p style="line-height:1.7;">Hi ${ownerName},</p>
        <p style="line-height:1.7;"><strong style="color:#c9a84c;">${nomineeName}</strong> (${nomineeEmail}) has declined your nomination. Please consider adding a different nominee.</p>
        ${footer}
      </div>
    `,
  }),

  // Dead man's switch warning
  deadmanWarning: (userName, daysLeft, checkinUrl) => ({
    subject: '⚠️ Estate Vault — Check-in Required',
    html: `
      <div style="${styles}">
        ${header}
        <div style="font-size:18px;color:#eeeef8;margin-bottom:16px;">Check-in Required</div>
        <p style="line-height:1.7;">Hi ${userName},</p>
        <p style="line-height:1.7;">Your Dead Man's Switch has not been confirmed. You have <strong style="color:#c9a84c;">${daysLeft} days</strong> to check in before your nominees are notified.</p>
        <a href="${checkinUrl}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:transparent;border:1px solid #c9a84c;color:#c9a84c;text-decoration:none;letter-spacing:2px;font-size:11px;text-transform:uppercase;">CONFIRM I'M ALIVE</a>
        <p style="color:#5a5a6e;font-size:11px;margin-top:32px;">If you did not set up this vault, contact support immediately.</p>
      </div>
    `,
  }),

  // Dead man's switch triggered — sent to nominee
  deadmanTriggered: (nomineeName, ownerName, portalUrl) => ({
    subject: '🔔 Estate Vault — Action Required',
    html: `
      <div style="${styles}">
        ${header}
        <div style="font-size:18px;color:#eeeef8;margin-bottom:16px;">Nominee Notification</div>
        <p style="line-height:1.7;">Hi ${nomineeName},</p>
        <p style="line-height:1.7;">You are listed as a nominee for <strong style="color:#c9a84c;">${ownerName}</strong>'s Digital Estate Vault.</p>
        <p style="line-height:1.7;">The vault owner has not checked in for an extended period. If you believe the owner may be deceased, you may submit a death verification request via the secure nominee portal below.</p>
        <p style="line-height:1.7;color:#c9a84c;"><strong>IMPORTANT:</strong> You have exactly 72 hours from the receipt of this email to upload the death certificate. If you fail to do so within this window, your access will be permanently revoked.</p>
        <a href="${portalUrl}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:transparent;border:1px solid #c9a84c;color:#c9a84c;text-decoration:none;letter-spacing:2px;font-size:11px;text-transform:uppercase;">OPEN NOMINEE PORTAL</a>
        <p style="color:#5a5a6e;font-size:11px;margin-top:32px;">This is an automated notification from Digital Estate Vault.</p>
      </div>
    `,
  }),

  // Admin approval: nominee receives vault access notification
  vaultUnlocked: (nomineeName, ownerName, portalUrl) => ({
    subject: '🔓 Estate Vault — Death Confirmed & Access Granted',
    html: `
      <div style="${styles}">
        ${header}
        <div style="font-size:18px;color:#eeeef8;margin-bottom:16px;">Vault Access Granted</div>
        <p style="line-height:1.7;">Hi ${nomineeName},</p>
        <p style="line-height:1.7;">The death certificate you submitted for <strong style="color:#c9a84c;">${ownerName}</strong> has been reviewed and approved by our admin team.</p>
        <p style="line-height:1.7;">The vault has been unlocked. You can now access the estate contents through the nominee portal:</p>
        <a href="${portalUrl}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:transparent;border:1px solid #4caf7d;color:#4caf7d;text-decoration:none;letter-spacing:2px;font-size:11px;text-transform:uppercase;">ACCESS VAULT CONTENTS</a>
        <p style="color:#5a5a6e;font-size:11px;margin-top:32px;">Please handle this information with care and respect.</p>
      </div>
    `,
  }),

  // Admin notification: new death certificate uploaded (notify admin)
  adminDeathCertificateSubmitted: (adminName, nomineeName, ownerName, reviewUrl) => ({
    subject: '📋 Estate Vault — Death Certificate Submitted for Review',
    html: `
      <div style="${styles}">
        ${header}
        <div style="font-size:18px;color:#eeeef8;margin-bottom:16px;">Certificate Pending Review</div>
        <p style="line-height:1.7;">Hi ${adminName},</p>
        <p style="line-height:1.7;">A death certificate has been submitted by nominee <strong style="color:#c9a84c;">${nomineeName}</strong> for vault owner <strong style="color:#c9a84c;">${ownerName}</strong>.</p>
        <p style="line-height:1.7;">Please review and take action in the admin panel.</p>
        <a href="${reviewUrl}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:transparent;border:1px solid #c9a84c;color:#c9a84c;text-decoration:none;letter-spacing:2px;font-size:11px;text-transform:uppercase;">REVIEW IN ADMIN PANEL</a>
      </div>
    `,
  }),

  // Death certificate rejected notification to nominee
  deathRequestRejected: (nomineeName, ownerName, reason) => ({
    subject: '❌ Estate Vault — Death Verification Rejected',
    html: `
      <div style="${styles}">
        ${header}
        <div style="font-size:18px;color:#eeeef8;margin-bottom:16px;">Verification Rejected</div>
        <p style="line-height:1.7;">Hi ${nomineeName},</p>
        <p style="line-height:1.7;">Your death verification request for <strong style="color:#c9a84c;">${ownerName}</strong> has been reviewed and <strong style="color:#c45555;">rejected</strong> by our admin team.</p>
        ${reason ? `<p style="line-height:1.7;color:#c8c8d8;"><strong>Reason:</strong> ${reason}</p>` : ''}
        <p style="line-height:1.7;">If you believe this is an error, please contact support with additional documentation.</p>
        ${footer}
      </div>
    `,
  }),
};

module.exports = { sendEmail, emailTemplates };
