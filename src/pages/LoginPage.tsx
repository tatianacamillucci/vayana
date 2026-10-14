// src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { VayanaLogo } from '@/components/VayanaLogo';

export function LoginPage(): React.ReactElement {
  const { signIn, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await signIn({ email, password });
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Email o password non validi';
      setError(typeof msg === 'string' ? msg : 'Email o password non validi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left: form */}
      <div className="auth-form-col">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-title">Accedi a Vayana</h1>
            <p className="auth-subtitle">Inserisci le tue credenziali per continuare</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {error && <div className="auth-error" role="alert">{error}</div>}

            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                id="email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@esempio.com"
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="La tua password"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Accesso in corso...' : 'Accedi'}
            </button>
          </form>

          <p className="auth-footer">
            Non hai un account?{' '}
            <Link to="/register" className="auth-link">Registrati</Link>
          </p>
        </div>
      </div>

      {/* Right: branding */}
      <div className="auth-brand-col">
        <div className="auth-brand-logo">
          <VayanaLogo size={64} showWordmark wordmarkSize={48} />
        </div>
        <p className="auth-brand-subtitle">
          Il project management pensato per i team che vogliono muoversi veloce.
        </p>
      </div>
    </div>
  );
}
