// src/pages/NotificationsPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllRead,
  type Notification,
} from '@/lib/hooks/useNotifications';
import { SkeletonRow } from '@/components/Skeleton';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'ora';
  if (m < 60) return `${m}m fa`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h fa`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}g fa`;
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

const LIMIT = 25;

export function NotificationsPage(): React.ReactElement {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, isError } = useNotifications({ page, limit: LIMIT, unreadOnly: unreadOnly || undefined });
  const notifications: Notification[] = data?.data ?? [];
  const meta = data?.meta;

  const { mutate: markRead, isPending: markingOne } = useMarkNotificationRead();
  const { mutate: markAll, isPending: markingAll } = useMarkAllRead();

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === notifications.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(notifications.map((n) => n.id)));
    }
  };

  const markSelected = () => {
    const unread = notifications.filter((n) => selected.has(n.id) && !n.readAt);
    unread.forEach((n) => markRead(n.id));
    setSelected(new Set());
  };

  const handleRowClick = (notif: Notification) => {
    if (!notif.readAt) markRead(notif.id);
    if (notif.projectId) navigate(`/projects/${notif.projectId}`);
  };

  const switchTab = (tab: boolean) => {
    setUnreadOnly(tab);
    setPage(1);
    setSelected(new Set());
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Notifiche</h1>
          <p className="text-secondary">Tieni traccia di task assegnati e aggiornamenti.</p>
        </div>
        <button
          className="btn-secondary"
          onClick={() => markAll()}
          disabled={markingAll}
          style={{ opacity: markingAll ? 0.5 : 1 }}
        >
          Segna tutte come lette
        </button>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[
          { label: 'Tutte', value: false },
          { label: 'Non lette', value: true },
        ].map((tab) => (
          <button
            key={String(tab.value)}
            onClick={() => switchTab(tab.value)}
            style={{
              padding: '5px 14px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 500,
              border: unreadOnly === tab.value ? '1.5px solid rgba(255,255,255,0.3)' : '1.5px solid rgba(255,255,255,0.08)',
              background: unreadOnly === tab.value ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: unreadOnly === tab.value ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 14px',
            background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {selected.size} selezionate
          </span>
          <button
            onClick={markSelected}
            disabled={markingOne}
            style={{
              background: '#6366f1',
              border: 'none',
              borderRadius: 6,
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 12px',
              cursor: 'pointer',
              opacity: markingOne ? 0.6 : 1,
            }}
          >
            Segna come lette
          </button>
          <button
            onClick={() => setSelected(new Set())}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}
          >
            Annulla
          </button>
        </div>
      )}

      {/* Table */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 10,
          overflow: 'hidden',
          marginBottom: 20,
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr auto',
            alignItems: 'center',
            padding: '10px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <input
            type="checkbox"
            checked={notifications.length > 0 && selected.size === notifications.length}
            onChange={toggleAll}
            style={{ cursor: 'pointer', accentColor: '#6366f1' }}
          />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Notifica
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Data
          </span>
        </div>

        {isLoading && (
          <div style={{ padding: '4px 0' }}>
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        )}

        {isError && !isLoading && (
          <div className="empty-state-box">
            <svg viewBox="0 0 48 48" width="40" height="40" fill="none"><circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2"/><path d="M24 14v12M24 34h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
            <p>Errore nel caricamento.<br />Riprova.</p>
          </div>
        )}

        {!isLoading && !isError && notifications.length === 0 && (
          <div className="empty-state-box">
            <svg viewBox="0 0 48 48" width="44" height="44" fill="none"><path d="M24 6a12 12 0 00-12 12v6l-3 5h30l-3-5v-6A12 12 0 0024 6z" stroke="currentColor" strokeWidth="2"/><path d="M21 39a3 3 0 006 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            <p>{unreadOnly ? 'Nessuna notifica non letta.' : 'Nessuna notifica.'}</p>
          </div>
        )}

        {notifications.map((notif) => {
          const isUnread = !notif.readAt;
          const isSelected = selected.has(notif.id);
          return (
            <div
              key={notif.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr auto',
                alignItems: 'center',
                padding: '12px 14px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: isSelected ? 'rgba(99,102,241,0.08)' : isUnread ? 'rgba(99,102,241,0.04)' : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? 'rgba(99,102,241,0.08)' : isUnread ? 'rgba(99,102,241,0.04)' : 'transparent'; }}
            >
              {/* Checkbox */}
              <div onClick={(e) => { e.stopPropagation(); toggleSelect(notif.id); }}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(notif.id)}
                  style={{ cursor: 'pointer', accentColor: '#6366f1' }}
                />
              </div>

              {/* Content */}
              <div onClick={() => handleRowClick(notif)} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: isUnread ? '#6366f1' : 'transparent',
                    flexShrink: 0,
                    marginTop: 6,
                  }}
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: isUnread ? 600 : 400, color: 'var(--text-primary)', marginBottom: 2 }}>
                    {notif.title}
                  </div>
                  {notif.body && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {notif.body}
                    </div>
                  )}
                </div>
              </div>

              {/* Date */}
              <div
                onClick={() => handleRowClick(notif)}
                style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', paddingLeft: 12 }}
              >
                {relativeTime(notif.createdAt)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '5px 14px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent',
              color: page === 1 ? 'var(--text-muted)' : 'var(--text-secondary)',
              cursor: page === 1 ? 'default' : 'pointer',
              fontSize: 13,
            }}
          >
            ← Precedente
          </button>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {page} / {meta.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={page === meta.totalPages}
            style={{
              padding: '5px 14px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent',
              color: page === meta.totalPages ? 'var(--text-muted)' : 'var(--text-secondary)',
              cursor: page === meta.totalPages ? 'default' : 'pointer',
              fontSize: 13,
            }}
          >
            Successiva →
          </button>
        </div>
      )}
    </div>
  );
}
