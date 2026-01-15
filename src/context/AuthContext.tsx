import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';

// Types
export type UserRole = 'admin' | 'analyst' | 'viewer';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; accessToken: string; refreshToken: string } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_TOKENS'; payload: { accessToken: string; refreshToken: string } }
  | { type: 'UPDATE_USER'; payload: User };

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// API base URL
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false,
      };
    case 'UPDATE_TOKENS':
      return {
        ...state,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    default:
      return state;
  }
}

// Context
interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  refreshAccessToken: () => Promise<boolean>;
  hasRole: (...roles: UserRole[]) => boolean;
  isAdmin: boolean;
  isAnalyst: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'inventory_access_token',
  REFRESH_TOKEN: 'inventory_refresh_token',
  USER: 'inventory_user',
};

// Provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load stored auth on mount
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedAccessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const storedRefreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        const storedUser = localStorage.getItem(STORAGE_KEYS.USER);

        if (storedAccessToken && storedRefreshToken && storedUser) {
          // Verify token is still valid
          const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${storedAccessToken}`,
            },
          });

          if (response.ok) {
            const userData = await response.json();
            dispatch({
              type: 'LOGIN_SUCCESS',
              payload: {
                user: userData.data.user,
                accessToken: storedAccessToken,
                refreshToken: storedRefreshToken,
              },
            });
          } else if (response.status === 401) {
            // Try to refresh token
            const refreshed = await refreshTokens(storedRefreshToken);
            if (!refreshed) {
              clearStorage();
              dispatch({ type: 'LOGOUT' });
            }
          } else {
            clearStorage();
            dispatch({ type: 'LOGOUT' });
          }
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch {
        clearStorage();
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadStoredAuth();
  }, []);

  // Helper to refresh tokens
  const refreshTokens = async (refreshToken: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        const { accessToken, refreshToken: newRefreshToken } = data.data;

        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);

        dispatch({
          type: 'UPDATE_TOKENS',
          payload: { accessToken, refreshToken: newRefreshToken },
        });

        // Get user info
        const userResponse = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData.data.user));
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: {
              user: userData.data.user,
              accessToken,
              refreshToken: newRefreshToken,
            },
          });
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  // Clear storage
  const clearStorage = () => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  };

  // Login
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const { user, accessToken, refreshToken } = data.data;

        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user, accessToken, refreshToken },
        });

        return true;
      } else {
        dispatch({
          type: 'SET_ERROR',
          payload: data.error?.message || 'Login failed',
        });
        return false;
      }
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: 'Network error. Please try again.',
      });
      return false;
    }
  }, []);

  // Logout
  const logout = useCallback(async (): Promise<void> => {
    try {
      if (state.accessToken) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${state.accessToken}`,
          },
        });
      }
    } catch {
      // Ignore errors during logout
    } finally {
      clearStorage();
      dispatch({ type: 'LOGOUT' });
    }
  }, [state.accessToken]);

  // Register
  const register = useCallback(async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return true;
      } else {
        dispatch({
          type: 'SET_ERROR',
          payload: responseData.error?.message || 'Registration failed',
        });
        return false;
      }
    } catch {
      dispatch({
        type: 'SET_ERROR',
        payload: 'Network error. Please try again.',
      });
      return false;
    }
  }, []);

  // Change password
  const changePassword = useCallback(async (
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> => {
    if (!state.accessToken) return false;

    try {
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.accessToken}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (response.ok) {
        // User needs to login again after password change
        clearStorage();
        dispatch({ type: 'LOGOUT' });
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }, [state.accessToken]);

  // Refresh access token
  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    if (!state.refreshToken) return false;
    return refreshTokens(state.refreshToken);
  }, [state.refreshToken]);

  // Role helpers
  const hasRole = useCallback((...roles: UserRole[]): boolean => {
    if (!state.user) return false;
    return roles.includes(state.user.role);
  }, [state.user]);

  const isAdmin = state.user?.role === 'admin';
  const isAnalyst = state.user?.role === 'analyst' || state.user?.role === 'admin';

  const value: AuthContextType = {
    state,
    login,
    logout,
    register,
    changePassword,
    refreshAccessToken,
    hasRole,
    isAdmin,
    isAnalyst,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// API helper with auto-refresh
export function useAuthenticatedFetch() {
  const { state, refreshAccessToken, logout } = useAuth();

  return useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
    
    const makeRequest = async (token: string | null) => {
      return fetch(fullUrl, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    };

    let response = await makeRequest(state.accessToken);

    // If unauthorized, try to refresh token
    if (response.status === 401 && state.refreshToken) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry with new token
        response = await makeRequest(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN));
      } else {
        await logout();
      }
    }

    return response;
  }, [state.accessToken, state.refreshToken, refreshAccessToken, logout]);
}

