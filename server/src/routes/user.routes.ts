import { Router, Request, Response } from 'express';
import { createUser } from '../services/auth.service.js';
import { 
  getUsers, 
  getSafeUserById, 
  updateUser, 
  deleteUser, 
  unlockUser,
  resetUserPassword,
  getUserSessions,
} from '../services/user.service.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate, schemas } from '../middleware/validation.middleware.js';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

/**
 * GET /api/users
 * List all users with pagination
 */
router.get(
  '/',
  validate(schemas.pagination, 'query'),
  async (req: Request, res: Response) => {
    try {
      const { page, limit, sortBy, sortOrder } = req.query as any;
      const { role, isActive, searchTerm } = req.query;

      const result = await getUsers({
        page,
        limit,
        sortBy,
        sortOrder,
        role: role as any,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        searchTerm: searchTerm as string,
      });

      res.set('X-Total-Count', result.total.toString());
      res.json({
        success: true,
        data: result.users,
        meta: {
          page,
          limit,
          total: result.total,
        },
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch users',
        },
      });
    }
  }
);

/**
 * POST /api/users
 * Create a new user
 */
router.post(
  '/',
  validate(schemas.register),
  async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;

      const user = await createUser({
        email,
        password,
        firstName,
        lastName,
        role,
        mustChangePassword: true, // New users must change password
      });

      res.status(201).json({
        success: true,
        data: { user },
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('duplicate key')) {
        res.status(409).json({
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'A user with this email already exists',
          },
        });
        return;
      }

      console.error('Create user error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create user',
        },
      });
    }
  }
);

/**
 * GET /api/users/:id
 * Get a specific user
 */
router.get(
  '/:id',
  validate(schemas.uuidParam, 'params'),
  async (req: Request, res: Response) => {
    try {
      const user = await getSafeUserById(req.params.id);

      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch user',
        },
      });
    }
  }
);

/**
 * PUT /api/users/:id
 * Update a user
 */
router.put(
  '/:id',
  validate(schemas.uuidParam, 'params'),
  validate(schemas.updateUser),
  async (req: Request, res: Response) => {
    try {
      const user = await updateUser(
        req.params.id,
        req.body,
        req.user!.id,
        req.user!.email
      );

      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update user',
        },
      });
    }
  }
);

/**
 * DELETE /api/users/:id
 * Deactivate a user
 */
router.delete(
  '/:id',
  validate(schemas.uuidParam, 'params'),
  async (req: Request, res: Response) => {
    try {
      const success = await deleteUser(
        req.params.id,
        req.user!.id,
        req.user!.email
      );

      if (!success) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: { message: 'User deactivated successfully' },
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('Cannot delete your own')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_OPERATION',
            message: error.message,
          },
        });
        return;
      }

      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete user',
        },
      });
    }
  }
);

/**
 * POST /api/users/:id/unlock
 * Unlock a locked user account
 */
router.post(
  '/:id/unlock',
  validate(schemas.uuidParam, 'params'),
  async (req: Request, res: Response) => {
    try {
      const success = await unlockUser(
        req.params.id,
        req.user!.id,
        req.user!.email
      );

      if (!success) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: { message: 'User account unlocked' },
      });
    } catch (error) {
      console.error('Unlock user error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to unlock user',
        },
      });
    }
  }
);

/**
 * POST /api/users/:id/reset-password
 * Reset a user's password
 */
router.post(
  '/:id/reset-password',
  validate(schemas.uuidParam, 'params'),
  validate(schemas.resetPassword),
  async (req: Request, res: Response) => {
    try {
      const { newPassword } = req.body;

      const success = await resetUserPassword(
        req.params.id,
        newPassword,
        req.user!.id,
        req.user!.email
      );

      if (!success) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: { message: 'Password reset successfully. User must change password on next login.' },
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to reset password',
        },
      });
    }
  }
);

/**
 * GET /api/users/:id/sessions
 * Get active sessions for a user
 */
router.get(
  '/:id/sessions',
  validate(schemas.uuidParam, 'params'),
  async (req: Request, res: Response) => {
    try {
      const sessions = await getUserSessions(req.params.id);

      res.json({
        success: true,
        data: { sessions },
      });
    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch sessions',
        },
      });
    }
  }
);

export default router;

