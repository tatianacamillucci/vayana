import React, { useState, useEffect } from 'react';
import { Team } from '../lib/db/teams';
import { createProject, updateProject, Project } from '../lib/db/projects';
import { createPhase } from '../lib/db/phases';

interface ProjectFormProps {
  teams: Team[];
  project?: Project | null;
  onSave: (savedProject?: Project) => void;
  onCancel: () => void;
}

export function ProjectForm({ teams, project, onSave, onCancel }: ProjectFormProps): React.ReactElement {
  const [name, setName] = useState(project?.name || '');
  const [description, setDescription] = useState(project?.description || '');
  const [teamId, setTeamId] = useState(project?.teamId || '');
  const [boardMode, setBoardMode] = useState<'phases' | 'sections'>(project?.boardMode || 'phases');
  const [firstPhaseName, setFirstPhaseName] = useState('Backlog');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setTeamId(project.teamId || '');
      setBoardMode(project.boardMode || 'phases');
      setFirstPhaseName('Backlog');
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Il nome del progetto e obbligatorio');
      return;
    }

    setLoading(true);
    try {
      let savedProject: Project | null = null;

      if (project) {
        savedProject = await updateProject(project.id, name.trim(), description.trim() || undefined, boardMode);
      } else {
        const teamIdValue = teamId || undefined;
        const createdProject = await createProject(name.trim(), teamIdValue, description.trim() || undefined, boardMode);
        savedProject = createdProject;

        if (boardMode === 'phases' && firstPhaseName.trim()) {
          await createPhase(firstPhaseName.trim(), createdProject.id);
        }
      }

      onSave(savedProject || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore salvataggio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal task-project-modal">
        <h2>{project ? 'Modifica Progetto' : 'Nuovo Progetto'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="project-name">Nome Progetto</label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome del progetto"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="project-description">Descrizione</label>
            <textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrizione del progetto (opzionale)"
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="project-team">Team (opzionale)</label>
            <select
              id="project-team"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              disabled={loading}
            >
              <option value="">Nessun team assegnato</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="project-board-mode">Modalita Board</label>
            <select
              id="project-board-mode"
              value={boardMode}
              onChange={(e) => setBoardMode(e.target.value as 'phases' | 'sections')}
              disabled={loading}
            >
              <option value="phases">Fasi (colonne basate su fasi)</option>
              <option value="sections">Sezioni (colonne personalizzate)</option>
            </select>
          </div>

          {!project && boardMode === 'phases' && (
            <div className="form-group">
              <label htmlFor="project-first-phase">Prima fase (opzionale)</label>
              <input
                id="project-first-phase"
                type="text"
                value={firstPhaseName}
                onChange={(e) => setFirstPhaseName(e.target.value)}
                placeholder="Backlog"
                disabled={loading}
              />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="button" onClick={onCancel} disabled={loading} className="btn-secondary">
              Annulla
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Salvataggio...' : project ? 'Salva' : 'Crea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
