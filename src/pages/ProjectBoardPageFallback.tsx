// ProjectBoardPageFallback.tsx — sql.js implementation (used when VITE_USE_BACKEND=false)
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPhase, getPhasesByProjectId, Phase } from '../lib/db/phases';
import { getProjectById, Project } from '../lib/db/projects';
import { createTask, getTasks, getTasksByProjectId, Task, TaskStatus, updateTask } from '../lib/db/tasks';
import { addTaskToProject, getTasksByProjectIdMulti } from '../lib/db/taskProjects';
import { Team, getTeams } from '../lib/db/teams';
import { TeamMember, getAllTeamMembers } from '../lib/db/teamMembers';
import { TaskDetailPanel } from '../components/TaskDetailPanel';

interface ProjectBoardPageFallbackProps {
  projectId: string;
  onOpenProject?: (projectId: string) => void;
}

const PROJECT_TABS = ['Panoramica', 'Elenco', 'Bacheca', 'Cronologia', 'Dashboard', 'Calendario', 'Flusso di lavoro', 'Messaggi', 'File'];
const BOARD_COLUMNS: Array<{ id: TaskStatus; title: string }> = [
  { id: 'todo', title: 'Da fare' },
  { id: 'in_progress', title: 'In corso' },
  { id: 'done', title: 'Fatto' },
];
const PROFILE_STORAGE_KEY = 'vayana_profile_settings_v1';
const PROJECT_STATUS_STORAGE_KEY = 'vayana_project_status_v1';

type ProjectHealthStatus = 'on_track' | 'at_risk' | 'off_track' | 'on_hold' | 'completed' | 'abandoned';

const PROJECT_STATUS_OPTIONS: Array<{ id: ProjectHealthStatus; label: string; tone: string }> = [
  { id: 'on_track', label: 'Nei tempi previsti', tone: 'green' },
  { id: 'at_risk', label: 'A rischio', tone: 'amber' },
  { id: 'off_track', label: 'In ritardo', tone: 'rose' },
  { id: 'on_hold', label: 'In sospeso', tone: 'blue' },
  { id: 'completed', label: 'Completato', tone: 'teal' },
  { id: 'abandoned', label: 'Abbandonato', tone: 'slate' },
];

function getInitial(name: string | null): string {
  const value = (name || '').trim();
  if (!value) return 'U';
  return value[0].toUpperCase();
}

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
  const index = Math.abs(hash) % palette.length;
  return palette[index];
}

function getCurrentUserName(): string {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return 'Utente';
    const parsed = JSON.parse(raw) as { fullName?: string };
    const fullName = parsed.fullName?.trim();
    return fullName || 'Utente';
  } catch {
    return 'Utente';
  }
}

export function ProjectBoardPageFallback({ projectId, onOpenProject }: ProjectBoardPageFallbackProps): React.ReactElement {
  const statusRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [composerStatus, setComposerStatus] = useState<TaskStatus | null>(null);
  const [composerTitle, setComposerTitle] = useState('');
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [projectStatus, setProjectStatus] = useState<ProjectHealthStatus | null>(null);

  useEffect(() => {
    void loadData();
  }, [projectId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROJECT_STATUS_STORAGE_KEY);
      if (!raw) { setProjectStatus(null); return; }
      const parsed = JSON.parse(raw) as Record<string, ProjectHealthStatus>;
      setProjectStatus(parsed[projectId] || null);
    } catch { setProjectStatus(null); }
  }, [projectId]);

  useEffect(() => {
    if (!showStatusPicker) return;
    const onDocumentClick = (event: MouseEvent) => {
      if (!statusRef.current) return;
      if (!statusRef.current.contains(event.target as Node)) setShowStatusPicker(false);
    };
    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, [showStatusPicker]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projectData, phaseData, allTasksData, phaseProjectTasks, linkedTaskIds, teamsData, membersData] = await Promise.all([
        getProjectById(projectId),
        getPhasesByProjectId(projectId),
        getTasks(),
        getTasksByProjectId(projectId),
        getTasksByProjectIdMulti(projectId),
        getTeams(),
        getAllTeamMembers(),
      ]);

      setProject(projectData);
      setPhases(phaseData);
      setAllTasks(allTasksData);
      setTeams(teamsData);
      setTeamMembers(membersData);

      const byId = new Map<string, Task>();
      phaseProjectTasks.forEach((task) => byId.set(task.id, task));
      const linkedSet = new Set(linkedTaskIds);
      allTasksData.filter((task) => linkedSet.has(task.id)).forEach((task) => byId.set(task.id, task));
      setProjectTasks(Array.from(byId.values()));

      if (activeTask) {
        setActiveTask(allTasksData.find((item) => item.id === activeTask.id) || null);
      }
    } catch (err) {
      console.error('Failed to load project board data:', err);
    } finally {
      setLoading(false);
    }
  };

  const tasksByStatus = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>();
    BOARD_COLUMNS.forEach((column) => {
      map.set(column.id, projectTasks.filter((task) => task.status === column.id).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()));
    });
    return map;
  }, [projectTasks]);

  const projectAvatarNames = useMemo(() => {
    const currentUser = getCurrentUserName();
    const names = new Set<string>();
    names.add(currentUser);
    teamMembers.filter((member) => member.teamId === project?.teamId).slice(0, 4).forEach((member) => names.add(member.fullName));
    projectTasks.filter((task) => !!task.assignee).slice(0, 4).forEach((task) => names.add(task.assignee as string));
    return Array.from(names).slice(0, 3);
  }, [project?.teamId, projectTasks, teamMembers]);

  const selectedStatus = projectStatus ? PROJECT_STATUS_OPTIONS.find((item) => item.id === projectStatus) || null : null;

  const ensureDefaultPhase = async (): Promise<string> => {
    const existing = phases[0];
    if (existing) return existing.id;
    const created = await createPhase('Backlog', projectId);
    setPhases((prev) => [...prev, created]);
    return created.id;
  };

  const handleQuickAddTask = async (status: TaskStatus, rawTitle?: string) => {
    const title = (rawTitle ?? '').trim();
    if (!title) return;
    const phaseId = await ensureDefaultPhase();
    const created = await createTask(phaseId, title, '', status, 'medium', undefined, status === 'done' ? 100 : 0, null, null, 'default_task', getCurrentUserName());
    await addTaskToProject(created.id, projectId);
    setComposerTitle('');
    setComposerStatus(null);
    await loadData();
  };

  const openComposer = (status: TaskStatus) => {
    setComposerStatus(status);
    setComposerTitle('');
  };

  const handleDropOnColumn = async (status: TaskStatus) => {
    if (!dragTaskId) return;
    await updateTask(dragTaskId, { status, progress: status === 'done' ? 100 : 0 });
    setDragTaskId(null);
    await loadData();
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
        <button className="btn-secondary" onClick={() => openComposer('todo')}>+ Aggiungi attività</button>
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
              <button className="project-board-add-task" onClick={() => openComposer(column.id)}>
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
                  <div className="project-board-compose-meta">
                    <span>Priorità</span>
                    <span>Stato</span>
                  </div>
                  <div className="project-board-compose-footer">
                    <span className="project-board-compose-avatar">{getInitial(getCurrentUserName())}</span>
                    <span className="project-board-compose-cal">📅</span>
                    <div className="project-board-compose-actions">
                      <button className="btn-secondary" onClick={() => setComposerStatus(null)}>Annulla</button>
                      <button className="btn-primary" onClick={() => void handleQuickAddTask(column.id, composerTitle)}>Crea</button>
                    </div>
                  </div>
                </article>
              )}

              {(tasksByStatus.get(column.id) || []).map((task) => (
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
                    <span className="project-board-mini-avatar">{getInitial(task.assignee)}</span>
                    {task.dueDate && (
                      <span className="project-board-task-date">
                        {task.dueDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}

        <div className="project-board-column project-board-column-placeholder">
          <button className="project-board-add-section">+ Aggiungi sezione</button>
        </div>
      </section>

      {activeTask && (
        <TaskDetailPanel
          task={activeTask}
          currentUserName={getCurrentUserName()}
          projects={project ? [project] : []}
          phases={phases}
          teams={teams}
          teamMembers={teamMembers}
          allTasks={allTasks}
          onOpenProject={onOpenProject}
          onOpenTask={(taskId) => {
            const target = allTasks.find((item) => item.id === taskId);
            if (target) setActiveTask(target);
          }}
          onClose={() => setActiveTask(null)}
          onUpdated={loadData}
        />
      )}
    </div>
  );
}
