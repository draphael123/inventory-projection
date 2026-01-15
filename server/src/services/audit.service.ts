import { query } from '../db/connection.js';
import type { AuditAction, AuditLog, PaginationParams } from '../types/index.js';

interface AuditLogInput {
  userId?: string | null;
  userEmail?: string | null;
  action: AuditAction;
  resourceType?: string | null;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Create an audit log entry
 * This is append-only - entries cannot be modified or deleted (HIPAA requirement)
 */
export async function createAuditLog(input: AuditLogInput): Promise<AuditLog> {
  const result = await query<AuditLog>(
    `INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, details, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.userId || null,
      input.userEmail || null,
      input.action,
      input.resourceType || null,
      input.resourceId || null,
      input.details ? JSON.stringify(input.details) : null,
      input.ipAddress || null,
      input.userAgent || null,
    ]
  );

  return result.rows[0];
}

/**
 * Get audit logs with pagination and filtering
 */
export async function getAuditLogs(
  params: PaginationParams & {
    userId?: string;
    action?: AuditAction;
    startDate?: Date;
    endDate?: Date;
    searchTerm?: string;
  }
): Promise<{ logs: AuditLog[]; total: number }> {
  const { page = 1, limit = 50, sortBy = 'timestamp', sortOrder = 'desc' } = params;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (params.userId) {
    conditions.push(`user_id = $${paramIndex++}`);
    values.push(params.userId);
  }

  if (params.action) {
    conditions.push(`action = $${paramIndex++}`);
    values.push(params.action);
  }

  if (params.startDate) {
    conditions.push(`timestamp >= $${paramIndex++}`);
    values.push(params.startDate);
  }

  if (params.endDate) {
    conditions.push(`timestamp <= $${paramIndex++}`);
    values.push(params.endDate);
  }

  if (params.searchTerm) {
    conditions.push(`(user_email ILIKE $${paramIndex} OR details::text ILIKE $${paramIndex})`);
    values.push(`%${params.searchTerm}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  // Validate sort column to prevent SQL injection
  const validSortColumns = ['timestamp', 'action', 'user_email'];
  const safeSort = validSortColumns.includes(sortBy) ? sortBy : 'timestamp';
  const safeOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get logs
  const logsResult = await query<AuditLog>(
    `SELECT * FROM audit_logs ${whereClause}
     ORDER BY ${safeSort} ${safeOrder}
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...values, limit, offset]
  );

  return {
    logs: logsResult.rows,
    total,
  };
}

/**
 * Get audit logs for a specific resource
 */
export async function getResourceAuditLogs(
  resourceType: string,
  resourceId: string
): Promise<AuditLog[]> {
  const result = await query<AuditLog>(
    `SELECT * FROM audit_logs
     WHERE resource_type = $1 AND resource_id = $2
     ORDER BY timestamp DESC`,
    [resourceType, resourceId]
  );

  return result.rows;
}

/**
 * Get user activity summary
 */
export async function getUserActivitySummary(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{ action: string; count: number }[]> {
  const result = await query<{ action: string; count: string }>(
    `SELECT action, COUNT(*) as count
     FROM audit_logs
     WHERE user_id = $1 AND timestamp BETWEEN $2 AND $3
     GROUP BY action
     ORDER BY count DESC`,
    [userId, startDate, endDate]
  );

  return result.rows.map(row => ({
    action: row.action,
    count: parseInt(row.count, 10),
  }));
}

/**
 * Helper function to log common actions
 */
export const auditHelpers = {
  async logLogin(userId: string, email: string, ip: string | null, userAgent: string | null) {
    return createAuditLog({
      userId,
      userEmail: email,
      action: 'USER_LOGIN',
      ipAddress: ip,
      userAgent,
    });
  },

  async logLogout(userId: string, email: string, ip: string | null) {
    return createAuditLog({
      userId,
      userEmail: email,
      action: 'USER_LOGOUT',
      ipAddress: ip,
    });
  },

  async logFailedLogin(email: string, ip: string | null, reason: string) {
    return createAuditLog({
      userEmail: email,
      action: 'USER_LOGIN_FAILED',
      details: { reason },
      ipAddress: ip,
    });
  },

  async logDataUpload(userId: string, email: string, fileId: string, fileName: string, recordCount: number) {
    return createAuditLog({
      userId,
      userEmail: email,
      action: 'DATA_UPLOADED',
      resourceType: 'file',
      resourceId: fileId,
      details: { fileName, recordCount },
    });
  },

  async logDataExport(userId: string, email: string, format: string, productCount: number) {
    return createAuditLog({
      userId,
      userEmail: email,
      action: 'DATA_EXPORTED',
      details: { format, productCount },
    });
  },

  async logUnauthorizedAccess(ip: string | null, path: string, method: string) {
    return createAuditLog({
      action: 'UNAUTHORIZED_ACCESS',
      details: { path, method },
      ipAddress: ip,
    });
  },
};

