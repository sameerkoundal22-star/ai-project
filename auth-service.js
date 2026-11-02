const crypto = require('crypto');

class AuthService {
  constructor() {
    this.users = new Map();
    this.sessions = new Map();

    // Default registered developer account for immediate testing
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

  login({ identifier, email, username, password }) {
    const inputIdentifier = identifier || email || username;
    if (!inputIdentifier || !password) {
      throw new Error('Invalid email/User ID or password.');
    }

    const cleanId = String(inputIdentifier).toLowerCase().trim();
    let foundUser = null;

    for (const u of this.users.values()) {
      if (u.email === cleanId || u.username === cleanId) {
        foundUser = u;
        break;
      }
    }

    if (!foundUser) {
      throw new Error('Invalid email/User ID or password.');
    }

    const isValid = this.verifyPassword(password, foundUser.salt, foundUser.hash);
    if (!isValid) {
      throw new Error('Invalid email/User ID or password.');
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
}

module.exports = new AuthService();
