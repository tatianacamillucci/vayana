import React, { useState } from 'react';
import { PhaseList } from '../components/PhaseList';
import { TagManager } from '../components/TagManager';
import { SectionManager } from '../components/SectionManager';
import { CustomFieldManager } from '../components/CustomFieldManager';
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  Project as ApiProject,
} from '../lib/hooks/useProjects';
import { useTeams, Team as ApiTeam } from '../lib/hooks/useTeams';

const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';

// ── Unified view types ───────────────────────────────────────────────────────
interface DisplayTeam {
  id: string;
  name: string;
}

interface DisplayProject {
  id: string;
  name: string;
  description?: string | null;
  teamId?: string | null;
  boardMode?: string;
  updatedAt: Date;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _raw?: any;
}

interface DisplayPhase {
  id: string;
  name: string;
  projectId: string;
}

function apiProjectToDisplay(p: ApiProject): DisplayProject {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    teamId: p.teamId,
    boardMode: 'phases',
    updatedAt: new Date(p.updatedAt),
    _raw: p,
  };
}

// ── Backend-powered component ────────────────────────────────────────────────
function ProjectsPageBackend(): React.ReactElement {
  const { data: rawProjects = [], isLoading: projLoading } = useProjects();
  const { data: rawTeams = [], isLoading: teamsLoading } = useTeams();
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  const projects: DisplayProject[] = rawProjects.map(apiProjectToDisplay);
  const teams: DisplayTeam[] = (rawTeams as ApiTeam[]).map((t) => ({ id: t.id, name: t.name }));

  const [selectedProject, setSelectedProject] = useState<DisplayProject | null>(null);
  const [projectPhases] = useState<DisplayPhase[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<DisplayProject | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTeamId, setFormTeamId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showPhases, setShowPhases] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTeamId, setFilterTeamId] = useState<'all' | string>('all');

  const loading = projLoading || teamsLoading;

  const handleCreate = () => {
    setEditingProject(null);
    setFormName('');
    setFormDescription('');
    setFormTeamId('');
    setFormError(null);
    setShowForm(true);
  };

  const handleEdit = (project: DisplayProject) => {
    setEditingProject(project);
    setFormName(project.name ?? '');
    setFormDescription(project.description ?? '');
    setFormTeamId(project.teamId ?? '');
    setFormError(null);
    setShowForm(true);
  };

  const handleDelete = async (project: DisplayProject) => {
    if (!confirm(`Sei sicuro di voler eliminare il progetto "${project.name}"?`)) return;
    try {
      await deleteProjectMutation.mutateAsync(project.id);
    } catch (err) {
      console.error('Failed to delete project:', err);
      alert('Failed to delete project');
    }
  };

  const handleSave = async () => {
    const name = formName.trim();
    if (!name) {
      setFormError('Inserisci un nome progetto.');
      return;
    }
    setFormError(null);
    setIsSaving(true);
    try {
      if (editingProject) {
        const updated = await updateProjectMutation.mutateAsync({
          id: editingProject.id,
          dto: {
            name,
            description: formDescription.trim() || undefined,
            teamId: formTeamId || undefined,
          },
        });
        if (selectedProject?.id === updated.id) {
          setSelectedProject(apiProjectToDisplay(updated));
        }
      } else {
        const created = await createProjectMutation.mutateAsync({
          name,
          description: formDescription.trim() || undefined,
          teamId: formTeamId || undefined,
        });
        const displayCreated = apiProjectToDisplay(created);
        setSelectedProject(displayCreated);
        setShowPhases(true);
      }
      setShowForm(false);
      setEditingProject(null);
    } catch (err) {
      console.error('Failed to save project:', err);
      setFormError('Salvataggio non riuscito. Riprova.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectProject = (project: DisplayProject) => {
    setSelectedProject(project);
    setShowPhases(true);
  };

  const handleBackToList = () => {
    setShowPhases(false);
    setSelectedProject(null);
  };

  const refreshPhases = async () => {
    // PhaseList manages its own data
  };

  const getTeamName = (teamId: string | null | undefined): string => {
    if (!teamId) return 'Il mio spazio di lavoro';
    return teams.find((t) => t.id === teamId)?.name || 'Il mio spazio di lavoro';
  };

  const filteredProjects = projects
    .filter((p) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || getTeamName(p.teamId).toLowerCase().includes(q);
    })
    .filter((p) => (filterTeamId === 'all' ? true : p.teamId === filterTeamId))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Caricamento...</div>
      </div>
    );
  }

  if (showPhases && selectedProject) {
    return (
      <div className="page-container project-detail-page">
        <header className="page-header">
          <button className="btn-secondary" onClick={handleBackToList}>
            &lt; Indietro
          </button>
          <h1>{selectedProject.name}</h1>
        </header>

        {selectedProject.description && <p className="text-secondary mb-3">{selectedProject.description}</p>}

        <div className="card mb-3">
          <PhaseList phases={projectPhases as never} projectId={selectedProject.id} onRefresh={refreshPhases} />
        </div>

        <div className="card mb-3">
          <TagManager projectId={selectedProject.id} />
        </div>

        <div className="card mb-3">
          <SectionManager projectId={selectedProject.id} boardMode="phases" />
        </div>

        <div className="card">
          <CustomFieldManager projectId={selectedProject.id} />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container projects-page">
      <header className="projects-browse-head">
        <h1>Sfoglia i progetti</h1>
        <button className="btn-primary projects-create-btn" onClick={handleCreate}>
          + Crea progetto
        </button>
      </header>

      <section className="projects-browse-shell">
        <div className="projects-browse-controls">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="projects-search"
            placeholder="Cerca un progetto"
          />
          <div className="projects-filter-row">
            <select value={filterTeamId} onChange={(event) => setFilterTeamId(event.target.value)}>
              <option value="all">Team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="projects-table">
          <div className="projects-table-head">
            <div>Nome</div>
            <div>Team</div>
            <div>Ultima modifica</div>
            <div />
          </div>
          <div className="projects-table-body">
            {filteredProjects.length === 0 ? (
              <div className="projects-row-empty">Nessun progetto trovato.</div>
            ) : (
              filteredProjects.map((project) => (
                <button key={project.id} type="button" className="projects-row" onClick={() => handleSelectProject(project)}>
                  <div className="projects-name-cell">
                    <strong>{project.name}</strong>
                  </div>
                  <div>
                    <span className="projects-team-pill">{getTeamName(project.teamId)}</span>
                  </div>
                  <div>{project.updatedAt.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  <div className="projects-row-actions">
                    <span
                      role="button"
                      tabIndex={0}
                      className="edit-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleEdit(project);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          event.stopPropagation();
                          handleEdit(project);
                        }
                      }}
                    >
                      Modifica
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      className="delete-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDelete(project);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          event.stopPropagation();
                          void handleDelete(project);
                        }
                      }}
                    >
                      Elimina
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      {showForm && (
        <div
          className="modal-overlay"
          onClick={() => { if (!isSaving) { setShowForm(false); setEditingProject(null); } }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingProject ? 'Modifica progetto' : 'Nuovo progetto'}</h2>
            <div className="form-row">
              <label>Nome progetto</label>
              <input
                type="text"
                value={formName}
                onChange={(event) => setFormName(event.target.value)}
                placeholder="Es. Lancio Q2"
                autoFocus
              />
            </div>
            <div className="form-row">
              <label>Team</label>
              <select value={formTeamId} onChange={(event) => setFormTeamId(event.target.value)}>
                <option value="">Il mio spazio di lavoro</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Descrizione (opzionale)</label>
              <textarea
                value={formDescription}
                onChange={(event) => setFormDescription(event.target.value)}
                placeholder="Aggiungi una breve descrizione"
                rows={3}
              />
            </div>
            {formError && <div className="form-hint" style={{ color: 'var(--accent-red)' }}>{formError}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                className="btn-secondary"
                onClick={() => { if (!isSaving) { setShowForm(false); setEditingProject(null); } }}
              >
                Chiudi
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Salvataggio...' : 'Salva progetto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Fallback (sql.js) component — lazy loaded only when needed ───────────────
const ProjectsPageFallback = React.lazy(() =>
  import('./ProjectsPageFallback').then((m) => ({ default: m.ProjectsPageFallback }))
);

// ── Public export — picks implementation at runtime ──────────────────────────
export function ProjectsPage(): React.ReactElement {
  if (USE_BACKEND) {
    return <ProjectsPageBackend />;
  }
  return (
    <React.Suspense fallback={<div className="page-container"><div className="loading">Caricamento...</div></div>}>
      <ProjectsPageFallback />
    </React.Suspense>
  );
}
