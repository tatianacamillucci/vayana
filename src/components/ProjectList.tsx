import React from 'react';
import { Project } from '../lib/db/projects';
import { Team } from '../lib/db/teams';

interface ProjectListProps {
  projects: Project[];
  teams: Team[];
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onSelect: (project: Project) => void;
}

export function ProjectList({ projects, teams, onEdit, onDelete, onSelect }: ProjectListProps): React.ReactElement {
  const getTeamName = (teamId: string | null): string => {
    if (!teamId) return 'Nessun team';
    const team = teams.find((t) => t.id === teamId);
    return team?.name || 'Team sconosciuto';
  };

  if (projects.length === 0) {
    return (
      <div className="empty-state">
        <p>Nessun progetto ancora. Crea il primo progetto per iniziare.</p>
      </div>
    );
  }

  return (
    <div className="project-list">
      {projects.map((project) => (
        <div key={project.id} className="project-card" onClick={() => onSelect(project)}>
          <div className="project-info">
            <div className="project-topline">
              <h3>{project.name}</h3>
              <span className="project-mode-pill">{project.boardMode === 'phases' ? 'Fasi' : 'Sezioni'}</span>
            </div>
            {project.description && <p className="project-description">{project.description}</p>}
            <span className="project-team">Team: {getTeamName(project.teamId)}</span>
          </div>
          <div className="project-actions" onClick={(e) => e.stopPropagation()}>
            <button className="edit-btn" onClick={() => onEdit(project)} title="Modifica">
              Modifica
            </button>
            <button className="delete-btn" onClick={() => onDelete(project)} title="Elimina">
              Elimina
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}