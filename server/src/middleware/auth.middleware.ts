import { Request, Response, NextFunction } from 'express';
import { verifyToken, getSession, updateSessionActivity, getUserById, toSafeUser } from '../services/auth.service.js';
import { auditHelpers } from '../services/audit.service.js';
import type { SafeUser, UserRole } from '../types/index.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
      sessionId?: string;
    }
  }
}

/**
 * Get client IP address
 */
export function getClientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',');
    return ips[0].trim();
  }
  return req.socket.remoteAddress || null;
}

/**
 * Authentication middleware - requires valid JWT
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    auditHelpers.logUnauthorizedAccess(getClientIp(req), req.path, req.method);
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
    return;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload || payload.type !== 'access') {
    auditHelpers.logUnauthorizedAccess(getClientIp(req), req.path, req.method);
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      },
    });
    return;
  }

  // Verify session exists
  getSession(payload.sessionId)
    .then(async (session) => {
      if (!session) {
        auditHelpers.logUnauthorizedAccess(getClientIp(req), req.path, req.method);
        res.status(401).json({
          success: false,
          error: {
            code: 'SESSION_INVALID',
            message: 'Session expired or invalid',
          },
        });
        return;
      }

      // Get user
      const user = await getUserById(payload.userId);
      if (!user || !user.isActive) {
        res.status(401).json({
          success: false,
          error: {
            code: 'USER_INACTIVE',
            message: 'User account is inactive',
          },
        });
        return;
      }

      // Update session activity
      await updateSessionActivity(payload.sessionId);

      // Attach user and session to request
      req.user = toSafeUser(user);
      req.sessionId = payload.sessionId;

      next();
    })
    .catch((error) => {
      console.error('Auth middleware error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Authentication error',
        },
      });
    });
}

/**
 * Authorization middleware - requires specific roles
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      auditHelpers.logUnauthorizedAccess(getClientIp(req), req.path, req.method);
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
      return;
    }

    next();
  };
}

/**
 * Optional authentication - attaches user if token is valid
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload || payload.type !== 'access') {
    next();
    return;
  }

  getSession(payload.sessionId)
    .then(async (session) => {
      if (session) {
        const user = await getUserById(payload.userId);
        if (user && user.isActive) {
          req.user = toSafeUser(user);
          req.sessionId = payload.sessionId;
          await updateSessionActivity(payload.sessionId);
        }
      }
      next();
    })
    .catch(() => {
      next();
    });
}

/**
 * Check if user must change password
 */
export function checkPasswordChange(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.mustChangePassword) {
    // Allow access to password change endpoint
    if (req.path === '/api/auth/change-password') {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: {
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'You must change your password before continuing',
      },
    });
    return;
  }

  next();
}

