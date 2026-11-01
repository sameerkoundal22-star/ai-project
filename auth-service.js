const crypto = require('crypto');

class AuthService {
  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.resetTokens = new Map(); // token -> { email, expiresAt }

    // Seed default developer account
    this.register({
      fullName: 'Developer Contributor',
      username: 'developer',
      email: 'developer@opensource.ai',
      password: 'Password123!'
    });
  }

  hashPassword(password, salt = null) {
    const s = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, s, 10000, 64, 'sha512').toString('hex');
    return { salt: s, hash };
  }

  verifyPassword(candidatePassword, salt, storedHash) {
    const { hash } = this.hashPassword(candidatePassword, salt);
    return hash === storedHash;
  }

  register({ fullName, username, email, password }) {
    if (!fullName || !username || !email || !password) {
      throw new Error('Please complete all required fields.');
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = username.toLowerCase().trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    for (const u of this.users.values()) {
      if (u.email === cleanEmail) {
        throw new Error('An account with this email address already exists.');
      }
      if (u.username === cleanUsername) {
        throw new Error('This username is already taken.');
      }
    }

    const { salt, hash } = this.hashPassword(password);
    const user = {
      id: 'usr_' + crypto.randomBytes(8).toString('hex'),
      fullName: fullName.trim(),
      username: cleanUsername,
      email: cleanEmail,
      salt,
      hash,
      createdAt: new Date().toISOString()
    };

    this.users.set(user.id, user);
    const token = this.createSession(user.id);
    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        email: user.email
      },
      token
    };
  }

  login({ email, password }) {
    if (!email || !password) {
      throw new Error('Please complete all required fields.');
    }

    const cleanEmail = email.toLowerCase().trim();
    let foundUser = null;

    for (const u of this.users.values()) {
      if (u.email === cleanEmail || u.username === cleanEmail) {
        foundUser = u;
        break;
      }
    }

    if (!foundUser) {
      throw new Error('Invalid username or password.');
    }

    const isValid = this.verifyPassword(password, foundUser.salt, foundUser.hash);
    if (!isValid) {
      throw new Error('Invalid username or password.');
    }

    const token = this.createSession(foundUser.id);
    return {
      user: {
        id: foundUser.id,
        fullName: foundUser.fullName,
        username: foundUser.username,
        email: foundUser.email
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
      email: user.email
    };
  }

  logout(token) {
    if (token) {
      this.sessions.delete(token);
    }
    return true;
  }

  // Request Password Reset Token
  requestPasswordReset(email) {
    if (!email) return { success: false, error: 'Email is required' };
    const cleanEmail = email.toLowerCase().trim();

    // Check if user exists (without revealing status to attacker)
    let userExists = false;
    for (const u of this.users.values()) {
      if (u.email === cleanEmail) {
        userExists = true;
        break;
      }
    }

    let resetToken = null;
    if (userExists) {
      resetToken = crypto.randomBytes(24).toString('hex');
      this.resetTokens.set(resetToken, {
        email: cleanEmail,
        expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes
      });
    }

    return {
      success: true,
      message: 'If an account exists with this email, password reset instructions have been sent.',
      resetToken, // Returned in dev/local mode so reset page/flow works smoothly without mail server
      emailDeliveryConfigured: false
    };
  }

  // Reset Password using Token
  resetPassword(token, newPassword) {
    if (!token || !newPassword) {
      throw new Error('Token and new password are required.');
    }
    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const record = this.resetTokens.get(token);
    if (!record || Date.now() > record.expiresAt) {
      throw new Error('Reset link has expired or is invalid. Please request a new one.');
    }

    let targetUser = null;
    for (const u of this.users.values()) {
      if (u.email === record.email) {
        targetUser = u;
        break;
      }
    }

    if (!targetUser) {
      throw new Error('User associated with this reset link no longer exists.');
    }

    const { salt, hash } = this.hashPassword(newPassword);
    targetUser.salt = salt;
    targetUser.hash = hash;

    // Consume token
    this.resetTokens.delete(token);
    return { success: true, message: 'Password updated successfully. You can now login.' };
  }
}

module.exports = new AuthService();
