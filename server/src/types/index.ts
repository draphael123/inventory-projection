// User roles for RBAC
export type UserRole = 'admin' | 'analyst' | 'viewer';

// User entity
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// User without sensitive fields
export interface SafeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

// Session entity
export interface Session {
  id: string;
  userId: string;
  refreshToken: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  createdAt: Date;
  lastActivityAt: Date;
}

// Audit log actions
export type AuditAction = 
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_LOGIN_FAILED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'USER_PASSWORD_CHANGED'
  | 'USER_LOCKED'
  | 'USER_UNLOCKED'
  | 'DATA_UPLOADED'
  | 'DATA_VIEWED'
  | 'DATA_EXPORTED'
  | 'DATA_DELETED'
  | 'PROJECTION_GENERATED'
  | 'SETTINGS_CHANGED'
  | 'SESSION_EXPIRED'
  | 'UNAUTHORIZED_ACCESS';

// Audit log entity
export interface AuditLog {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: AuditAction;
  resourceType: string | null;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
}

// Uploaded file metadata
export interface UploadedFile {
  id: string;
  userId: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  recordCount: number;
  dateRangeStart: Date | null;
  dateRangeEnd: Date | null;
  status: 'processing' | 'success' | 'error';
  errorMessage: string | null;
  createdAt: Date;
}

// Order record (stored in database)
export interface StoredOrderRecord {
  id: string;
  fileId: string;
  userId: string;
  date: Date;
  productId: string;
  productName: string;
  quantity: number;
  category: string | null;
  unitPrice: number | null;
  supplier: string | null;
  createdAt: Date;
}

// Saved projection settings
export interface SavedProjectionSettings {
  id: string;
  userId: string;
  name: string;
  method: 'sma' | 'wma' | 'linear_regression';
  timeframe: string;
  periods: number;
  safetyStockPercent: number;
  leadTimeDays: number;
  confidenceLevel: number;
  aggregationPeriod: 'daily' | 'weekly' | 'monthly';
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// JWT payload
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  sessionId: string;
  type: 'access' | 'refresh';
}

// Request with authenticated user
export interface AuthenticatedRequest {
  user: SafeUser;
  sessionId: string;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// Pagination params
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

