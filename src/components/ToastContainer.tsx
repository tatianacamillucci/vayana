// src/components/ToastContainer.tsx
import { useEffect, useState } from 'react';
import { subscribe, _remove, type ToastItem } from '@/lib/toast';

const ICON: Record<string, string> = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
};

const COLOR: Record<string, string> = {
  success: '#22c55e',
  error:   '#ef4444',
  info:    '#6366f1',
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => subscribe(setToasts), []);

  if (!toasts.length) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-item"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            background: 'var(--bg-tertiary)',
            border: `1px solid ${COLOR[t.type]}55`,
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
            minWidth: 240,
            maxWidth: 360,
            pointerEvents: 'auto',
            animation: 'toast-in 0.2s ease',
          }}
        >
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: `${COLOR[t.type]}22`,
              border: `1.5px solid ${COLOR[t.type]}`,
              color: COLOR[t.type],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {ICON[t.type]}
          </span>
          <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>
            {t.message}
          </span>
          <button
            onClick={() => _remove(t.id)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
