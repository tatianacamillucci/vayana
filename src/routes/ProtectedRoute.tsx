// src/routes/ProtectedRoute.tsx
// Real authentication guard — redirects to /login if not authenticated.
// Passes the current path as state so login can redirect back after success.
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function ProtectedRoute(): React.ReactElement {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // While checking auth state (on app load), show nothing to avoid flash
  if (isLoading) {
    return (
      <div className="page-container">
        <div className="loading">Verifica autenticazione...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
