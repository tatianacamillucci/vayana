import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Task, createTask, getTasks, updateTask } from '../lib/db/tasks';
import { Project, getProjects } from '../lib/db/projects';
import { Phase, getPhases } from '../lib/db/phases';
import { Team, getTeams } from '../lib/db/teams';
import { TeamMember, getAllTeamMembers } from '../lib/db/teamMembers';
import { TaskDetailPanel } from './TaskDetailPanel';

type HomeTab = 'in_progress' | 'overdue' | 'done';
type HomeColorPreset = 'menu' | 'violet' | 'berry' | 'ocean' | 'forest';
type HomeRange = 'week' | 'month';

const PROFILE_STORAGE_KEY = 'vayana_profile_settings_v1';
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

export function Dashboard({ onOpenProject }: DashboardProps): React.ReactElement {
  const customizeRef = useRef<HTMLDivElement | null>(null);
  const rangeRef = useRef<HTMLDivElement | null>(null);
  const quickInputRef = useRef<HTMLInputElement | null>(null);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activeTab, setActiveTab] = useState<HomeTab>('in_progress');
  const [displayName, setDisplayName] = useState('');
  const [showCustomize, setShowCustomize] = useState(false);
  const [homeColorPreset, setHomeColorPreset] = useState<HomeColorPreset>('menu');
  const [isQuickCreating, setIsQuickCreating] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [openCalendarTaskId, setOpenCalendarTaskId] = useState<string | null>(null);
  const [expandedTaskTree, setExpandedTaskTree] = useState<Record<string, boolean>>({});
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [homeRange, setHomeRange] = useState<HomeRange>('week');
  const [showRangeMenu, setShowRangeMenu] = useState(false);

  useEffect(() => {
    void loadData();
    loadProfileName();
    loadHomeColorPreset();
  }, []);

  useEffect(() => {
    if (!showCustomize) return;
    const onDocumentClick = (event: MouseEvent) => {
      if (!customizeRef.current) return;
      if (!customizeRef.current.contains(event.target as Node)) {
        setShowCustomize(false);
      }
    };
    document.addEventListener('mousedown', onDocumentClick);
    return () => {
      document.removeEventListener('mousedown', onDocumentClick);
    };
  }, [showCustomize]);

  useEffect(() => {
    if (!showRangeMenu) return;
    const onDocumentClick = (event: MouseEvent) => {
      if (!rangeRef.current) return;
      if (!rangeRef.current.contains(event.target as Node)) {
        setShowRangeMenu(false);
      }
    };
    document.addEventListener('mousedown', onDocumentClick);
    return () => {
      document.removeEventListener('mousedown', onDocumentClick);
    };
  }, [showRangeMenu]);

  useEffect(() => {
    if (!openCalendarTaskId) return;
    const onDocumentClick = (event: MouseEvent) => {
      if (!calendarRef.current) return;
      if (!calendarRef.current.contains(event.target as Node)) {
        setOpenCalendarTaskId(null);
      }
    };
    document.addEventListener('mousedown', onDocumentClick);
    return () => {
      document.removeEventListener('mousedown', onDocumentClick);
    };
  }, [openCalendarTaskId]);

  useEffect(() => {
    if (!isQuickCreating) return;
    quickInputRef.current?.focus();
  }, [isQuickCreating]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksData, projectsData, phasesData, teamsData, membersData] = await Promise.all([
        getTasks(),
        getProjects(),
        getPhases(),
        getTeams(),
        getAllTeamMembers(),
      ]);
      setTasks(tasksData);
      setProjects(projectsData);
      setPhases(phasesData);
      setTeams(teamsData);
      setTeamMembers(membersData);
      if (activeTask) {
        setActiveTask(tasksData.find((item) => item.id === activeTask.id) || null);
      }
    } catch (err) {
      console.error('Failed to load home data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProfileName = () => {
    try {
      const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as { fullName?: string };
      if (parsed.fullName && parsed.fullName.trim()) {
        setDisplayName(parsed.fullName.trim());
      }
    } catch {
      // ignore malformed local storage
    }
  };

  const loadHomeColorPreset = () => {
    try {
      const stored = localStorage.getItem(HOME_PRESET_STORAGE_KEY);
      if (!stored) return;
      const isValid = HOME_COLOR_PRESETS.some((preset) => preset.id === stored);
      if (isValid) setHomeColorPreset(stored as HomeColorPreset);
    } catch {
      // ignore malformed local storage
    }
  };

  const setAndPersistHomePreset = (preset: HomeColorPreset) => {
    setHomeColorPreset(preset);
    localStorage.setItem(HOME_PRESET_STORAGE_KEY, preset);
    setShowCustomize(false);
  };

  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const phaseById = useMemo(() => {
    const map = new Map<string, Phase>();
    phases.forEach((phase) => map.set(phase.id, phase));
    return map;
  }, [phases]);

  const projectById = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((project) => map.set(project.id, project));
    return map;
  }, [projects]);

  const taskBuckets = useMemo(() => {
    const inProgress = tasks.filter((task) => task.status !== 'done' && (!task.dueDate || task.dueDate >= today));
    const overdue = tasks.filter((task) => task.status !== 'done' && !!task.dueDate && task.dueDate < today);
    const done = tasks.filter((task) => task.status === 'done');

    const byDue = (a: Task, b: Task) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.getTime() - b.dueDate.getTime();
    };

    return {
      inProgress: inProgress.sort(byDue),
      overdue: overdue.sort(byDue),
      done: done.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    };
  }, [tasks, today]);

  const visibleTasks =
    activeTab === 'in_progress' ? taskBuckets.inProgress : activeTab === 'overdue' ? taskBuckets.overdue : taskBuckets.done;

  const visibleTaskMap = useMemo(() => {
    const map = new Map<string, Task>();
    visibleTasks.forEach((task) => map.set(task.id, task));
    return map;
  }, [visibleTasks]);

  const subtasksByParent = useMemo(() => {
    const map = new Map<string, Task[]>();
    visibleTasks.forEach((task) => {
      if (!task.parentTaskId) return;
      if (!map.has(task.parentTaskId)) map.set(task.parentTaskId, []);
      map.get(task.parentTaskId)?.push(task);
    });
    map.forEach((rows) => rows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()));
    return map;
  }, [visibleTasks]);

  const visibleRootTasks = useMemo(
    () => visibleTasks.filter((task) => !task.parentTaskId || !visibleTaskMap.has(task.parentTaskId)),
    [visibleTaskMap, visibleTasks]
  );

  const periodStart = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (homeRange === 'week') {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return start;
    }
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    return start;
  }, [homeRange]);

  const completedCount = useMemo(
    () => tasks.filter((task) => task.status === 'done' && task.updatedAt >= periodStart).length,
    [periodStart, tasks]
  );

  const collaboratorCount = useMemo(() => {
    const current = (displayName.trim() || 'Utente').toLowerCase();
    const names = new Set<string>();
    tasks.forEach((task) => {
      if (task.status !== 'done' || task.updatedAt < periodStart) return;
      if (!task.assignee) return;
      const normalized = task.assignee.trim();
      if (!normalized) return;
      if (normalized.toLowerCase() === current) return;
      names.add(normalized.toLowerCase());
    });
    return names.size;
  }, [periodStart, tasks]);

  const rangeLabel = homeRange === 'week' ? 'La mia settimana' : 'Il mio mese';

  const formatHeaderDate = () => {
    const value = new Intl.DateTimeFormat('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date());
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const getGreetingName = () => {
    if (!displayName) return 'Utente';
    const firstName = displayName.split(' ').filter(Boolean)[0];
    return firstName || displayName;
  };

  const getAvatarLabel = () => {
    if (!displayName) return 'U';
    const parts = displayName.split(' ').filter(Boolean).slice(0, 2);
    return parts.map((part) => part[0].toUpperCase()).join('') || 'U';
  };

  const getCurrentUserName = () => displayName.trim() || 'Utente';

  const handleQuickCreate = async () => {
    const title = quickTitle.trim();
    if (!title) return;
    try {
      await createTask(
        null,
        title,
        '',
        'todo',
        'medium',
        undefined,
        0,
        null,
        null,
        'default_task',
        getCurrentUserName(),
        false
      );
      setQuickTitle('');
      setIsQuickCreating(false);
      await loadData();
    } catch (err) {
      console.error('Failed to quick-create task:', err);
    }
  };

  const getTaskProjectName = (task: Task): string => {
    if (!task.phaseId) return '';
    const phase = phaseById.get(task.phaseId);
    if (!phase) return '';
    return projectById.get(phase.projectId)?.name || '';
  };

  const getTaskProjectId = (task: Task): string | null => {
    if (!task.phaseId) return null;
    const phase = phaseById.get(task.phaseId);
    if (!phase) return null;
    return phase.projectId;
  };

  const getDueLabel = (dueDate: Date | null): string => {
    if (!dueDate) return '';
    return dueDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' });
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

  const openTaskCalendar = (task: Task) => {
    const base = task.dueDate ? new Date(task.dueDate) : new Date(today);
    setCalendarMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    setOpenCalendarTaskId(task.id);
  };

  const handleSelectCalendarDay = async (task: Task, day: Date) => {
    await handleSetDueDate(task, `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`);
    setOpenCalendarTaskId(null);
  };

  const handleToggleDone = async (task: Task) => {
    const nextStatus = task.status === 'done' ? 'in_progress' : 'done';
    await updateTask(task.id, {
      status: nextStatus,
      progress: nextStatus === 'done' ? 100 : 0,
    });
    await loadData();
  };

  const handleSetDueDate = async (task: Task, value: string) => {
    await updateTask(task.id, {
      dueDate: value ? new Date(`${value}T00:00:00`) : null,
    });
    await loadData();
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Caricamento...</div>
      </div>
    );
  }

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
              <button className="home-range-btn" onClick={() => setShowRangeMenu((open) => !open)}>
                {rangeLabel} <span className="home-range-caret">▾</span>
              </button>
              {showRangeMenu && (
                <div className="home-range-menu">
                  <button
                    className={homeRange === 'week' ? 'active' : ''}
                    onClick={() => {
                      setHomeRange('week');
                      setShowRangeMenu(false);
                    }}
                  >
                    La mia settimana
                  </button>
                  <button
                    className={homeRange === 'month' ? 'active' : ''}
                    onClick={() => {
                      setHomeRange('month');
                      setShowRangeMenu(false);
                    }}
                  >
                    Il mio mese
                  </button>
                </div>
              )}
            </span>
            <span>{completedCount} attività completate</span>
            <span>
              {collaboratorCount} collaborator{collaboratorCount === 1 ? 'e' : 'i'}
            </span>
          </div>
          <div className="home-customize-wrap" ref={customizeRef}>
            <button className="home-customize-btn" onClick={() => setShowCustomize((open) => !open)}>
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

      <section className="home-main-card">
        <div className="home-main-head">
          <div className="home-avatar">{getAvatarLabel()}</div>
          <div className="home-main-title-wrap">
            <h2>
              Le mie attività <span className="home-lock">🔒</span>
            </h2>
            <div className="home-tabs">
              <button className={activeTab === 'in_progress' ? 'active' : ''} onClick={() => setActiveTab('in_progress')}>
                In programma
              </button>
              <button className={activeTab === 'overdue' ? 'active' : ''} onClick={() => setActiveTab('overdue')}>
                ({taskBuckets.overdue.length}) scadute
              </button>
              <button className={activeTab === 'done' ? 'active' : ''} onClick={() => setActiveTab('done')}>
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
                onChange={(event) => setQuickTitle(event.target.value)}
                placeholder="Scrivi il nome dell'attività"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void handleQuickCreate();
                  }
                  if (event.key === 'Escape') {
                    setIsQuickCreating(false);
                    setQuickTitle('');
                  }
                }}
                onBlur={() => {
                  if (!quickTitle.trim()) {
                    setIsQuickCreating(false);
                  }
                }}
              />
            </div>
          ) : (
            <button className="home-create-task-row" onClick={() => setIsQuickCreating(true)}>
              + Crea attività
            </button>
          )}
          {visibleRootTasks.length === 0 ? (
            <p className="text-muted">Nessuna attività in questa sezione.</p>
          ) : (
            visibleRootTasks.slice(0, 12).map((task) => {
              const projectName = getTaskProjectName(task);
              const dueLabel = getDueLabel(task.dueDate);
              const subtasks = subtasksByParent.get(task.id) || [];
              const isExpanded = expandedTaskTree[task.id] ?? true;
              return (
                <div key={task.id} className="home-task-tree-group">
                  <div className="home-task-row" onClick={() => setActiveTask(task)}>
                    <div className="home-task-main">
                      <button
                        className={`home-task-check-btn ${task.status === 'done' ? 'done' : ''}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleToggleDone(task);
                        }}
                        title={task.status === 'done' ? 'Segna non completata' : 'Segna completata'}
                      >
                        {task.status === 'done' ? '✓' : ''}
                      </button>
                      {subtasks.length > 0 && (
                        <button
                          type="button"
                          className={`home-task-tree-toggle ${isExpanded ? 'expanded' : 'collapsed'}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setExpandedTaskTree((prev) => {
                              const current = prev[task.id] ?? true;
                              return { ...prev, [task.id]: !current };
                            });
                          }}
                          title={isExpanded ? 'Nascondi sottoattività' : 'Mostra sottoattività'}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" className="home-task-tree-icon">
                            <path
                              d="M6 6v12M6 10h6M12 10v8M12 14h6"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      )}
                      <span className="home-task-title">{task.title}</span>
                    </div>
                    <div className="home-task-meta" onClick={(event) => event.stopPropagation()}>
                      {projectName ? (
                        <button
                          type="button"
                          className="home-row-project home-row-project-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            const projectId = getTaskProjectId(task);
                            if (projectId && onOpenProject) onOpenProject(projectId);
                          }}
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
                          onClick={(event) => {
                            event.stopPropagation();
                            if (openCalendarTaskId === task.id) {
                              setOpenCalendarTaskId(null);
                              return;
                            }
                            openTaskCalendar(task);
                          }}
                        >
                          <span className="home-calendar-glyph" aria-hidden />
                        </button>
                        {openCalendarTaskId === task.id && (
                          <div className="home-calendar-popover" onClick={(event) => event.stopPropagation()}>
                            <div className="home-calendar-head">
                              <button
                                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                              >
                                ‹
                              </button>
                              <span>{getMonthLabel(calendarMonth)}</span>
                              <button
                                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                              >
                                ›
                              </button>
                            </div>
                            <div className="home-calendar-grid home-calendar-weekdays">
                              {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((item, index) => (
                                <span key={`${item}-${index}`}>{item}</span>
                              ))}
                            </div>
                            <div className="home-calendar-grid">
                              {getMonthDays(calendarMonth).map((day, index) =>
                                day ? (
                                  <button
                                    key={day.toISOString()}
                                    className={isSameDay(day, today) ? 'home-calendar-today' : ''}
                                    onClick={() => void handleSelectCalendarDay(task, day)}
                                  >
                                    {day.getDate()}
                                  </button>
                                ) : (
                                  <span key={`empty-${index}`} />
                                )
                              )}
                            </div>
                            <button
                              className="home-calendar-clear"
                              onClick={() => {
                                void handleSetDueDate(task, '');
                                setOpenCalendarTaskId(null);
                              }}
                            >
                              Rimuovi scadenza
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {isExpanded &&
                    subtasks.map((subtask) => {
                      const childProject = getTaskProjectName(subtask);
                      const childDue = getDueLabel(subtask.dueDate);
                      return (
                        <div key={subtask.id} className="home-task-row home-task-row-child" onClick={() => setActiveTask(subtask)}>
                          <div className="home-task-main">
                            <button
                              className={`home-task-check-btn ${subtask.status === 'done' ? 'done' : ''}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleToggleDone(subtask);
                              }}
                              title={subtask.status === 'done' ? 'Segna non completata' : 'Segna completata'}
                            >
                              {subtask.status === 'done' ? '✓' : ''}
                            </button>
                            <span className="home-task-title">{subtask.title}</span>
                          </div>
                          <div className="home-task-meta" onClick={(event) => event.stopPropagation()}>
                            {childProject ? (
                              <button
                                type="button"
                                className="home-row-project home-row-project-btn"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  const projectId = getTaskProjectId(subtask);
                                  if (projectId && onOpenProject) onOpenProject(projectId);
                                }}
                                title="Apri dettaglio progetto"
                              >
                                {childProject}
                              </button>
                            ) : (
                              <span className="home-row-project home-row-project-empty" aria-hidden />
                            )}
                            {childDue ? <span className="home-row-due">{childDue}</span> : <span className="home-row-due home-row-due-empty" aria-hidden />}
                            <span className="home-calendar-btn home-calendar-btn-placeholder" aria-hidden>
                              <span className="home-calendar-glyph" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              );
            })
          )}
        </div>
      </section>

      {activeTask && (
        <TaskDetailPanel
          task={activeTask}
          currentUserName={getCurrentUserName()}
          projects={projects}
          phases={phases}
          teams={teams}
          teamMembers={teamMembers}
          allTasks={tasks}
          onOpenProject={onOpenProject}
          onOpenTask={(taskId) => {
            const target = tasks.find((item) => item.id === taskId);
            if (target) setActiveTask(target);
          }}
          onClose={() => setActiveTask(null)}
          onUpdated={loadData}
        />
      )}
    </div>
  );
}
