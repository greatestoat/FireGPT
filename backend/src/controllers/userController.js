const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
} = require('../utils/jwt');

const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MINUTES = 15;

/**
 * Log audit event
 */
const logAudit = async (userId, action, req, status, details = null) => {
  try {
    await pool.execute(
      'INSERT INTO audit_logs (id, user_id, action, ip_address, user_agent, status, details) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), userId || null, action, req.ip, req.headers['user-agent'] || '', status, details]
    );
  } catch (_) { /* audit failure should not break main flow */ }
};

/**
 * POST /api/auth/register
 */
const register = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check existing user
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existing.length > 0) {
      await logAudit(null, 'REGISTER', req, 'FAILED', 'Duplicate email or username');
      return res.status(409).json({
        success: false,
        message: 'An account with this email or username already exists',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = uuidv4();

    // Insert user
    await pool.execute(
      'INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)',
      [userId, username.trim(), email.toLowerCase(), passwordHash]
    );

    await logAudit(userId, 'REGISTER', req, 'SUCCESS');

    return res.status(201).json({
      success: true,
      message: 'Account created successfully. You can now log in.',
    });
  } catch (err) {
    console.error('Register error:', err);
    await logAudit(null, 'REGISTER', req, 'ERROR', err.message);
    return res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Fetch user
    const [rows] = await pool.execute(
      'SELECT id, username, email, password_hash, is_active, login_attempts, locked_until FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (!rows.length) {
      // Generic message to prevent user enumeration
      await logAudit(null, 'LOGIN', req, 'FAILED', 'User not found: ' + email);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = rows[0];

    // Check account active
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact support.' });
    }

    // Check account lock
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remaining = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      await logAudit(user.id, 'LOGIN', req, 'LOCKED');
      return res.status(423).json({
        success: false,
        message: `Account temporarily locked. Try again in ${remaining} minute(s).`,
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      const newAttempts = user.login_attempts + 1;
      let lockedUntil = null;

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        lockedUntil = new Date(Date.now() + LOCK_TIME_MINUTES * 60 * 1000);
        await pool.execute(
          'UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?',
          [newAttempts, lockedUntil, user.id]
        );
        await logAudit(user.id, 'LOGIN', req, 'ACCOUNT_LOCKED');
        return res.status(423).json({
          success: false,
          message: `Too many failed attempts. Account locked for ${LOCK_TIME_MINUTES} minutes.`,
        });
      }

      await pool.execute('UPDATE users SET login_attempts = ? WHERE id = ?', [newAttempts, user.id]);
      await logAudit(user.id, 'LOGIN', req, 'FAILED', 'Wrong password');
      return res.status(401).json({
        success: false,
        message: `Invalid email or password. ${MAX_LOGIN_ATTEMPTS - newAttempts} attempt(s) remaining.`,
      });
    }

    // Reset login attempts on success
    await pool.execute(
      'UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = ?',
      [user.id]
    );

    // Generate tokens
    const tokenPayload = { userId: user.id, username: user.username, email: user.email };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    const refreshTokenHash = hashToken(refreshToken);

    // Store refresh token (hashed)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await pool.execute(
      'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [uuidv4(), user.id, refreshTokenHash, expiresAt]
    );

    await logAudit(user.id, 'LOGIN', req, 'SUCCESS');

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth',
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
};

/**
 * POST /api/auth/refresh
 */
const refresh = async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Refresh token not found' });
  }

  try {
    const decoded = verifyRefreshToken(token);
    const tokenHash = hashToken(token);

    // Check token in DB
    const [rows] = await pool.execute(
      'SELECT rt.id, rt.user_id, rt.expires_at, u.username, u.email, u.is_active FROM refresh_tokens rt JOIN users u ON rt.user_id = u.id WHERE rt.token_hash = ?',
      [tokenHash]
    );

    if (!rows.length || !rows[0].is_active) {
      res.clearCookie('refreshToken', { path: '/api/auth' });
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const record = rows[0];

    if (new Date(record.expires_at) < new Date()) {
      await pool.execute('DELETE FROM refresh_tokens WHERE id = ?', [record.id]);
      res.clearCookie('refreshToken', { path: '/api/auth' });
      return res.status(401).json({ success: false, message: 'Refresh token expired. Please login again.' });
    }

    // Rotate refresh token (invalidate old, issue new)
    await pool.execute('DELETE FROM refresh_tokens WHERE id = ?', [record.id]);

    const tokenPayload = { userId: decoded.userId, username: record.username, email: record.email };
    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);
    const newRefreshTokenHash = hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.execute(
      'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [uuidv4(), decoded.userId, newRefreshTokenHash, expiresAt]
    );

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    return res.status(200).json({
      success: true,
      data: { accessToken: newAccessToken },
    });
  } catch (err) {
    res.clearCookie('refreshToken', { path: '/api/auth' });
    return res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

/**
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (token) {
    try {
      const tokenHash = hashToken(token);
      await pool.execute('DELETE FROM refresh_tokens WHERE token_hash = ?', [tokenHash]);
      await logAudit(req.user?.id, 'LOGOUT', req, 'SUCCESS');
    } catch (_) {}
  }

  res.clearCookie('refreshToken', { path: '/api/auth' });

  return res.status(200).json({ success: true, message: 'Logged out successfully' });
};

/**
 * POST /api/auth/logout-all
 * Revoke all sessions for a user
 */
const logoutAll = async (req, res) => {
  try {
    await pool.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [req.user.id]);
    await logAudit(req.user.id, 'LOGOUT_ALL', req, 'SUCCESS');
    res.clearCookie('refreshToken', { path: '/api/auth' });
    return res.status(200).json({ success: true, message: 'All sessions terminated' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to logout from all devices' });
  }
};

const getProfile = async (req, res) => {
  try {
    // Assuming authenticate middleware sets req.user
    const user = req.user;

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get Profile Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = { getProfile };

module.exports = { register, login, refresh, logout, logoutAll, getProfile };