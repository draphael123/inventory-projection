import { query } from '../db/connection.js';
import { hashPassword, toSafeUser } from './auth.service.js';
import { createAuditLog } from './audit.service.js';
import type { User, SafeUser, UserRole, PaginationParams } from '../types/index.js';

/**
 * Get all users with pagination
 */
export async function getUsers(
  params: PaginationParams & { role?: UserRole; isActive?: boolean; searchTerm?: string }
): Promise<{ users: SafeUser[]; total: number }> {
  const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = params;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (params.role) {
    conditions.push(`role = $${paramIndex++}`);
    values.push(params.role);
  }

  if (params.isActive !== undefined) {
    conditions.push(`is_active = $${paramIndex++}`);
    values.push(params.isActive);
  }

  if (params.searchTerm) {
    conditions.push(`(email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`);
    values.push(`%${params.searchTerm}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  // Map sort columns to database columns
  const sortColumnMap: Record<string, string> = {
    createdAt: 'created_at',
    email: 'email',
    firstName: 'first_name',
    lastName: 'last_name',
    role: 'role',
    lastLoginAt: 'last_login_at',
  };
  
  const safeSort = sortColumnMap[sortBy] || 'created_at';
  const safeOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM users ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get users
  const usersResult = await query<User>(
    `SELECT id, email, password_hash as "passwordHash", first_name as "firstName", 
            last_name as "lastName", role, is_active as "isActive", 
            must_change_password as "mustChangePassword", last_login_at as "lastLoginAt",
            failed_login_attempts as "failedLoginAttempts", locked_until as "lockedUntil",
            created_at as "createdAt", updated_at as "updatedAt"
     FROM users ${whereClause}
     ORDER BY ${safeSort} ${safeOrder}
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...values, limit, offset]
  );

  return {
    users: usersResult.rows.map(toSafeUser),
    total,
  };
}

/**
 * Get user by ID (safe version)
 */
export async function getSafeUserById(id: string): Promise<SafeUser | null> {
  const result = await query<User>(
    `SELECT id, email, password_hash as "passwordHash", first_name as "firstName", 
            last_name as "lastName", role, is_active as "isActive", 
            must_change_password as "mustChangePassword", last_login_at as "lastLoginAt",
            failed_login_attempts as "failedLoginAttempts", locked_until as "lockedUntil",
            created_at as "createdAt", updated_at as "updatedAt"
     FROM users WHERE id = $1`,
    [id]
  );

  return result.rows[0] ? toSafeUser(result.rows[0]) : null;
}

/**
 * Update user
 */
export async function updateUser(
  id: string,
  data: {
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: UserRole;
    isActive?: boolean;
  },
  adminId: string,
  adminEmail: string
): Promise<SafeUser | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.email) {
    updates.push(`email = $${paramIndex++}`);
    values.push(data.email.toLowerCase());
  }

  if (data.firstName) {
    updates.push(`first_name = $${paramIndex++}`);
    values.push(data.firstName);
  }

  if (data.lastName) {
    updates.push(`last_name = $${paramIndex++}`);
    values.push(data.lastName);
  }

  if (data.role) {
    updates.push(`role = $${paramIndex++}`);
    values.push(data.role);
  }

  if (data.isActive !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(data.isActive);
  }

  if (updates.length === 0) {
    return getSafeUserById(id);
  }

  values.push(id);

  const result = await query<User>(
    `UPDATE users SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, email, first_name as "firstName", last_name as "lastName", 
               role, is_active as "isActive", must_change_password as "mustChangePassword", 
               last_login_at as "lastLoginAt", created_at as "createdAt"`,
    values
  );

  if (result.rows[0]) {
    await createAuditLog({
      userId: adminId,
      userEmail: adminEmail,
      action: 'USER_UPDATED',
      resourceType: 'user',
      resourceId: id,
      details: { changes: data },
    });

    return toSafeUser(result.rows[0] as User);
  }

  return null;
}

/**
 * Delete user (soft delete by deactivating)
 */
export async function deleteUser(
  id: string,
  adminId: string,
  adminEmail: string
): Promise<boolean> {
  // Don't allow deleting self
  if (id === adminId) {
    throw new Error('Cannot delete your own account');
  }

  const result = await query(
    'UPDATE users SET is_active = false WHERE id = $1',
    [id]
  );

  if (result.rowCount && result.rowCount > 0) {
    // Invalidate all sessions
    await query('DELETE FROM sessions WHERE user_id = $1', [id]);

    await createAuditLog({
      userId: adminId,
      userEmail: adminEmail,
      action: 'USER_DELETED',
      resourceType: 'user',
      resourceId: id,
    });

    return true;
  }

  return false;
}

/**
 * Unlock user account
 */
export async function unlockUser(
  id: string,
  adminId: string,
  adminEmail: string
): Promise<boolean> {
  const result = await query(
    `UPDATE users SET 
      failed_login_attempts = 0,
      locked_until = NULL
     WHERE id = $1`,
    [id]
  );

  if (result.rowCount && result.rowCount > 0) {
    await createAuditLog({
      userId: adminId,
      userEmail: adminEmail,
      action: 'USER_UNLOCKED',
      resourceType: 'user',
      resourceId: id,
    });

    return true;
  }

  return false;
}

/**
 * Reset user password (admin action)
 */
export async function resetUserPassword(
  id: string,
  newPassword: string,
  adminId: string,
  adminEmail: string
): Promise<boolean> {
  const passwordHash = await hashPassword(newPassword);

  const result = await query(
    `UPDATE users SET 
      password_hash = $1,
      must_change_password = true,
      failed_login_attempts = 0,
      locked_until = NULL
     WHERE id = $2`,
    [passwordHash, id]
  );

  if (result.rowCount && result.rowCount > 0) {
    // Invalidate all sessions
    await query('DELETE FROM sessions WHERE user_id = $1', [id]);

    await createAuditLog({
      userId: adminId,
      userEmail: adminEmail,
      action: 'USER_PASSWORD_CHANGED',
      resourceType: 'user',
      resourceId: id,
      details: { resetByAdmin: true },
    });

    return true;
  }

  return false;
}

/**
 * Get user sessions
 */
export async function getUserSessions(userId: string): Promise<Array<{
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  lastActivityAt: Date;
  isCurrent?: boolean;
}>> {
  const result = await query<{
    id: string;
    userAgent: string | null;
    ipAddress: string | null;
    createdAt: Date;
    lastActivityAt: Date;
  }>(
    `SELECT id, user_agent as "userAgent", ip_address as "ipAddress", 
            created_at as "createdAt", last_activity_at as "lastActivityAt"
     FROM sessions
     WHERE user_id = $1 AND expires_at > NOW()
     ORDER BY last_activity_at DESC`,
    [userId]
  );

  return result.rows;
}

