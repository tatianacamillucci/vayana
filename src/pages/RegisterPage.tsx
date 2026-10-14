// src/pages/RegisterPage.tsx
import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { VayanaLogo } from '@/components/VayanaLogo';

export function RegisterPage(): React.ReactElement {
  const { signUp, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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
      await signUp({ firstName, lastName, email, password });
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data;
      const raw = data?.message;
      const msg = Array.isArray(raw) ? raw.join(', ') : (raw ?? 'Registrazione non riuscita');
      setError(msg);
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
          <h1 className="auth-title">Crea il tuo account</h1>
          <p className="auth-subtitle">Inizia a gestire i tuoi progetti con Vayana</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {error && <div className="auth-error" role="alert">{error}</div>}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName" className="form-label">Nome</label>
              <input
                id="firstName"
                type="text"
                className="form-input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Mario"
                required
                autoComplete="given-name"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName" className="form-label">Cognome</label>
              <input
                id="lastName"
                type="text"
                className="form-input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Rossi"
                required
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mario@esempio.com"
              required
              autoComplete="email"
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
              placeholder="Min. 8 caratteri, maiuscola, numero"
              required
              autoComplete="new-password"
            />
            <p className="form-hint">Almeno 8 caratteri con maiuscola, minuscola e numero.</p>
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Registrazione in corso...' : 'Crea account'}
          </button>
        </form>

        <p className="auth-footer">
          Hai già un account?{' '}
          <Link to="/login" className="auth-link">Accedi</Link>
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
