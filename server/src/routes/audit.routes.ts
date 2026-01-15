import { Router, Request, Response } from 'express';
import { getAuditLogs, getUserActivitySummary } from '../services/audit.service.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate, schemas } from '../middleware/validation.middleware.js';
import type { AuditAction } from '../types/index.js';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

/**
 * GET /api/audit
 * Get audit logs with pagination and filtering
 */
router.get(
  '/',
  validate(schemas.auditLogFilter, 'query'),
  async (req: Request, res: Response) => {
    try {
      const { page, limit, userId, action, startDate, endDate, searchTerm } = req.query as any;

      const result = await getAuditLogs({
        page,
        limit,
        userId,
        action: action as AuditAction,
        startDate,
        endDate,
        searchTerm,
      });

      res.set('X-Total-Count', result.total.toString());
      res.json({
        success: true,
        data: result.logs,
        meta: {
          page,
          limit,
          total: result.total,
        },
      });
    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch audit logs',
        },
      });
    }
  }
);

/**
 * GET /api/audit/actions
 * Get list of available audit actions
 */
router.get('/actions', (_req: Request, res: Response) => {
  const actions: AuditAction[] = [
    'USER_LOGIN',
    'USER_LOGOUT',
    'USER_LOGIN_FAILED',
    'USER_CREATED',
    'USER_UPDATED',
    'USER_DELETED',
    'USER_PASSWORD_CHANGED',
    'USER_LOCKED',
    'USER_UNLOCKED',
    'DATA_UPLOADED',
    'DATA_VIEWED',
    'DATA_EXPORTED',
    'DATA_DELETED',
    'PROJECTION_GENERATED',
    'SETTINGS_CHANGED',
    'SESSION_EXPIRED',
    'UNAUTHORIZED_ACCESS',
  ];

  res.json({
    success: true,
    data: { actions },
  });
});

/**
 * GET /api/audit/user/:id/summary
 * Get activity summary for a specific user
 */
router.get(
  '/user/:id/summary',
  validate(schemas.uuidParam, 'params'),
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate 
        ? new Date(startDate as string) 
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
      
      const end = endDate 
        ? new Date(endDate as string) 
        : new Date();

      const summary = await getUserActivitySummary(req.params.id, start, end);

      res.json({
        success: true,
        data: { 
          summary,
          period: {
            start,
            end,
          },
        },
      });
    } catch (error) {
      console.error('Get user activity summary error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch activity summary',
        },
      });
    }
  }
);

export default router;

