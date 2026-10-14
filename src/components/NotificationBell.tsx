// src/components/NotificationBell.tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useUnreadCount,
  useNotifications,
  useMarkNotificationRead,
  useMarkAllRead,
  type Notification,
} from '@/lib/hooks/useNotifications';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'ora';
  if (m < 60) return `${m}m fa`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h fa`;
  const d = Math.floor(h / 24);
  return `${d}g fa`;
}

function NotifIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
      <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface NotifRowProps {
  notif: Notification;
  onRead: (id: string) => void;
}

function NotifRow({ notif, onRead }: NotifRowProps) {
  const navigate = useNavigate();
  const isUnread = !notif.readAt;

  const handleClick = () => {
    if (isUnread) onRead(notif.id);
    if (notif.projectId) navigate(`/projects/${notif.projectId}`);
  };

  return (
    <button
      onClick={handleClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 14px',
        background: isUnread ? 'rgba(99,102,241,0.07)' : 'transparent',
        border: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = isUnread ? 'rgba(99,102,241,0.12)' : 'var(--bg-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = isUnread ? 'rgba(99,102,241,0.07)' : 'transparent')}
    >
      {/* Unread dot */}
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: isUnread ? '#6366f1' : 'transparent',
          flexShrink: 0,
          marginTop: 5,
        }}
      />
      {/* Icon */}
      <span style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 1 }}>
        <NotifIcon />
      </span>
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: isUnread ? 600 : 400, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 2 }}>
          {notif.title}
        </div>
        {notif.body && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {notif.body}
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
          {relativeTime(notif.createdAt)}
        </div>
      </div>
    </button>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: unread = 0 } = useUnreadCount();
  const { data } = useNotifications({ limit: 20 });
  const notifications = data?.data ?? [];

  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: markAll, isPending: markingAll } = useMarkAllRead();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Notifiche"
        style={{
          position: 'relative',
          background: open ? 'var(--bg-hover)' : 'transparent',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          padding: '6px 8px',
          display: 'flex',
          alignItems: 'center',
          color: 'var(--text-secondary)',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = 'var(--bg-hover)'; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
          <path
            d="M10 2a6 6 0 00-6 6v3l-1.5 2.5h15L16 11V8a6 6 0 00-6-6z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M8.5 17.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        {unread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 3,
              right: 3,
              minWidth: 16,
              height: 16,
              borderRadius: 999,
              background: '#ef4444',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
              lineHeight: 1,
            }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: 340,
            maxHeight: 480,
            background: 'var(--bg-secondary)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 500,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px 10px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Notifiche {unread > 0 && <span style={{ color: '#6366f1' }}>({unread})</span>}
            </span>
            {unread > 0 && (
              <button
                onClick={() => markAll()}
                disabled={markingAll}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 12,
                  color: '#6366f1',
                  cursor: 'pointer',
                  padding: 0,
                  opacity: markingAll ? 0.5 : 1,
                }}
              >
                Segna tutte come lette
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Nessuna notifica
              </div>
            ) : (
              notifications.map((n) => (
                <NotifRow
                  key={n.id}
                  notif={n}
                  onRead={(id) => markRead(id)}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.07)',
              padding: '10px 14px',
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => { setOpen(false); navigate('/notifications'); }}
              style={{
                width: '100%',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 7,
                color: 'var(--text-secondary)',
                fontSize: 13,
                fontWeight: 500,
                padding: '7px',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Vedi tutte le notifiche
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
