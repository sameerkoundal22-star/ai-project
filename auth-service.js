// Authentication & User Session Management Service
// Uses cryptographically secure salt + SHA-256 PBKDF2 hashing for secure zero-leak credential storage
const crypto = require('crypto');

class AuthService {
  constructor() {
    // In-memory persistent database of users
    // Pre-seeded with a default developer account for testing
    this.users = new Map();
    this.sessions = new Map();

    // Create default test account
    this.register({
      fullName: 'Developer Contributor',
      username: 'developer',
      email: 'developer@opensource.ai',
      password: 'Password123!'
    });
  }

  // Hash password using crypto PBKDF2 with unique salt
  hashPassword(password, salt = null) {
    const s = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, s, 10000, 64, 'sha512').toString('hex');
    return { salt: s, hash };
  }

  // Verify candidate password
  verifyPassword(candidatePassword, salt, storedHash) {
    const { hash } = this.hashPassword(candidatePassword, salt);
    return hash === storedHash;
  }

  // Register new user
  register({ fullName, username, email, password }) {
    if (!fullName || !username || !email || !password) {
      throw new Error('Please complete all required fields.');
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = username.toLowerCase().trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    // Check duplicate
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

    // Create immediate session
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

  // Login existing user
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
      throw new Error('Email or password is incorrect.');
    }

    const isValid = this.verifyPassword(password, foundUser.salt, foundUser.hash);
    if (!isValid) {
      throw new Error('Email or password is incorrect.');
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

  // Create cryptographic session token
  createSession(userId) {
    const token = 'sess_' + crypto.randomBytes(32).toString('hex');
    this.sessions.set(token, {
      userId,
      createdAt: Date.now(),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    });
    return token;
  }

  // Validate session token
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

  // Logout / Terminate session
  logout(token) {
    if (token) {
      this.sessions.delete(token);
    }
    return true;
  }
}

module.exports = new AuthService();
