import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSearchTasks } from '@/lib/hooks/useSearchTasks';
import { useProjects } from '@/lib/hooks/useProjects';
import { useUserSearch } from '@/lib/hooks/useUsers';
import type { TaskStatus, TaskPriority } from '@/lib/hooks/useTasks';
import { SkeletonTaskRows } from '@/components/Skeleton';

const STATUSES: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'TODO', label: 'Da fare', color: '#6b7280' },
  { value: 'IN_PROGRESS', label: 'In corso', color: '#3b82f6' },
  { value: 'IN_REVIEW', label: 'In revisione', color: '#a855f7' },
  { value: 'DONE', label: 'Completata', color: '#22c55e' },
  { value: 'CANCELLED', label: 'Eliminata', color: '#ef4444' },
];

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'LOW', label: 'Bassa', color: '#6b7280' },
  { value: 'MEDIUM', label: 'Media', color: '#f59e0b' },
  { value: 'HIGH', label: 'Alta', color: '#f97316' },
  { value: 'URGENT', label: 'Urgente', color: '#ef4444' },
];

export function TasksPage(): React.ReactElement {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // --- URL-driven filter state ---
  const searchText = searchParams.get('search') ?? '';
  const activeStatuses = useMemo(
    () => (searchParams.get('statuses') ?? '').split(',').filter(Boolean) as TaskStatus[],
    [searchParams],
  );
  const activePriorities = useMemo(
    () => (searchParams.get('priorities') ?? '').split(',').filter(Boolean) as TaskPriority[],
    [searchParams],
  );
  const dueFrom = searchParams.get('dueFrom') ?? '';
  const dueTo = searchParams.get('dueTo') ?? '';
  const assigneeId = searchParams.get('assigneeId') ?? '';

  // Local search text with debounce → URL
  const [localSearch, setLocalSearch] = useState(searchText);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (localSearch) next.set('search', localSearch);
          else next.delete('search');
          return next;
        },
        { replace: true },
      );
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [localSearch, setSearchParams]);

  // Assignee dropdown state
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const assigneeRef = useRef<HTMLDivElement>(null);
  const { data: userResults = [] } = useUserSearch(assigneeQuery);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (assigneeRef.current && !assigneeRef.current.contains(e.target as Node)) {
        setAssigneeOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Data fetching
  const { data: tasks = [], isFetching, isLoading, isError } = useSearchTasks({
    search: searchText || undefined,
    statuses: activeStatuses.length ? activeStatuses : undefined,
    priorities: activePriorities.length ? activePriorities : undefined,
    dueFrom: dueFrom || undefined,
    dueTo: dueTo || undefined,
    assigneeId: assigneeId || undefined,
  });
  const { data: projects = [] } = useProjects();

  const projectMap = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p])),
    [projects],
  );

  // Helpers
  const setParam = useCallback(
    (key: string, value: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const toggleStatus = (status: TaskStatus) => {
    const next = activeStatuses.includes(status)
      ? activeStatuses.filter((s) => s !== status)
      : [...activeStatuses, status];
    setParam('statuses', next.join(',') || null);
  };

  const togglePriority = (priority: TaskPriority) => {
    const next = activePriorities.includes(priority)
      ? activePriorities.filter((p) => p !== priority)
      : [...activePriorities, priority];
    setParam('priorities', next.join(',') || null);
  };

  const clearAll = () => {
    setLocalSearch('');
    setAssigneeName('');
    setAssigneeQuery('');
    setSearchParams({}, { replace: true });
  };

  const hasFilters =
    searchText || activeStatuses.length || activePriorities.length || dueFrom || dueTo || assigneeId;

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Flusso di lavoro</h1>
          <p className="text-secondary">Cerca e filtra i task dell'organizzazione.</p>
        </div>
      </header>

      {/* Filter panel */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 10,
          padding: '14px 16px',
          marginBottom: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--bg-tertiary)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 7,
            padding: '7px 11px',
          }}
        >
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.7" />
            <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Cerca per titolo..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 14,
            }}
          />
          {localSearch && (
            <button
              onClick={() => setLocalSearch('')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, display: 'flex' }}
            >
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Status chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4, minWidth: 48 }}>
            Stato
          </span>
          {STATUSES.map((s) => {
            const active = activeStatuses.includes(s.value);
            return (
              <button
                key={s.value}
                onClick={() => toggleStatus(s.value)}
                style={{
                  padding: '3px 11px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 500,
                  border: active ? `1.5px solid ${s.color}` : '1.5px solid rgba(255,255,255,0.1)',
                  background: active ? `${s.color}22` : 'transparent',
                  color: active ? s.color : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Priority chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4, minWidth: 48 }}>
            Priorità
          </span>
          {PRIORITIES.map((p) => {
            const active = activePriorities.includes(p.value);
            return (
              <button
                key={p.value}
                onClick={() => togglePriority(p.value)}
                style={{
                  padding: '3px 11px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 500,
                  border: active ? `1.5px solid ${p.color}` : '1.5px solid rgba(255,255,255,0.1)',
                  background: active ? `${p.color}22` : 'transparent',
                  color: active ? p.color : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Date range + Assignee + Reset */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          {/* Due from */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Dal</span>
            <input
              type="date"
              value={dueFrom}
              onChange={(e) => setParam('dueFrom', e.target.value || null)}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                padding: '4px 8px',
                fontSize: 12,
                outline: 'none',
              }}
            />
          </div>

          {/* Due to */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Al</span>
            <input
              type="date"
              value={dueTo}
              onChange={(e) => setParam('dueTo', e.target.value || null)}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                padding: '4px 8px',
                fontSize: 12,
                outline: 'none',
              }}
            />
          </div>

          {/* Assignee */}
          <div ref={assigneeRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Assegnatario</span>
            {assigneeId ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  background: 'rgba(99,102,241,0.15)',
                  border: '1px solid rgba(99,102,241,0.4)',
                  borderRadius: 6,
                  padding: '4px 8px',
                  fontSize: 12,
                  color: '#818cf8',
                }}
              >
                {assigneeName || 'Selezionato'}
                <button
                  onClick={() => {
                    setParam('assigneeId', null);
                    setAssigneeName('');
                    setAssigneeQuery('');
                  }}
                  style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', padding: 0, display: 'flex', opacity: 0.7 }}
                >
                  <svg viewBox="0 0 16 16" width="11" height="11" fill="none">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ) : (
              <input
                type="text"
                value={assigneeQuery}
                onChange={(e) => { setAssigneeQuery(e.target.value); setAssigneeOpen(true); }}
                onFocus={() => setAssigneeOpen(true)}
                placeholder="Cerca utente..."
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  padding: '4px 8px',
                  fontSize: 12,
                  outline: 'none',
                  width: 140,
                }}
              />
            )}
            {assigneeOpen && !assigneeId && assigneeQuery.length >= 2 && userResults.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  zIndex: 50,
                  background: 'var(--bg-tertiary)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  minWidth: 200,
                }}
              >
                {userResults.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setParam('assigneeId', u.id);
                      setAssigneeName(`${u.firstName} ${u.lastName}`);
                      setAssigneeOpen(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: '#6366f1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#fff',
                        flexShrink: 0,
                      }}
                    >
                      {u.firstName[0]}{u.lastName[0]}
                    </div>
                    <span>{u.firstName} {u.lastName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {hasFilters && (
            <button
              onClick={clearAll}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                marginLeft: 'auto',
              }}
            >
              Reset filtri
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <div style={{ marginBottom: 10, fontSize: 13, color: 'var(--text-muted)' }}>
        {isFetching && !isLoading ? 'Aggiornamento...' : !isLoading ? `${tasks.length} task` : ''}
      </div>

      {/* Loading skeleton */}
      {isLoading && <SkeletonTaskRows count={6} />}

      {/* Error */}
      {isError && !isLoading && (
        <div className="empty-state-box">
          <svg viewBox="0 0 48 48" width="48" height="48" fill="none"><circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2"/><path d="M24 14v12M24 34h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
          <p>Errore nel caricamento dei task.<br />Controlla la connessione e riprova.</p>
        </div>
      )}

      {/* Task table */}
      {!isLoading && !isError && <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {tasks.length === 0 ? (
          <div className="empty-state-box">
            <svg viewBox="0 0 48 48" width="48" height="48" fill="none"><rect x="8" y="6" width="32" height="36" rx="3" stroke="currentColor" strokeWidth="2"/><path d="M16 18h16M16 26h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            <p>Nessun task trovato.<br />Prova a modificare i filtri.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Titolo', 'Stato', 'Priorità', 'Scadenza', 'Progetto'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 14px',
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const statusDef = STATUSES.find((s) => s.value === task.status);
                const priorityDef = PRIORITIES.find((p) => p.value === task.priority);
                const project = task.projectId ? projectMap[task.projectId] : undefined;
                const dueDate = task.dueDate
                  ? new Date(task.dueDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
                  : '—';
                const isOverdue =
                  task.dueDate &&
                  new Date(task.dueDate) < new Date() &&
                  task.status !== 'DONE' &&
                  task.status !== 'CANCELLED';

                return (
                  <tr
                    key={task.id}
                    onClick={() => task.projectId && navigate(`/projects/${task.projectId}`)}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      cursor: task.projectId ? 'pointer' : 'default',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '10px 14px', fontSize: 14, color: 'var(--text-primary)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: statusDef?.color ?? '#666',
                            flexShrink: 0,
                          }}
                        />
                        {task.title}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          padding: '2px 8px',
                          borderRadius: 999,
                          border: `1px solid ${statusDef?.color ?? '#666'}44`,
                          color: statusDef?.color ?? '#666',
                          background: `${statusDef?.color ?? '#666'}18`,
                        }}
                      >
                        {statusDef?.label ?? task.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      {priorityDef && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            padding: '2px 8px',
                            borderRadius: 999,
                            border: `1px solid ${priorityDef.color}44`,
                            color: priorityDef.color,
                            background: `${priorityDef.color}18`,
                          }}
                        >
                          {priorityDef.label}
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: '10px 14px',
                        fontSize: 13,
                        color: isOverdue ? '#ef4444' : 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {dueDate}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {project ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 2,
                              background: project.color ?? '#6366f1',
                              flexShrink: 0,
                            }}
                          />
                          {project.name}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>}
    </div>
  );
}
