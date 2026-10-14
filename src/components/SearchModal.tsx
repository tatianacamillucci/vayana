// src/components/SearchModal.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchTasks, useSearchProjects, useSearchUsers } from '@/lib/hooks/useSearch';
import type { Task } from '@/lib/hooks/useTasks';
import type { Project } from '@/lib/hooks/useProjects';
import type { UserSearchResult } from '@/lib/hooks/useUsers';

type SearchTab = 'tasks' | 'projects' | 'people';

export interface RecentItem {
  id: string;
  type: 'task' | 'project';
  name: string;
  path: string;
  color?: string;
}

const STORAGE_KEY = 'vayana-recent-items';

function getRecentItems(): RecentItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function addRecentSearchItem(item: RecentItem) {
  const items = getRecentItems().filter((r) => r.id !== item.id);
  items.unshift(item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 8)));
}

const TABS: { id: SearchTab; label: string }[] = [
  { id: 'tasks', label: 'Attività' },
  { id: 'projects', label: 'Progetti' },
  { id: 'people', label: 'Persone' },
];

const SAVED_SEARCHES = [
  {
    id: 'created',
    label: 'Attività create',
    path: '/tasks?createdByMe=true',
    icon: (
      <svg viewBox="0 0 16 16" width="13" height="13" fill="none">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'assigned-others',
    label: 'Attività assegnate ad altri',
    path: '/tasks?assignedToOthers=true',
    icon: (
      <svg viewBox="0 0 16 16" width="13" height="13" fill="none">
        <path d="M2 8h12M10 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'completed',
    label: 'Attività completate di recente',
    path: '/tasks?status=DONE',
    icon: (
      <svg viewBox="0 0 16 16" width="13" height="13" fill="none">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2" />
        <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'cancelled',
    label: 'Eliminate',
    path: '/tasks?status=CANCELLED',
    icon: (
      <svg viewBox="0 0 16 16" width="13" height="13" fill="none">
        <rect x="2.5" y="5" width="11" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 5V3.5A1.5 1.5 0 016.5 2h3A1.5 1.5 0 0111 3.5V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

const STATUS_LABELS: Record<string, string> = {
  TODO: 'Da fare',
  IN_PROGRESS: 'In corso',
  IN_REVIEW: 'In revisione',
  DONE: 'Completata',
  CANCELLED: 'Eliminata',
};

const STATUS_COLORS: Record<string, string> = {
  TODO: '#666',
  IN_PROGRESS: '#3b82f6',
  IN_REVIEW: '#a855f7',
  DONE: '#22c55e',
  CANCELLED: '#ef4444',
};

function TaskIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
      <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProjectDot({ color }: { color?: string | null }) {
  return (
    <span
      style={{
        width: 14,
        height: 14,
        borderRadius: 3,
        background: color ?? '#6366f1',
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  );
}

function PersonAvatar({ user }: { user: UserSearchResult }) {
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
  return (
    <span
      style={{
        width: 26,
        height: 26,
        borderRadius: '50%',
        background: '#6366f1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 600,
        color: '#fff',
        flexShrink: 0,
      }}
    >
      {initials}
    </span>
  );
}

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
  query: string;
  onQueryChange: (value: string) => void;
}

export function SearchModal({ open, onClose, anchorRef, query, onQueryChange }: SearchModalProps) {
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('tasks');
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({
    top: 72,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'clamp(400px, 52vw, 640px)',
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setDebouncedQuery(query.trim());
      setActiveTab('tasks');
      setRecentItems(getRecentItems());
    }
  }, [open, query]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const hasQuery = debouncedQuery.length >= 2;

  const { data: tasks = [], isFetching: loadingTasks } = useSearchTasks(debouncedQuery, activeTab === 'tasks');
  const { data: projects = [], isFetching: loadingProjects } = useSearchProjects(debouncedQuery, activeTab === 'projects');
  const { data: people = [], isFetching: loadingPeople } = useSearchUsers(debouncedQuery, activeTab === 'people');

  const handleNavigate = useCallback(
    (path: string, recent?: RecentItem) => {
      if (recent) addRecentSearchItem(recent);
      onClose();
      navigate(path);
    },
    [navigate, onClose],
  );

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [anchorRef, onClose, open]);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const anchor = anchorRef?.current;
      if (!anchor) {
        setDropdownStyle({
          top: 72,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'clamp(400px, 52vw, 640px)',
        });
        return;
      }
      const rect = anchor.getBoundingClientRect();
      const width = rect.width;
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
      setDropdownStyle({
        top: rect.bottom + 8,
        left,
        width,
        transform: 'none',
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [anchorRef, open]);

  if (!open) return null;

  const isLoading = activeTab === 'tasks' ? loadingTasks : activeTab === 'projects' ? loadingProjects : loadingPeople;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          ...dropdownStyle,
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          maxHeight: '72vh',
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: 'auto',
        }}
      >
        {/* Search input row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.7" />
            <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          <div style={{ flex: 1, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {query ? `Cerca: ${query}` : 'Cerca'}
          </div>
          {query && (
            <button
              onClick={() => onQueryChange('')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 2,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              background: 'var(--bg-tertiary)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 5,
              padding: '2px 6px',
              flexShrink: 0,
            }}
          >
            Esc
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              marginLeft: 6,
              background: 'var(--bg-tertiary)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 5,
              width: 24,
              height: 24,
              color: 'var(--text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 14,
              lineHeight: 1,
            }}
            aria-label="Chiudi ricerca"
            title="Chiudi"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            padding: '10px 14px 8px',
            borderBottom: hasQuery ? '1px solid rgba(255,255,255,0.07)' : 'none',
            flexWrap: 'wrap',
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '4px 12px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 500,
                border: activeTab === tab.id ? '1.5px solid rgba(255,255,255,0.3)' : '1.5px solid rgba(255,255,255,0.08)',
                background: activeTab === tab.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {!hasQuery ? (
            <>
              {/* Recenti */}
              {recentItems.length > 0 && (
                <section style={{ padding: '12px 14px 4px' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Recenti
                  </p>
                  {recentItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.path)}
                      className="search-row" style={rowStyle}
                    >
                      {item.type === 'project' ? (
                        <ProjectDot color={item.color} />
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>
                          <TaskIcon />
                        </span>
                      )}
                      <span style={{ flex: 1, textAlign: 'left', fontSize: 14, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </span>
                    </button>
                  ))}
                </section>
              )}

              {/* Ricerche salvate */}
              <section style={{ padding: '12px 14px 14px' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Ricerche salvate
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {SAVED_SEARCHES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleNavigate(s.path)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '5px 12px',
                        borderRadius: 999,
                        border: '1.5px solid rgba(255,255,255,0.1)',
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)',
                        fontSize: 13,
                        cursor: 'pointer',
                        transition: 'background 0.15s, color 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-tertiary)';
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                      }}
                    >
                      {s.icon}
                      {s.label}
                    </button>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <section style={{ padding: '8px 0 8px' }}>
              {isLoading && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 16px' }}>Ricerca in corso...</p>
              )}

              {/* Tasks results */}
              {activeTab === 'tasks' && !loadingTasks && (
                <>
                  {tasks.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 16px' }}>Nessuna attività trovata</p>
                  ) : (
                    tasks.map((task: Task) => {
                      const taskPath = task.projectId ? `/projects/${task.projectId}` : '/tasks';
                      return (
                        <button
                          key={task.id}
                          onClick={() =>
                            handleNavigate(taskPath, {
                              id: task.id,
                              type: 'task',
                              name: task.title,
                              path: taskPath,
                            })
                          }
                          className="search-row" style={rowStyle}
                        >
                        <span style={{ color: STATUS_COLORS[task.status] ?? '#666', flexShrink: 0 }}>
                          <TaskIcon />
                        </span>
                        <span style={{ flex: 1, textAlign: 'left', fontSize: 14, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.title}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                          {STATUS_LABELS[task.status] ?? task.status}
                        </span>
                        </button>
                      );
                    })
                  )}
                </>
              )}

              {/* Projects results */}
              {activeTab === 'projects' && !loadingProjects && (
                <>
                  {projects.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 16px' }}>Nessun progetto trovato</p>
                  ) : (
                    projects.map((project: Project) => (
                      <button
                        key={project.id}
                        onClick={() =>
                          handleNavigate(`/projects/${project.id}`, {
                            id: project.id,
                            type: 'project',
                            name: project.name,
                            path: `/projects/${project.id}`,
                            color: project.color ?? undefined,
                          })
                        }
                        className="search-row" style={rowStyle}
                      >
                        <ProjectDot color={project.color} />
                        <span style={{ flex: 1, textAlign: 'left', fontSize: 14, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {project.name}
                        </span>
                        {project.description && (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {project.description}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </>
              )}

              {/* People results */}
              {activeTab === 'people' && !loadingPeople && (
                <>
                  {people.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 16px' }}>Nessuna persona trovata</p>
                  ) : (
                    people.map((person: UserSearchResult) => (
                      <button
                        key={person.id}
                        onClick={() => handleNavigate('/teams')}
                        className="search-row" style={rowStyle}
                      >
                        <PersonAvatar user={person} />
                        <span style={{ flex: 1, textAlign: 'left' }}>
                          <span style={{ display: 'block', fontSize: 14, color: 'var(--text-primary)' }}>
                            {person.firstName} {person.lastName}
                          </span>
                          <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)' }}>
                            {person.email}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

const rowStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 16px',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  borderRadius: 0,
  transition: 'background 0.1s',
  color: 'inherit',
};
