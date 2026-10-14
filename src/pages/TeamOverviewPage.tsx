import React, { useMemo, useState } from 'react';
import { useProjects } from '../lib/hooks/useProjects';
import { useTasks, Task as ApiTask } from '../lib/hooks/useTasks';
import { useTeams } from '../lib/hooks/useTeams';

const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';

interface ProjectOverview {
  projectId: string;
  projectName: string;
  teamName: string;
  tasks: ApiTask[];
  completion: number;
  todo: number;
  inProgress: number;
  done: number;
  overdue: number;
}

// ── Backend-powered component ────────────────────────────────────────────────
function TeamOverviewPageBackend(): React.ReactElement {
  const { data: projects = [], isLoading: projLoading } = useProjects();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: teams = [], isLoading: teamsLoading } = useTeams();

  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<ProjectOverview | null>(null);

  const loading = projLoading || tasksLoading || teamsLoading;

  const getTeamName = (teamId: string | null | undefined): string => {
    if (!teamId) return 'Senza team';
    return teams.find((t) => t.id === teamId)?.name || 'Senza team';
  };

  const projectOverview = useMemo((): ProjectOverview[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return projects.map((project) => {
      const projectTasks = tasks.filter((t) => t.projectId === project.id);
      const todo = projectTasks.filter((t) => t.status === 'TODO').length;
      const inProgress = projectTasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW').length;
      const done = projectTasks.filter((t) => t.status === 'DONE').length;
      const overdue = projectTasks.filter((t) => {
        if (!t.dueDate || t.status === 'DONE') return false;
        return new Date(t.dueDate) < today;
      }).length;
      const completion = projectTasks.length === 0 ? 0 : Math.round((done / projectTasks.length) * 100);

      return {
        projectId: project.id,
        projectName: project.name,
        teamName: getTeamName(project.teamId),
        tasks: projectTasks,
        completion,
        todo,
        inProgress,
        done,
        overdue,
      };
    });
  }, [projects, tasks, teams]);

  const visibleOverview = useMemo(() => {
    if (selectedTeamId === 'all') return projectOverview;
    return projectOverview.filter((item) => {
      const project = projects.find((p) => p.id === item.projectId);
      return project?.teamId === selectedTeamId;
    });
  }, [projectOverview, selectedTeamId, projects]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Caricamento overview team...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Team Overview</h1>
          <p className="text-secondary">Controlla avanzamento processi e apri il dettaglio dei progetti.</p>
        </div>
        <div className="header-actions">
          <select
            className="filter-select"
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
          >
            <option value="all">Tutti i team</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {visibleOverview.length === 0 ? (
        <div className="card">
          <p className="text-muted">Nessun progetto disponibile per il filtro selezionato.</p>
        </div>
      ) : (
        <div className="team-overview-grid">
          {visibleOverview.map((item) => (
            <button
              key={item.projectId}
              className="card team-overview-card"
              onClick={() => setSelectedProject(item)}
            >
              <div className="team-overview-head">
                <h3>{item.projectName}</h3>
                <span>{item.teamName}</span>
              </div>
              <div className="team-overview-progress">
                <div className="team-overview-progress-track">
                  <div style={{ width: `${item.completion}%` }} />
                </div>
                <strong>{item.completion}%</strong>
              </div>
              <div className="team-overview-kpis">
                <span>Todo: {item.todo}</span>
                <span>In corso: {item.inProgress}</span>
                <span>Done: {item.done}</span>
                <span className={item.overdue > 0 ? 'danger' : ''}>In ritardo: {item.overdue}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedProject && (
        <div className="modal-overlay" onClick={() => setSelectedProject(null)}>
          <div className="modal modal-large project-progress-modal" onClick={(e) => e.stopPropagation()}>
            <div className="project-progress-modal-head">
              <div>
                <h2>{selectedProject.projectName}</h2>
                <p className="text-secondary">{selectedProject.teamName}</p>
              </div>
              <button className="btn-secondary" onClick={() => setSelectedProject(null)}>
                Chiudi
              </button>
            </div>

            <div className="project-progress-summary">
              <span>Completamento: {selectedProject.completion}%</span>
              <span>Task totali: {selectedProject.tasks.length}</span>
              <span>In corso: {selectedProject.inProgress}</span>
              <span className={selectedProject.overdue > 0 ? 'danger' : ''}>In ritardo: {selectedProject.overdue}</span>
            </div>

            {selectedProject.tasks.length === 0 ? (
              <p className="text-muted">Nessun task presente in questo progetto.</p>
            ) : (
              <div className="project-progress-list">
                {selectedProject.tasks.map((task) => (
                  <div key={task.id} className="project-progress-row">
                    <div className="project-progress-main">
                      <div className="project-progress-title">{task.title}</div>
                      <div className="project-progress-meta">
                        <span className={`status-badge status-${task.status.toLowerCase()}`}>{task.status}</span>
                        <span>Priorità: {task.priority}</span>
                        <span>Scadenza: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                    {task.progress !== undefined && (
                      <div className="project-task-progress">
                        <div className="project-task-progress-track">
                          <div style={{ width: `${task.progress}%` }} />
                        </div>
                        <span>{task.progress}%</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Fallback (sql.js) component — lazy loaded ─────────────────────────────────
const TeamOverviewPageFallback = React.lazy(() =>
  import('./TeamOverviewPageFallback').then((m) => ({ default: m.TeamOverviewPageFallback }))
);

// ── Public export ─────────────────────────────────────────────────────────────
export function TeamOverviewPage(): React.ReactElement {
  if (USE_BACKEND) {
    return <TeamOverviewPageBackend />;
  }
  return (
    <React.Suspense fallback={<div className="page-container"><div className="loading">Caricamento...</div></div>}>
      <TeamOverviewPageFallback />
    </React.Suspense>
  );
}
