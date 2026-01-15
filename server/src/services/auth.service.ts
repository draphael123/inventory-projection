import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query, withTransaction } from '../db/connection.js';
import { config } from '../config/index.js';
import { auditHelpers } from './audit.service.js';
import type { User, SafeUser, Session, JWTPayload, UserRole } from '../types/index.js';

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.security.bcryptRounds);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT tokens
 */
export function generateTokens(user: SafeUser, sessionId: string): { accessToken: string; refreshToken: string } {
  const accessPayload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId,
    type: 'access',
  };

  const refreshPayload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId,
    type: 'refresh',
  };

  const accessToken = jwt.sign(accessPayload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as string,
  } as jwt.SignOptions);

  const refreshToken = jwt.sign(refreshPayload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn as string,
  } as jwt.SignOptions);

  return { accessToken, refreshToken };
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, config.jwt.secret) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Convert User to SafeUser (remove sensitive fields)
 */
export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

/**
 * Create a new user
 */
export async function createUser(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  mustChangePassword?: boolean;
}): Promise<SafeUser> {
  const passwordHash = await hashPassword(data.password);

  const result = await query<User>(
    `INSERT INTO users (email, password_hash, first_name, last_name, role, must_change_password)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.email.toLowerCase(),
      passwordHash,
      data.firstName,
      data.lastName,
      data.role || 'viewer',
      data.mustChangePassword ?? false,
    ]
  );

  return toSafeUser(result.rows[0]);
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await query<User>(
    `SELECT id, email, password_hash as "passwordHash", first_name as "firstName", 
            last_name as "lastName", role, is_active as "isActive", 
            must_change_password as "mustChangePassword", last_login_at as "lastLoginAt",
            failed_login_attempts as "failedLoginAttempts", locked_until as "lockedUntil",
            created_at as "createdAt", updated_at as "updatedAt"
     FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );

  return result.rows[0] || null;
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<User | null> {
  const result = await query<User>(
    `SELECT id, email, password_hash as "passwordHash", first_name as "firstName", 
            last_name as "lastName", role, is_active as "isActive", 
            must_change_password as "mustChangePassword", last_login_at as "lastLoginAt",
            failed_login_attempts as "failedLoginAttempts", locked_until as "lockedUntil",
            created_at as "createdAt", updated_at as "updatedAt"
     FROM users WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Login user
 */
export async function login(
  email: string,
  password: string,
  ipAddress: string | null,
  userAgent: string | null
): Promise<{ user: SafeUser; accessToken: string; refreshToken: string; sessionId: string } | { error: string; code: string }> {
  const user = await getUserByEmail(email);

  // Check if user exists
  if (!user) {
    await auditHelpers.logFailedLogin(email, ipAddress, 'User not found');
    return { error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' };
  }

  // Check if account is locked
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    await auditHelpers.logFailedLogin(email, ipAddress, 'Account locked');
    const minutesRemaining = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
    return { 
      error: `Account is locked. Try again in ${minutesRemaining} minutes.`, 
      code: 'ACCOUNT_LOCKED' 
    };
  }

  // Check if account is active
  if (!user.isActive) {
    await auditHelpers.logFailedLogin(email, ipAddress, 'Account inactive');
    return { error: 'Account is deactivated', code: 'ACCOUNT_INACTIVE' };
  }

  // Verify password
  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    // Increment failed attempts
    const newAttempts = user.failedLoginAttempts + 1;
    const shouldLock = newAttempts >= MAX_LOGIN_ATTEMPTS;

    await query(
      `UPDATE users SET 
        failed_login_attempts = $1,
        locked_until = $2
       WHERE id = $3`,
      [
        newAttempts,
        shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60000) : null,
        user.id,
      ]
    );

    await auditHelpers.logFailedLogin(email, ipAddress, 'Invalid password');

    if (shouldLock) {
      return { 
        error: `Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.`, 
        code: 'ACCOUNT_LOCKED' 
      };
    }

    return { error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' };
  }

  // Successful login - create session
  return withTransaction(async (client) => {
    // Reset failed attempts and update last login
    await client.query(
      `UPDATE users SET 
        failed_login_attempts = 0,
        locked_until = NULL,
        last_login_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    // Generate tokens
    const sessionId = uuidv4();
    const safeUser = toSafeUser(user);
    const { accessToken, refreshToken } = generateTokens(safeUser, sessionId);

    // Calculate refresh token expiry
    const refreshExpiresIn = config.jwt.refreshExpiresIn;
    const expiresInMs = parseExpiry(refreshExpiresIn);
    const expiresAt = new Date(Date.now() + expiresInMs);

    // Create session
    await client.query(
      `INSERT INTO sessions (id, user_id, refresh_token, user_agent, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [sessionId, user.id, refreshToken, userAgent, ipAddress, expiresAt]
    );

    // Log successful login
    await auditHelpers.logLogin(user.id, user.email, ipAddress, userAgent);

    return {
      user: safeUser,
      accessToken,
      refreshToken,
      sessionId,
    };
  });
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const payload = verifyToken(refreshToken);

  if (!payload || payload.type !== 'refresh') {
    return null;
  }

  // Check if session exists and is valid
  const sessionResult = await query<Session>(
    `SELECT * FROM sessions 
     WHERE id = $1 AND refresh_token = $2 AND expires_at > NOW()`,
    [payload.sessionId, refreshToken]
  );

  if (sessionResult.rows.length === 0) {
    return null;
  }

  const session = sessionResult.rows[0];

  // Get user
  const user = await getUserById(payload.userId);
  if (!user || !user.isActive) {
    return null;
  }

  // Generate new tokens
  const safeUser = toSafeUser(user);
  const newTokens = generateTokens(safeUser, session.id);

  // Update session with new refresh token
  const refreshExpiresIn = config.jwt.refreshExpiresIn;
  const expiresInMs = parseExpiry(refreshExpiresIn);
  const expiresAt = new Date(Date.now() + expiresInMs);

  await query(
    `UPDATE sessions SET 
      refresh_token = $1,
      expires_at = $2,
      last_activity_at = NOW()
     WHERE id = $3`,
    [newTokens.refreshToken, expiresAt, session.id]
  );

  return newTokens;
}

/**
 * Logout user (invalidate session)
 */
export async function logout(sessionId: string, userId: string, email: string, ipAddress: string | null): Promise<void> {
  await query('DELETE FROM sessions WHERE id = $1', [sessionId]);
  await auditHelpers.logLogout(userId, email, ipAddress);
}

/**
 * Logout all sessions for a user
 */
export async function logoutAllSessions(userId: string): Promise<void> {
  await query('DELETE FROM sessions WHERE user_id = $1', [userId]);
}

/**
 * Get session by ID
 */
export async function getSession(sessionId: string): Promise<Session | null> {
  const result = await query<Session>(
    `SELECT id, user_id as "userId", refresh_token as "refreshToken",
            user_agent as "userAgent", ip_address as "ipAddress",
            expires_at as "expiresAt", created_at as "createdAt",
            last_activity_at as "lastActivityAt"
     FROM sessions WHERE id = $1 AND expires_at > NOW()`,
    [sessionId]
  );

  return result.rows[0] || null;
}

/**
 * Update session activity
 */
export async function updateSessionActivity(sessionId: string): Promise<void> {
  await query(
    'UPDATE sessions SET last_activity_at = NOW() WHERE id = $1',
    [sessionId]
  );
}

/**
 * Change password
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<boolean> {
  const user = await getUserById(userId);
  if (!user) return false;

  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) return false;

  const newHash = await hashPassword(newPassword);

  await query(
    `UPDATE users SET 
      password_hash = $1,
      must_change_password = false
     WHERE id = $2`,
    [newHash, userId]
  );

  // Invalidate all other sessions
  await query(
    'DELETE FROM sessions WHERE user_id = $1',
    [userId]
  );

  return true;
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await query(
    'DELETE FROM sessions WHERE expires_at < NOW()'
  );

  return result.rowCount || 0;
}

/**
 * Parse expiry string to milliseconds
 */
function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 15 * 60 * 1000; // Default 15 minutes

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 15 * 60 * 1000;
  }
}

