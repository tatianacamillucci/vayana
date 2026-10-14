// src/components/Dashboard.tsx
// Dual-mode: backend uses TanStack Query hooks; sql.js fallback lazy-loaded.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Skeleton } from '@/components/Skeleton';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMyTasks, useUpdateTask, useCreateTask, Task, TaskStatus } from '@/lib/hooks/useTasks';
import { useProjects, Project } from '@/lib/hooks/useProjects';
import { useSocket } from '@/lib/hooks/useSocket';

const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';

// Lazy-load the sql.js fallback to keep bundle clean
const DashboardFallback = React.lazy(() =>
  import('./DashboardFallback').then((m) => ({ default: m.Dashboard }))
);

// ─── Types ────────────────────────────────────────────────────────────────────

type HomeTab = 'in_progress' | 'overdue' | 'done';
type HomeColorPreset = 'menu' | 'violet' | 'berry' | 'ocean' | 'forest';
type HomeRange = 'week' | 'month';

const HOME_PRESET_STORAGE_KEY = 'vayana_home_color_preset_v1';

const HOME_COLOR_PRESETS: Array<{ id: HomeColorPreset; swatch: string }> = [
  { id: 'menu', swatch: '#555b66' },
  { id: 'violet', swatch: '#7453a8' },
  { id: 'berry', swatch: '#8f476f' },
  { id: 'ocean', swatch: '#37669a' },
  { id: 'forest', swatch: '#3f756f' },
];

interface DashboardProps {
  onOpenProject?: (projectId: string) => void;
}

// ─── Backend Dashboard ────────────────────────────────────────────────────────

function DashboardBackend({ onOpenProject }: DashboardProps): React.ReactElement {
  const navigate = useNavigate();
  const { user } = useAuth();

  const customizeRef = useRef<HTMLDivElement | null>(null);
  const rangeRef = useRef<HTMLDivElement | null>(null);
  const quickInputRef = useRef<HTMLInputElement | null>(null);
  const calendarRef = useRef<HTMLDivElement | null>(null);

  const [activeTab, setActiveTab] = useState<HomeTab>('in_progress');
  const [homeColorPreset, setHomeColorPreset] = useState<HomeColorPreset>(() => {
    try {
      const stored = localStorage.getItem(HOME_PRESET_STORAGE_KEY);
      if (stored && HOME_COLOR_PRESETS.some((p) => p.id === stored)) return stored as HomeColorPreset;
    } catch { /* ignore */ }
    return 'menu';
  });
  const [showCustomize, setShowCustomize] = useState(false);
  const [isQuickCreating, setIsQuickCreating] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [homeRange, setHomeRange] = useState<HomeRange>('week');
  const [showRangeMenu, setShowRangeMenu] = useState(false);
  const [openCalendarTaskId, setOpenCalendarTaskId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  // expandedTaskTree reserved for future subtask expansion
  const [_expandedTaskTree, _setExpandedTaskTree] = useState<Record<string, boolean>>({});
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [quickSaveError, setQuickSaveError] = useState<string | null>(null);

  // Queries
  // useMyTasks = GET /tasks/search/advanced?assignedToMe=true (cross-project, no projectId required)
  const { data: tasks = [], isLoading: tasksLoading } = useMyTasks();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const updateTaskMutation = useUpdateTask();
  const createTaskMutation = useCreateTask();

  const loading = tasksLoading || projectsLoading;

  // Real-time: connect to /tasks namespace, invalidate cache on any task event
  useSocket();

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const projectById = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  // Calcola inizio/fine del periodo selezionato (settimana o mese corrente, come Asana)
  const { periodStart, periodEnd, periodLabel } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (homeRange === 'week') {
      // Settimana corrente: Lun–Dom
      const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Lun, 6 = Dom
      const start = new Date(now);
      start.setDate(start.getDate() - dayOfWeek);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      const fmt = (d: Date) => d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
      return { periodStart: start, periodEnd: end, periodLabel: `${fmt(start)} – ${fmt(end)}` };
    } else {
      // Mese corrente
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      const label = start.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
      return { periodStart: start, periodEnd: end, periodLabel: label.charAt(0).toUpperCase() + label.slice(1) };
    }
  }, [homeRange]);

  const taskBuckets = useMemo(() => {
    const isDone = (t: Task) => t.status === 'DONE' || t.status === 'CANCELLED';

    // In programma: task senza scadenza OPPURE con scadenza nel periodo (oggi → fine periodo)
    const inProgress = tasks.filter((t) => {
      if (isDone(t)) return false;
      if (!t.dueDate) return true;
      const due = new Date(t.dueDate);
      return due >= today && due <= periodEnd;
    });

    // Scadute: task con scadenza passata (prima di oggi), indipendentemente dal periodo
    const overdue = tasks.filter((t) => {
      if (isDone(t)) return false;
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < today;
    });

    // Completate nel periodo selezionato
    const done = tasks.filter((t) => {
      if (!isDone(t)) return false;
      return new Date(t.updatedAt) >= periodStart;
    });

    const byDue = (a: Task, b: Task) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    };

    return {
      inProgress: [...inProgress].sort(byDue),
      overdue: [...overdue].sort(byDue),
      done: [...done].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    };
  }, [tasks, today, periodStart, periodEnd]);

  const visibleTasks =
    activeTab === 'in_progress' ? taskBuckets.inProgress
    : activeTab === 'overdue' ? taskBuckets.overdue
    : taskBuckets.done;

  const completedCount = useMemo(
    () => tasks.filter((t) => t.status === 'DONE' && new Date(t.updatedAt) >= periodStart).length,
    [periodStart, tasks]
  );

  // ── Display helpers ──────────────────────────────────────────────────────────

  const displayName = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '';

  const getGreetingName = () => {
    if (!displayName) return 'Utente';
    return displayName.split(' ').filter(Boolean)[0] || displayName;
  };

  const getAvatarLabel = () => {
    if (!displayName) return 'U';
    const parts = displayName.split(' ').filter(Boolean).slice(0, 2);
    return parts.map((p) => p[0].toUpperCase()).join('') || 'U';
  };

  const formatHeaderDate = () => {
    const value = new Intl.DateTimeFormat('it-IT', {
      weekday: 'long', day: 'numeric', month: 'long',
    }).format(new Date());
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const getDueLabel = (dueDate: string | null | undefined): string => {
    if (!dueDate) return '';
    return new Date(dueDate).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' });
  };

  const getMonthLabel = (date: Date): string => {
    const text = date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const getMonthDays = (date: Date): Array<Date | null> => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const leading = (first.getDay() + 6) % 7;
    const days: Array<Date | null> = [];
    for (let i = 0; i < leading; i += 1) days.push(null);
    for (let day = 1; day <= last.getDate(); day += 1) days.push(new Date(year, month, day));
    return days;
  };

  const isSameDay = (a: Date, b: Date): boolean =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const setAndPersistHomePreset = (preset: HomeColorPreset) => {
    setHomeColorPreset(preset);
    localStorage.setItem(HOME_PRESET_STORAGE_KEY, preset);
    setShowCustomize(false);
  };

  const rangeLabel = homeRange === 'week' ? 'La mia settimana' : 'Il mio mese';

  // Chiudi i menu range/customize quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rangeRef.current && !rangeRef.current.contains(e.target as Node)) setShowRangeMenu(false);
      if (customizeRef.current && !customizeRef.current.contains(e.target as Node)) setShowCustomize(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleToggleDone = (task: Task) => {
    const nextStatus: TaskStatus = (task.status === 'DONE' || task.status === 'CANCELLED') ? 'IN_PROGRESS' : 'DONE';
    updateTaskMutation.mutate({ id: task.id, dto: { status: nextStatus } });
  };

  const handleSetDueDate = (task: Task, value: string) => {
    updateTaskMutation.mutate({
      id: task.id,
      dto: { dueDate: value ? new Date(`${value}T00:00:00`).toISOString() : null },
    });
    setOpenCalendarTaskId(null);
  };

  const openTaskCalendar = (task: Task) => {
    const base = task.dueDate ? new Date(task.dueDate) : new Date(today);
    setCalendarMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    setOpenCalendarTaskId(task.id);
  };

  const handleQuickCreate = () => {
    const title = quickTitle.trim();
    if (!title) return;
    setQuickSaveError(null);
    createTaskMutation.mutate(
      { title, status: 'TODO', priority: 'MEDIUM' },
      {
        onSuccess: () => {
          setQuickTitle('');
          setIsQuickCreating(false);
          setQuickSaveError(null);
        },
        onError: () => {
          setQuickSaveError('Salvataggio non riuscito. Riprova.');
        },
      }
    );
  };

  const handleOpenProject = (projectId: string) => {
    if (onOpenProject) {
      onOpenProject(projectId);
    } else {
      navigate(`/projects/${projectId}`);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="page-container home-shell home-asana-like">
        <div className="home-topbar" style={{ marginBottom: 32 }}>
          <div>
            <Skeleton width={120} height={12} style={{ marginBottom: 8 }} />
            <Skeleton width={240} height={28} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {[140, 100, 120].map((w, i) => <Skeleton key={i} width={w} height={36} borderRadius={999} />)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0' }}>
              <Skeleton width={14} height={14} borderRadius={999} />
              <Skeleton width={`${40 + Math.random() * 30}%`} height={14} />
              <Skeleton width={60} height={14} style={{ marginLeft: 'auto' }} />
              <Skeleton width={50} height={14} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) ?? null : null;

  return (
    <div className={`page-container home-shell home-asana-like home-tone-${homeColorPreset}`}>
      <div className="home-topbar">
        <div>
          <div className="home-date">{formatHeaderDate()}</div>
          <h1>Buongiorno, {getGreetingName()}</h1>
        </div>
        <div className="home-top-controls">
          <div className="home-top-pills">
            <span className="home-range-wrap" ref={rangeRef}>
              <button className="home-range-btn" onClick={() => setShowRangeMenu((o) => !o)}>
                {rangeLabel} <span className="home-range-caret">▾</span>
              </button>
              {showRangeMenu && (
                <div className="home-range-menu">
                  <button
                    className={homeRange === 'week' ? 'active' : ''}
                    onClick={() => { setHomeRange('week'); setShowRangeMenu(false); }}
                  >
                    <span className="home-range-check">{homeRange === 'week' ? '✓' : ''}</span>
                    <span className="home-range-option-text">
                      <span className="home-range-option-label">La mia settimana</span>
                    </span>
                  </button>
                  <button
                    className={homeRange === 'month' ? 'active' : ''}
                    onClick={() => { setHomeRange('month'); setShowRangeMenu(false); }}
                  >
                    <span className="home-range-check">{homeRange === 'month' ? '✓' : ''}</span>
                    <span className="home-range-option-text">
                      <span className="home-range-option-label">Il mio mese</span>
                    </span>
                  </button>
                </div>
              )}
            </span>
            <span title={periodLabel}>
              {completedCount > 0
                ? `✓ ${completedCount} attività completate`
                : `✓ 0 attività completate`}
            </span>
          </div>
          <div className="home-customize-wrap" ref={customizeRef}>
            <button className="home-customize-btn" onClick={() => setShowCustomize((o) => !o)}>
              Personalizza
            </button>
            {showCustomize && (
              <div className="home-customize-panel">
                {HOME_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    className={`home-preset-btn ${homeColorPreset === preset.id ? 'active' : ''}`}
                    onClick={() => setAndPersistHomePreset(preset.id)}
                    aria-label={`Tema ${preset.id}`}
                    title={`Tema ${preset.id}`}
                  >
                    <span className="home-preset-dot" style={{ backgroundColor: preset.swatch }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Welcome banner — shown only when user has no projects yet */}
      {projects.length === 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '18px 22px',
          margin: '0 auto 20px',
          width: '100%',
          maxWidth: 980,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.10) 100%)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 12,
        }}>
          <svg viewBox="0 0 48 48" width="36" height="36" fill="none" style={{ flexShrink: 0, color: '#6366f1' }}>
            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2"/>
            <path d="M24 14v10l6 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
              Benvenuto in Vayana!
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Crea il tuo primo progetto per iniziare a organizzare il lavoro del team.
            </div>
          </div>
          <button
            onClick={() => navigate('/projects')}
            style={{
              padding: '8px 18px',
              background: '#6366f1',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Crea progetto
          </button>
        </div>
      )}

      <section className="home-main-card">
        <div className="home-main-head">
          <div className="home-avatar">{getAvatarLabel()}</div>
          <div className="home-main-title-wrap">
            <h2>Le mie attività <span className="home-lock">🔒</span></h2>
            <div className="home-period-label">{periodLabel}</div>
            <div className="home-tabs">
              <button
                className={activeTab === 'in_progress' ? 'active' : ''}
                onClick={() => setActiveTab('in_progress')}
              >
                In programma
              </button>
              <button
                className={activeTab === 'overdue' ? 'active' : ''}
                onClick={() => setActiveTab('overdue')}
              >
                ({taskBuckets.overdue.length}) scadute
              </button>
              <button
                className={activeTab === 'done' ? 'active' : ''}
                onClick={() => setActiveTab('done')}
              >
                Completate
              </button>
            </div>
          </div>
          <button className="home-menu-btn">•••</button>
        </div>

        <div className="home-task-list">
          {isQuickCreating ? (
            <div className="home-create-task-row home-create-inline">
              <span>+</span>
              <input
                ref={quickInputRef}
                value={quickTitle}
                onChange={(e) => { setQuickTitle(e.target.value); setQuickSaveError(null); }}
                placeholder="Scrivi il nome dell'attività"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleQuickCreate();
                  if (e.key === 'Escape') { setIsQuickCreating(false); setQuickTitle(''); setQuickSaveError(null); }
                }}
                onBlur={() => { if (!quickTitle.trim()) { setIsQuickCreating(false); setQuickSaveError(null); } }}
              />
            </div>
          ) : (
            <button className="home-create-task-row" onClick={() => setIsQuickCreating(true)}>
              + Crea attività
            </button>
          )}
          {quickSaveError && (
            <div style={{ fontSize: 13, color: 'var(--accent-red)', padding: '4px 8px' }}>
              {quickSaveError}
            </div>
          )}

          {visibleTasks.length === 0 ? (
            <p className="text-muted">Nessuna attività in questa sezione.</p>
          ) : (
            visibleTasks.slice(0, 12).map((task) => {
              const project = task.projectId ? projectById.get(task.projectId) : undefined;
              const projectName = project?.name ?? '';
              const dueLabel = getDueLabel(task.dueDate);
              const isDone = task.status === 'DONE' || task.status === 'CANCELLED';

              return (
                <div key={task.id} className="home-task-tree-group">
                  <div className="home-task-row" onClick={() => setActiveTaskId(task.id)}>
                    <div className="home-task-main">
                      <button
                        className={`home-task-check-btn ${isDone ? 'done' : ''}`}
                        onClick={(e) => { e.stopPropagation(); handleToggleDone(task); }}
                        title={isDone ? 'Segna non completata' : 'Segna completata'}
                      >
                        {isDone ? '✓' : ''}
                      </button>
                      <span className="home-task-title">{task.title}</span>
                    </div>
                    <div className="home-task-meta" onClick={(e) => e.stopPropagation()}>
                      {projectName && task.projectId ? (
                        <button
                          type="button"
                          className="home-row-project home-row-project-btn"
                          onClick={(e) => { e.stopPropagation(); handleOpenProject(task.projectId); }}
                          title="Apri dettaglio progetto"
                        >
                          {projectName}
                        </button>
                      ) : (
                        <span className="home-row-project home-row-project-empty" aria-hidden />
                      )}
                      {dueLabel ? (
                        <span className="home-row-due">{dueLabel}</span>
                      ) : (
                        <span className="home-row-due home-row-due-empty" aria-hidden />
                      )}
                      <div className="home-calendar-wrap" ref={openCalendarTaskId === task.id ? calendarRef : undefined}>
                        <button
                          className="home-calendar-btn"
                          title="Imposta scadenza"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openCalendarTaskId === task.id) { setOpenCalendarTaskId(null); return; }
                            openTaskCalendar(task);
                          }}
                        >
                          <span className="home-calendar-glyph" aria-hidden />
                        </button>
                        {openCalendarTaskId === task.id && (
                          <div className="home-calendar-popover" onClick={(e) => e.stopPropagation()}>
                            <div className="home-calendar-head">
                              <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>‹</button>
                              <span>{getMonthLabel(calendarMonth)}</span>
                              <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>›</button>
                            </div>
                            <div className="home-calendar-grid home-calendar-weekdays">
                              {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d, i) => (
                                <span key={`${d}-${i}`}>{d}</span>
                              ))}
                            </div>
                            <div className="home-calendar-grid">
                              {getMonthDays(calendarMonth).map((day, i) =>
                                day ? (
                                  <button
                                    key={day.toISOString()}
                                    className={isSameDay(day, today) ? 'home-calendar-today' : ''}
                                    onClick={() => handleSetDueDate(task, `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`)}
                                  >
                                    {day.getDate()}
                                  </button>
                                ) : (
                                  <span key={`empty-${i}`} />
                                )
                              )}
                            </div>
                            <button
                              className="home-calendar-clear"
                              onClick={() => handleSetDueDate(task, '')}
                            >
                              Rimuovi scadenza
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Inline task detail modal */}
      {activeTask && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setActiveTaskId(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold">{activeTask.title}</h3>
              <button
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                onClick={() => setActiveTaskId(null)}
              >
                ×
              </button>
            </div>
            {activeTask.description && (
              <p className="text-sm text-gray-600 mb-4">{activeTask.description}</p>
            )}
            <div className="flex flex-wrap gap-2 text-sm text-gray-500">
              <span>Stato: <strong>{activeTask.status}</strong></span>
              <span>Priorità: <strong>{activeTask.priority}</strong></span>
              {activeTask.dueDate && (
                <span>Scadenza: <strong>{getDueLabel(activeTask.dueDate)}</strong></span>
              )}
              {activeTask.projectId && projectById.get(activeTask.projectId) && (
                <span>
                  Progetto:{' '}
                  <button
                    className="text-blue-600 hover:underline font-medium"
                    onClick={() => {
                      setActiveTaskId(null);
                      handleOpenProject(activeTask.projectId);
                    }}
                  >
                    {projectById.get(activeTask.projectId)?.name}
                  </button>
                </span>
              )}
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                onClick={() => setActiveTaskId(null)}
              >
                Chiudi
              </button>
              <button
                className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
                onClick={() => { handleToggleDone(activeTask); setActiveTaskId(null); }}
              >
                {activeTask.status === 'DONE' ? 'Riapri' : 'Segna completata'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Exported component: picks mode at runtime ────────────────────────────────

export function Dashboard(props: DashboardProps): React.ReactElement {
  if (USE_BACKEND) {
    return <DashboardBackend {...props} />;
  }
  return (
    <React.Suspense fallback={<div className="page-container"><div className="loading">Caricamento...</div></div>}>
      <DashboardFallback {...props} />
    </React.Suspense>
  );
}
