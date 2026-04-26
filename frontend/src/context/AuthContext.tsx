import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import type { AuthContextType, LoginFormData, RegisterFormData } from '../types';

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthContextType['user']>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Parse JWT payload (no verification — just decode)
  const parseJwt = (token: string) => {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  };

  // Schedule proactive token refresh before expiry
  const scheduleRefresh = useCallback((token: string) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const payload = parseJwt(token);
    if (!payload?.exp) return;
    const expiresIn = payload.exp * 1000 - Date.now();
    const refreshIn = Math.max(expiresIn - 60_000, 0); // 60s before expiry
    refreshTimerRef.current = setTimeout(() => refreshTokens(), refreshIn);
  }, []);

  const setAuthState = useCallback((token: string, userData: AuthContextType['user']) => {
    localStorage.setItem('accessToken', token);
    setAccessToken(token);
    setUser(userData);
    scheduleRefresh(token);
  }, [scheduleRefresh]);

  const clearAuthState = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    localStorage.removeItem('accessToken');
    setAccessToken(null);
    setUser(null);
  }, []);

  // Try to restore session via refresh token (httpOnly cookie)
  const refreshTokens = useCallback(async (): Promise<boolean> => {
    try {
      const { data } = await api.post('/auth/refresh');
      const newToken = data.data.accessToken;
      const payload = parseJwt(newToken);
      if (!payload) return false;
      setAuthState(newToken, {
        id: payload.userId,
        username: payload.username,
        email: payload.email,
      });
      return true;
    } catch {
      clearAuthState();
      return false;
    }
  }, [setAuthState, clearAuthState]);

  // On mount, restore session
  useEffect(() => {
    const restore = async () => {
      setIsLoading(true);
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) {
        const payload = parseJwt(storedToken);
        const isExpired = payload?.exp ? payload.exp * 1000 < Date.now() : true;
        if (!isExpired) {
          setAuthState(storedToken, {
            id: payload.userId,
            username: payload.username,
            email: payload.email,
          });
          setIsLoading(false);
          return;
        }
      }
      // Try refresh if stored token missing/expired
      await refreshTokens();
      setIsLoading(false);
    };

    restore();

    // Listen for forced logout events (e.g., from axios interceptor)
    const handleForceLogout = () => clearAuthState();
    window.addEventListener('auth:logout', handleForceLogout);
    return () => {
      window.removeEventListener('auth:logout', handleForceLogout);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const login = async (formData: LoginFormData) => {
    const { data } = await api.post('/auth/login', {
      email: formData.email,
      password: formData.password,
    });
    setAuthState(data.data.accessToken, data.data.user);
  };

  const register = async (formData: RegisterFormData) => {
    await api.post('/auth/register', {
      username: formData.username,
      email: formData.email,
      password: formData.password,
    });
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // best-effort
    } finally {
      clearAuthState();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshTokens,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};