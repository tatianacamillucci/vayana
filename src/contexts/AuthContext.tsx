// src/contexts/AuthContext.tsx
// Provides authentication state (current user) to the entire app.
// Uses /users/me to determine if the user is logged in (cookie-based auth).
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { getMe, login, register, logout, AuthUser, LoginPayload, RegisterPayload } from '@/lib/api/auth';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (payload: LoginPayload) => Promise<void>;
  signUp: (payload: RegisterPayload) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasCheckedAuth = useRef(false);

  const refreshUser = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  // On mount: check if we have a valid session by calling /users/me
  useEffect(() => {
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;

    const useBackend = import.meta.env.VITE_USE_BACKEND === 'true';
    if (!useBackend) {
      setIsLoading(false);
      return;
    }

    refreshUser().finally(() => setIsLoading(false));
  }, []);

  const signIn = async (payload: LoginPayload) => {
    await login(payload);
    // After login, the backend sets the cookie — fetch the user profile
    const me = await getMe();
    setUser(me);
  };

  const signUp = async (payload: RegisterPayload) => {
    await register(payload);
    // After register, the backend sets the cookie — fetch the user profile
    const me = await getMe();
    setUser(me);
  };

  const signOut = async () => {
    try {
      await logout();
    } finally {
      setUser(null);
    }
  };

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    signIn,
    signUp,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
