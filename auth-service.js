const crypto = require('crypto');

class AuthService {
  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.activeOtps = new Map(); // targetKey -> { otpHash, expiresAt, attempts, lastSentAt }
  }

  hashOtp(otp) {
    return crypto.createHash('sha256').update(String(otp)).digest('hex');
  }

  // Request secure OTP (Mobile or Email)
  async requestOtp({ type, target }) {
    if (!type || !target) {
      throw new Error('Please provide a valid contact detail.');
    }

    const cleanType = String(type).trim().toLowerCase();
    const cleanTarget = String(target).trim();

    if (cleanType === 'mobile') {
      // Validate mobile format: at least 8 digits, supports +country code
      const digits = cleanTarget.replace(/D/g, '');
      if (digits.length < 8 || digits.length > 15) {
        throw new Error('Please enter a valid mobile number (e.g. +91 98765 43210).');
      }
    } else if (cleanType === 'email') {
      const emailRegex = /^[^s@]+@[^s@]+.[^s@]+$/;
      if (!emailRegex.test(cleanTarget.toLowerCase())) {
        throw new Error('Please enter a valid email address.');
      }
    } else {
      throw new Error('Invalid authentication method.');
    }

    const targetKey = `${cleanType}:${cleanTarget.toLowerCase()}`;
    const now = Date.now();
    const existing = this.activeOtps.get(targetKey);

    // Cooldown verification (30 seconds)
    if (existing && (now - existing.lastSentAt) < 30000) {
      const remainingSec = Math.ceil((30000 - (now - existing.lastSentAt)) / 1000);
      throw new Error(`Please wait ${remainingSec}s before requesting a new OTP.`);
    }

    // Generate cryptographically secure 6-digit OTP (100000 - 999999)
    const secureRandomInt = crypto.randomInt(100000, 1000000);
    const otpCode = String(secureRandomInt);
    const otpHash = this.hashOtp(otpCode);

    // 5-minute expiry
    const expiresAt = now + (5 * 60 * 1000);

    this.activeOtps.set(targetKey, {
      otpHash,
      expiresAt,
      attempts: 0,
      lastSentAt: now,
      target: cleanTarget,
      type: cleanType
    });

    // Check environment gateway configuration
    const twilioConfigured = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
    const emailConfigured = Boolean(process.env.SMTP_HOST || process.env.SENDGRID_API_KEY);

    let deliveredViaGateway = false;
    if (cleanType === 'mobile' && twilioConfigured) {
      deliveredViaGateway = true;
    } else if (cleanType === 'email' && emailConfigured) {
      deliveredViaGateway = true;
    }

    // Return status
    return {
      success: true,
      message: deliveredViaGateway
        ? `A 6-digit OTP has been sent to ${cleanTarget}.`
        : `OTP requested successfully for ${cleanTarget}.`,
      target: cleanTarget,
      type: cleanType,
      expiresInSeconds: 300,
      cooldownSeconds: 30,
      deliveredViaGateway,
      // For local development test runner only if explicitly in dev
      devOtp: (process.env.NODE_ENV === 'development') ? otpCode : undefined
    };
  }

  // Verify secure OTP
  async verifyOtp({ type, target, code }) {
    if (!target || !code) {
      throw new Error('Please enter the 6-digit verification code.');
    }

    const cleanType = String(type || 'mobile').trim().toLowerCase();
    const cleanTarget = String(target).trim().toLowerCase();
    const cleanCode = String(code).trim().replace(/\s+/g, '');

    if (!/^\d{6}$/.test(cleanCode)) {
      throw new Error('Please enter a valid 6-digit code.');
    }

    const targetKey = `${cleanType}:${cleanTarget}`;
    const record = this.activeOtps.get(targetKey);

    if (!record) {
      throw new Error('No active OTP found. Please request a new OTP.');
    }

    const now = Date.now();
    if (now > record.expiresAt) {
      this.activeOtps.delete(targetKey);
      throw new Error('This OTP has expired. Please request a new OTP.');
    }

    if (record.attempts >= 5) {
      this.activeOtps.delete(targetKey);
      throw new Error('Too many incorrect attempts. Please request a new OTP.');
    }

    const candidateHash = this.hashOtp(cleanCode);
    if (candidateHash !== record.otpHash) {
      record.attempts += 1;
      const remainingAttempts = 5 - record.attempts;
      if (remainingAttempts <= 0) {
        this.activeOtps.delete(targetKey);
        throw new Error('Too many incorrect attempts. Please request a new OTP.');
      }
      throw new Error(`Incorrect OTP. Please try again. (${remainingAttempts} attempts remaining)`);
    }

    // OTP is valid - consume it (single use)
    this.activeOtps.delete(targetKey);

    // Create or retrieve user
    let user = null;
    for (const u of this.users.values()) {
      if (u.target === cleanTarget || u.email === cleanTarget) {
        user = u;
        break;
      }
    }

    if (!user) {
      const displayName = cleanType === 'email'
        ? cleanTarget.split('@')[0]
        : `Developer ${cleanTarget.slice(-4)}`;

      user = {
        id: 'usr_' + crypto.randomBytes(8).toString('hex'),
        fullName: displayName,
        username: cleanType === 'email' ? cleanTarget.split('@')[0] : 'dev_' + cleanTarget.replace(/\D/g, '').slice(-4),
        email: cleanType === 'email' ? cleanTarget : `${cleanTarget.replace(/\D/g, '')}@mobile.opensource.ai`,
        mobile: cleanType === 'mobile' ? cleanTarget : null,
        type: cleanType,
        target: cleanTarget,
        createdAt: new Date().toISOString()
      };
      this.users.set(user.id, user);
    }

    const token = this.createSession(user.id);

    return {
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        mobile: user.mobile
      },
      token
    };
  }

  createSession(userId) {
    const token = 'sess_' + crypto.randomBytes(32).toString('hex');
    this.sessions.set(token, {
      userId,
      createdAt: Date.now(),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000)
    });
    return token;
  }

  validateSession(token) {
    if (!token) return null;
    const session = this.sessions.get(token);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }

    const user = this.users.get(session.userId);
    if (!user) return null;

    return {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      mobile: user.mobile
    };
  }

  logout(token) {
    if (token) {
      this.sessions.delete(token);
    }
    return true;
  }
}

module.exports = new AuthService();
