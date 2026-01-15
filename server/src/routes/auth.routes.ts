import { Router, Request, Response } from 'express';
import { 
  login, 
  logout, 
  refreshAccessToken, 
  createUser, 
  changePassword,
  logoutAllSessions 
} from '../services/auth.service.js';
import { authenticate, getClientIp, checkPasswordChange } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/security.middleware.js';
import { validate, schemas } from '../middleware/validation.middleware.js';

const router = Router();

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post(
  '/login',
  authRateLimiter,
  validate(schemas.login),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const ipAddress = getClientIp(req);
      const userAgent = req.get('user-agent') || null;

      const result = await login(email, password, ipAddress, userAgent);

      if ('error' in result) {
        res.status(401).json({
          success: false,
          error: {
            code: result.code,
            message: result.error,
          },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Login failed',
        },
      });
    }
  }
);

/**
 * POST /api/auth/register
 * Register a new user (admin only in production)
 */
router.post(
  '/register',
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

      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Registration failed',
        },
      });
    }
  }
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Refresh token is required',
        },
      });
      return;
    }

    const tokens = await refreshAccessToken(refreshToken);

    if (!tokens) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Token refresh failed',
      },
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout current session
 */
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    const ipAddress = getClientIp(req);
    await logout(req.sessionId!, req.user!.id, req.user!.email, ipAddress);

    res.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Logout failed',
      },
    });
  }
});

/**
 * POST /api/auth/logout-all
 * Logout all sessions for current user
 */
router.post('/logout-all', authenticate, async (req: Request, res: Response) => {
  try {
    await logoutAllSessions(req.user!.id);

    res.json({
      success: true,
      data: { message: 'All sessions logged out successfully' },
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Logout failed',
      },
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change current user's password
 */
router.post(
  '/change-password',
  authenticate,
  validate(schemas.changePassword),
  async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const success = await changePassword(req.user!.id, currentPassword, newPassword);

      if (!success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: 'Current password is incorrect',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: { message: 'Password changed successfully. Please log in again.' },
      });
    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Password change failed',
        },
      });
    }
  }
);

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, checkPasswordChange, (req: Request, res: Response) => {
  res.json({
    success: true,
    data: { user: req.user },
  });
});

export default router;

