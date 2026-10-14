import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AppRole, getStoredUserRole, subscribeToRoleChanges } from './lib/userRole';
import { useDatabase } from './contexts/DatabaseContext';
import { useAuth } from './contexts/AuthContext';
import { VayanaLogo } from './components/VayanaLogo';
import { AppRoutes } from './routes';
import { SearchModal } from './components/SearchModal';
import { NotificationBell } from './components/NotificationBell';
import { ToastContainer } from './components/ToastContainer';

type ThemeMode = 'dark' | 'light';

interface NavItem {
  id: string;
  path: string;
  label: string;
  icon: string;
  minRole?: AppRole[];
}

const navItems: NavItem[] = [
  { id: 'home', path: '/', label: 'Home', icon: 'home' },
  { id: 'attivita', path: '/activities', label: 'Le Mie Attività', icon: 'tasks' },
  { id: 'strategia', path: '/projects', label: 'Progetti', icon: 'projects' },
  { id: 'flusso', path: '/tasks', label: 'Flusso di lavoro', icon: 'workflow' },
  { id: 'team_overview', path: '/teams', label: 'Team Overview', icon: 'overview', minRole: ['team_lead', 'owner'] },
  { id: 'calendar', path: '/calendar', label: 'Calendario', icon: 'calendar' },
  { id: 'portfolio', path: '/portfolios', label: 'Portfolio', icon: 'portfolio' },
  { id: 'persone', path: '/teams', label: 'Persone', icon: 'people' },
];


function renderMenuIcon(icon: string): React.ReactElement {
  switch (icon) {
    case 'home':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 11.5L12 4l9 7.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6.5 10.5V20h11V10.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'tasks':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="1.9" />
          <path d="M8 12l2.2 2.2L16 8.8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'projects':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="5" width="7" height="6" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.9" />
          <rect x="13" y="5" width="7" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.9" />
          <rect x="4" y="13" width="7" height="6" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.9" />
        </svg>
      );
    case 'workflow':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h9a4 4 0 014 4v1" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M15.5 5.5L17.8 8 20 5.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 17h-9a4 4 0 01-4-4v-1" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M8.5 18.5L6.2 16 4 18.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'overview':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="5" width="16" height="14" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.9" />
          <path d="M8 14l2.2-2.2L12 13.5l3.8-4.2L18 11" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'calendar':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.9" />
          <path d="M3 9h18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          <circle cx="8" cy="14" r="1" fill="currentColor" />
          <circle cx="12" cy="14" r="1" fill="currentColor" />
          <circle cx="16" cy="14" r="1" fill="currentColor" />
        </svg>
      );
    case 'portfolio':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.5" y="6" width="17" height="13" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.9" />
          <path d="M9 6V4.8A1.8 1.8 0 0110.8 3h2.4A1.8 1.8 0 0115 4.8V6" fill="none" stroke="currentColor" strokeWidth="1.9" />
        </svg>
      );
    case 'people':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="9" cy="9" r="3" fill="none" stroke="currentColor" strokeWidth="1.9" />
          <circle cx="16" cy="10" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.9" />
          <path d="M4 18a5 5 0 0110 0M13.5 18a3.8 3.8 0 013.8-3.8A3.8 3.8 0 0121 18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      );
    case 'profile':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8.2" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.9" />
          <path d="M5 19a7 7 0 0114 0" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      );
  }
}

export function App(): React.ReactElement {
  const { isReady, isLoading, error } = useDatabase();
  const { user, signOut, isAuthenticated, isLoading: authLoading } = useAuth();

  const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';
  const showShell = isAuthenticated;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => window.innerWidth <= 900);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [role, setRole] = useState<AppRole>('member');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchAnchorRef = useRef<HTMLDivElement | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('vayana-theme');
    const initialTheme: ThemeMode = stored === 'light' ? 'light' : 'dark';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobileViewport(mobile);
      if (!mobile) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isMobileViewport]);

  useEffect(() => {
    setRole(getStoredUserRole());
    return subscribeToRoleChanges(setRole);
  }, []);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('vayana-theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    try {
      await signOut();
    } finally {
      navigate('/login');
    }
  };

  // A nav item is active if the current pathname starts with its path
  // (e.g., /projects/123 → 'strategia' is active)
  const isActive = (item: NavItem) => {
    if (item.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.path);
  };

  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : '?';
  const displayName = user ? `${user.firstName} ${user.lastName}` : 'Accedi';
  const displayEmail = user?.email ?? (isAuthenticated ? '' : 'Non autenticato');

  // Auth guard — must be FIRST: block all rendering until auth state is resolved.
  // This prevents the flash where isAuthenticated briefly = false before /users/me responds.
  if (USE_BACKEND && authLoading) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div className="loading">Caricamento...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="app">
        <main className="main-content">
          <div className="page-container">
            <div className="loading">Caricamento database...</div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <main className="main-content">
          <div className="page-container">
            <div className="empty-state">Errore database: {error}</div>
          </div>
        </main>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="app">
        <main className="main-content">
          <div className="page-container">
            <div className="loading">Inizializzazione database...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`app ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}>
      {showShell && <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <button
            className="toggle-btn sidebar-hamburger"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label="Toggle sidebar"
            title="Apri o chiudi menu"
          >
            {'\u2630'}
          </button>
          <div className="logo">
            <VayanaLogo size={36} showWordmark wordmarkSize={28} />
          </div>
        </div>

        <nav className="nav-menu">
          {navItems
            .filter((item) => !item.minRole || item.minRole.includes(role))
            .map((item) => (
              <Link
                key={item.id}
                to={item.path}
                className={`nav-item ${isActive(item) ? 'active' : ''}`}
                onClick={() => { if (isMobileViewport) setMobileMenuOpen(false); }}
              >
                <span className="nav-icon">{renderMenuIcon(item.icon)}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            ))}
        </nav>

        <div
          ref={userMenuRef}
          style={{
            marginTop: 'auto',
            padding: sidebarCollapsed ? '12px 8px' : '12px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            position: 'relative',
          }}
        >
          {userMenuOpen && (
            <div
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 6px)',
                left: sidebarCollapsed ? '50%' : 0,
                right: sidebarCollapsed ? 'auto' : 0,
                transform: sidebarCollapsed ? 'translateX(-50%)' : 'none',
                minWidth: sidebarCollapsed ? 180 : undefined,
                background: 'var(--bg-tertiary)',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 10,
                boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                overflow: 'hidden',
                zIndex: 100,
              }}
            >
              <div
                style={{
                  padding: '12px 14px 10px',
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  {displayName}
                </div>
                {displayEmail && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayEmail}
                  </div>
                )}
              </div>
              <div style={{ padding: '4px 0' }}>
                {isAuthenticated ? (
                  <>
                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 14px',
                        fontSize: 13,
                        color: 'var(--text-secondary)',
                        textDecoration: 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      Profilo
                    </Link>
                    <button
                      onClick={() => void handleSignOut()}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '8px 14px',
                        fontSize: 13,
                        color: '#ef4444',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      Esci
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setUserMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 14px',
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    Accedi
                  </Link>
                )}
              </div>
            </div>
          )}

          <button
            onClick={() => setUserMenuOpen((o) => !o)}
            title={sidebarCollapsed ? displayName : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: sidebarCollapsed ? '6px' : '7px 8px',
              background: userMenuOpen ? 'var(--bg-hover)' : 'transparent',
              border: '1px solid transparent',
              borderRadius: 10,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            }}
            onMouseEnter={(e) => { if (!userMenuOpen) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { if (!userMenuOpen) e.currentTarget.style.background = 'transparent'; }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--bg-hover)',
                border: '1px solid rgba(255,255,255,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text-primary)',
                flexShrink: 0,
                letterSpacing: '0.03em',
              }}
            >
              {initials}
            </div>
            {!sidebarCollapsed && (
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayEmail}
                </div>
              </div>
            )}
          </button>
        </div>
      </aside>}

      <main className="main-content">
        {showShell && <div className="app-topbar">
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label="Apri menu"
          >
            {'\u2630'}
          </button>
          <div
            className="app-search"
            ref={searchAnchorRef}
            style={{ display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}
          >
            <svg viewBox="0 0 20 20" width="15" height="15" fill="none" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
              <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.7" />
              <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setSearchOpen(true)}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSearchOpen(true);
              }}
              placeholder="Cerca"
              aria-label="Cerca"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
              }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5, padding: '1px 5px' }}>
              Ctrl K
            </span>
          </div>
          <NotificationBell />
          <button
            className="theme-toggle app-theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>}
        <AppRoutes />
      </main>
        {showShell && (
          <SearchModal
            open={searchOpen}
            onClose={() => setSearchOpen(false)}
            anchorRef={searchAnchorRef}
            query={searchQuery}
            onQueryChange={setSearchQuery}
          />
        )}
      <ToastContainer />
    </div>
  );
}
