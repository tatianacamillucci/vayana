// TeamOverviewPageFallback.tsx — sql.js implementation (used when VITE_USE_BACKEND=false)
import React, { useEffect, useMemo, useState } from 'react';
import { getProjects, Project } from '../lib/db/projects';
import { getPhases, Phase } from '../lib/db/phases';
import { getTasks, Task } from '../lib/db/tasks';
import { getTeams, Team } from '../lib/db/teams';

interface ProjectOverview {
  project: Project;
  teamName: string;
  tasks: Task[];
  completion: number;
  todo: number;
  inProgress: number;
  done: number;
  overdue: number;
}

export function TeamOverviewPageFallback(): React.ReactElement {
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<ProjectOverview | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [teamsData, projectsData, phasesData, tasksData] = await Promise.all([
          getTeams(),
          getProjects(),
          getPhases(),
          getTasks(),
        ]);
        setTeams(teamsData);
        setProjects(projectsData);
        setPhases(phasesData);
        setTasks(tasksData);
      } catch (error) {
        console.error('Failed to load team overview data:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const projectOverview = useMemo(() => {
    const phaseToProject = new Map<string, string>();
    phases.forEach((phase) => phaseToProject.set(phase.id, phase.projectId));

    const tasksByProject = new Map<string, Task[]>();
    tasks.forEach((task) => {
      const projectId = phaseToProject.get(task.phaseId);
      if (!projectId) return;
      const bucket = tasksByProject.get(projectId) || [];
      bucket.push(task);
      tasksByProject.set(projectId, bucket);
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return projects.map((project) => {
      const projectTasks = tasksByProject.get(project.id) || [];
      const todo = projectTasks.filter((task) => task.status === 'todo').length;
      const inProgress = projectTasks.filter((task) => task.status === 'in_progress').length;
      const done = projectTasks.filter((task) => task.status === 'done').length;
      const overdue = projectTasks.filter((task) => {
        if (!task.dueDate || task.status === 'done') return false;
        return task.dueDate < today;
      }).length;
      const completion = projectTasks.length === 0 ? 0 : Math.round((done / projectTasks.length) * 100);
      const teamName = teams.find((team) => team.id === project.teamId)?.name || 'Senza team';

      return {
        project,
        teamName,
        tasks: projectTasks,
        completion,
        todo,
        inProgress,
        done,
        overdue,
      };
    });
  }, [phases, tasks, projects, teams]);

  const visibleOverview = useMemo(() => {
    if (selectedTeamId === 'all') return projectOverview;
    return projectOverview.filter((item) => item.project.teamId === selectedTeamId);
  }, [projectOverview, selectedTeamId]);

  const taskPhaseName = (task: Task): string => {
    const phase = phases.find((item) => item.id === task.phaseId);
    return phase?.name || 'Fase sconosciuta';
  };

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
              key={item.project.id}
              className="card team-overview-card"
              onClick={() => setSelectedProject(item)}
            >
              <div className="team-overview-head">
                <h3>{item.project.name}</h3>
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
                <h2>{selectedProject.project.name}</h2>
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
                        <span>{taskPhaseName(task)}</span>
                        <span className={`status-badge status-${task.status}`}>{task.status}</span>
                        <span>Priorità: {task.priority}</span>
                        <span>Scadenza: {task.dueDate ? task.dueDate.toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                    <div className="project-task-progress">
                      <div className="project-task-progress-track">
                        <div style={{ width: `${task.progress}%` }} />
                      </div>
                      <span>{task.progress}%</span>
                    </div>
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
