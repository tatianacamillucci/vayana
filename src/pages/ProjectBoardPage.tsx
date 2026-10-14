import React, { useMemo, useRef, useState } from 'react';
import { useTasks, useCreateTask, useUpdateTask, Task as ApiTask, TaskStatus as ApiTaskStatus, CreateTaskDto } from '../lib/hooks/useTasks';
import { useProject } from '../lib/hooks/useProjects';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../lib/hooks/useSocket';

const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';

interface ProjectBoardPageProps {
  projectId: string;
  onOpenProject?: (projectId: string) => void;
}

const PROJECT_TABS = ['Panoramica', 'Elenco', 'Bacheca', 'Cronologia', 'Dashboard', 'Calendario', 'Flusso di lavoro', 'Messaggi', 'File'];
const BOARD_COLUMNS: Array<{ id: ApiTaskStatus; title: string }> = [
  { id: 'TODO', title: 'Da fare' },
  { id: 'IN_PROGRESS', title: 'In corso' },
  { id: 'IN_REVIEW', title: 'In revisione' },
  { id: 'DONE', title: 'Fatto' },
  { id: 'CANCELLED', title: 'Annullato' },
];

type ProjectHealthStatus = 'on_track' | 'at_risk' | 'off_track' | 'on_hold' | 'completed' | 'abandoned';
const PROJECT_STATUS_STORAGE_KEY = 'vayana_project_status_v1';

const PROJECT_STATUS_OPTIONS: Array<{ id: ProjectHealthStatus; label: string; tone: string }> = [
  { id: 'on_track', label: 'Nei tempi previsti', tone: 'green' },
  { id: 'at_risk', label: 'A rischio', tone: 'amber' },
  { id: 'off_track', label: 'In ritardo', tone: 'rose' },
  { id: 'on_hold', label: 'In sospeso', tone: 'blue' },
  { id: 'completed', label: 'Completato', tone: 'teal' },
  { id: 'abandoned', label: 'Abbandonato', tone: 'slate' },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return 'U';
  return parts.map((part) => part[0].toUpperCase()).join('');
}

function getAvatarColor(name: string): string {
  const palette = ['#8f84e8', '#2c9ad6', '#76c893', '#f4a261', '#f28482', '#b6a4ff', '#6ec5b8'];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

// ── Backend-powered component ────────────────────────────────────────────────
function ProjectBoardPageBackend({ projectId, onOpenProject }: ProjectBoardPageProps): React.ReactElement {
  const statusRef = useRef<HTMLDivElement | null>(null);
  const { data: project, isLoading: projLoading } = useProject(projectId);
  const { data: allTasks = [], isLoading: tasksLoading } = useTasks(projectId);
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const { user } = useAuth();

  // Real-time: join the project room and invalidate cache on task events
  useSocket(projectId);

  const [activeTask, setActiveTask] = useState<ApiTask | null>(null);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [composerStatus, setComposerStatus] = useState<ApiTaskStatus | null>(null);
  const [composerTitle, setComposerTitle] = useState('');
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [projectStatus, setProjectStatus] = useState<ProjectHealthStatus | null>(() => {
    try {
      const raw = localStorage.getItem(PROJECT_STATUS_STORAGE_KEY);
      if (!raw) return null;
      return (JSON.parse(raw) as Record<string, ProjectHealthStatus>)[projectId] || null;
    } catch { return null; }
  });

  const currentUserName = user ? `${user.firstName} ${user.lastName}`.trim() || user.email : 'Utente';

  const tasksByStatus = useMemo(() => {
    const map = new Map<ApiTaskStatus, ApiTask[]>();
    BOARD_COLUMNS.forEach((col) => {
      map.set(col.id, allTasks.filter((t) => t.status === col.id).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    });
    return map;
  }, [allTasks]);

  const projectAvatarNames = useMemo(() => {
    const names = new Set<string>();
    names.add(currentUserName);
    allTasks
      .flatMap((t) => t.assignees || [])
      .slice(0, 4)
      .forEach((a) => names.add(`${a.user.firstName} ${a.user.lastName}`.trim()));
    return Array.from(names).slice(0, 3);
  }, [allTasks, currentUserName]);

  const selectedStatus = projectStatus ? PROJECT_STATUS_OPTIONS.find((item) => item.id === projectStatus) || null : null;

  const handleQuickAddTask = async (status: ApiTaskStatus, rawTitle?: string) => {
    const title = (rawTitle ?? '').trim();
    if (!title) return;
    const dto: CreateTaskDto = { title, status, priority: 'MEDIUM', projectId };
    await createTaskMutation.mutateAsync(dto);
    setComposerTitle('');
    setComposerStatus(null);
  };

  const handleDropOnColumn = async (status: ApiTaskStatus) => {
    if (!dragTaskId) return;
    await updateTaskMutation.mutateAsync({ id: dragTaskId, dto: { status } });
    setDragTaskId(null);
  };

  const setAndPersistProjectStatus = (next: ProjectHealthStatus) => {
    setProjectStatus(next);
    try {
      const raw = localStorage.getItem(PROJECT_STATUS_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, ProjectHealthStatus>) : {};
      parsed[projectId] = next;
      localStorage.setItem(PROJECT_STATUS_STORAGE_KEY, JSON.stringify(parsed));
    } catch { /* ignore */ }
    setShowStatusPicker(false);
  };

  const loading = projLoading || tasksLoading;

  if (loading) {
    return <div className="page-container"><div className="loading">Caricamento progetto...</div></div>;
  }

  if (!project) {
    return <div className="page-container"><div className="empty-state">Progetto non trovato.</div></div>;
  }

  return (
    <div className="page-container project-board-page">
      <header className="project-board-head">
        <div className="project-board-title-row">
          <span className="project-board-logo">{project.name.slice(0, 2).toUpperCase()}</span>
          <h1>{project.name}</h1>
          <div className="project-status-wrap" ref={statusRef}>
            <button className="project-board-status" onClick={() => setShowStatusPicker((open) => !open)}>
              <span className="project-status-circle" aria-hidden />
              Imposta stato
            </button>
            {selectedStatus && <span className={`project-status-badge tone-${selectedStatus.tone}`}>{selectedStatus.label}</span>}
            {showStatusPicker && (
              <div className="project-status-popover">
                {PROJECT_STATUS_OPTIONS.slice(0, 4).map((option) => (
                  <button key={option.id} type="button" className={`project-status-option tone-${option.tone}`} onClick={() => setAndPersistProjectStatus(option.id)}>
                    <span className="project-status-dot" aria-hidden />{option.label}
                  </button>
                ))}
                <div className="project-status-divider" />
                {PROJECT_STATUS_OPTIONS.slice(4).map((option) => (
                  <button key={option.id} type="button" className={`project-status-option tone-${option.tone}`} onClick={() => setAndPersistProjectStatus(option.id)}>
                    <span className="project-status-dot" aria-hidden />{option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="project-board-actions">
          <div className="project-board-avatar-stack">
            {projectAvatarNames.map((name, index) => (
              <span key={`${name}-${index}`} className="project-board-avatar" style={{ background: getAvatarColor(name) }} title={name}>
                {getInitials(name)}
              </span>
            ))}
          </div>
          <button className="btn-primary project-board-share">Condividi</button>
          <button className="btn-secondary">Personalizza</button>
        </div>
      </header>

      <nav className="project-board-tabs">
        {PROJECT_TABS.map((tab) => (
          <button key={tab} className={tab === 'Bacheca' ? 'active' : ''}>{tab}</button>
        ))}
      </nav>

      <div className="project-board-toolbar">
        <button className="btn-secondary" onClick={() => setComposerStatus('TODO')}>+ Aggiungi attività</button>
        <div className="project-board-toolbar-right">
          <button>Filtra</button>
          <button>Ordina</button>
          <button>Raggruppa</button>
          <button>Opzioni</button>
        </div>
      </div>

      <section className="project-board-columns">
        {BOARD_COLUMNS.map((column) => (
          <div
            key={column.id}
            className={`project-board-column ${dragTaskId ? 'is-droppable' : ''}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => void handleDropOnColumn(column.id)}
          >
            <div className="project-board-column-head">
              <h3>{column.title}</h3>
              <span>{(tasksByStatus.get(column.id) || []).length}</span>
            </div>
            <div className="project-board-column-body">
              <button className="project-board-add-task" onClick={() => { setComposerStatus(column.id); setComposerTitle(''); }}>
                + Aggiungi attività
              </button>

              {composerStatus === column.id && (
                <article className="project-board-compose-card">
                  <div className="project-board-compose-title-row">
                    <span className="project-board-check-fake">◌</span>
                    <input
                      autoFocus
                      value={composerTitle}
                      onChange={(event) => setComposerTitle(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') { event.preventDefault(); void handleQuickAddTask(column.id, composerTitle); }
                        if (event.key === 'Escape') { setComposerStatus(null); setComposerTitle(''); }
                      }}
                      placeholder="Scrivi il nome dell'attività"
                    />
                  </div>
                  <div className="project-board-compose-footer">
                    <div className="project-board-compose-actions">
                      <button className="btn-secondary" onClick={() => setComposerStatus(null)}>Annulla</button>
                      <button className="btn-primary" onClick={() => void handleQuickAddTask(column.id, composerTitle)}>Crea</button>
                    </div>
                  </div>
                </article>
              )}

              {(tasksByStatus.get(column.id) || []).map((task) => {
                const assigneeNames = (task.assignees || []).map((a) => `${a.user.firstName} ${a.user.lastName}`.trim());
                return (
                  <article
                    key={task.id}
                    className="project-board-task-card"
                    draggable
                    onDragStart={() => setDragTaskId(task.id)}
                    onDragEnd={() => setDragTaskId(null)}
                    onClick={() => setActiveTask(task)}
                  >
                    <div className="project-board-task-title">{task.title}</div>
                    <div className="project-board-task-meta">
                      {assigneeNames.length > 0 ? (
                        <span className="project-board-mini-avatar" title={assigneeNames.join(', ')}>{getInitials(assigneeNames[0])}</span>
                      ) : (
                        <span className="project-board-mini-avatar">–</span>
                      )}
                      {task.dueDate && (
                        <span className="project-board-task-date">
                          {new Date(task.dueDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ))}

        <div className="project-board-column project-board-column-placeholder">
          <button className="project-board-add-section">+ Aggiungi sezione</button>
        </div>
      </section>

      {activeTask && (
        <div className="modal-overlay" onClick={() => setActiveTask(null)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>{activeTask.title}</h2>
              <button className="btn-secondary" onClick={() => setActiveTask(null)}>Chiudi</button>
            </div>
            <p className="text-secondary">{activeTask.description || 'Nessuna descrizione.'}</p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <span className={`status-badge status-${activeTask.status.toLowerCase()}`}>{activeTask.status}</span>
              <span>Priorità: {activeTask.priority}</span>
              {activeTask.dueDate && <span>Scadenza: {new Date(activeTask.dueDate).toLocaleDateString()}</span>}
            </div>
            {activeTask.assignees && activeTask.assignees.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <strong>Assegnatari:</strong> {activeTask.assignees.map((a) => `${a.user.firstName} ${a.user.lastName}`).join(', ')}
              </div>
            )}
            {onOpenProject && (
              <button className="btn-secondary" style={{ marginTop: '1rem' }} onClick={() => { setActiveTask(null); onOpenProject(projectId); }}>
                Apri progetto
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Fallback (sql.js) component — lazy loaded ─────────────────────────────────
const ProjectBoardPageFallback = React.lazy(() =>
  import('./ProjectBoardPageFallback').then((m) => ({ default: m.ProjectBoardPageFallback }))
);

// ── Public export ─────────────────────────────────────────────────────────────
export function ProjectBoardPage({ projectId, onOpenProject }: ProjectBoardPageProps): React.ReactElement {
  if (USE_BACKEND) {
    return <ProjectBoardPageBackend projectId={projectId} onOpenProject={onOpenProject} />;
  }
  return (
    <React.Suspense fallback={<div className="page-container"><div className="loading">Caricamento...</div></div>}>
      <ProjectBoardPageFallback projectId={projectId} onOpenProject={onOpenProject} />
    </React.Suspense>
  );
}
