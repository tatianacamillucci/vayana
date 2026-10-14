// ProjectsPageFallback.tsx — sql.js implementation (used when VITE_USE_BACKEND=false)
import React, { useState, useEffect } from 'react';
import { getTeams, Team } from '../lib/db/teams';
import { getProjects, getProjectById, deleteProject, Project } from '../lib/db/projects';
import { getPhasesByProjectId, Phase } from '../lib/db/phases';
import { TeamMember, getAllTeamMembers } from '../lib/db/teamMembers';
import { ProjectForm } from '../components/ProjectForm';
import { PhaseList } from '../components/PhaseList';
import { TagManager } from '../components/TagManager';
import { SectionManager } from '../components/SectionManager';
import { CustomFieldManager } from '../components/CustomFieldManager';

export function ProjectsPageFallback(): React.ReactElement {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectPhases, setProjectPhases] = useState<Phase[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPhases, setShowPhases] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTeamId, setFilterTeamId] = useState<'all' | string>('all');
  const [filterMode, setFilterMode] = useState<'all' | 'phases' | 'sections'>('all');
  const [filterMembers, setFilterMembers] = useState<'all' | 'with' | 'without'>('all');

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [teamsData, projectsData, membersData] = await Promise.all([getTeams(), getProjects(), getAllTeamMembers()]);
      setTeams(teamsData);
      setProjects(projectsData);
      setTeamMembers(membersData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingProject(null);
    setShowForm(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setShowForm(true);
  };

  const handleDelete = async (project: Project) => {
    const message = `Sei sicuro di voler eliminare il progetto "${project.name}"?`;
    if (!confirm(message)) return;

    try {
      await deleteProject(project.id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete project:', err);
      alert('Failed to delete project');
    }
  };

  const handleSave = async (savedProject?: Project) => {
    const createdProject = !editingProject ? savedProject : undefined;
    setShowForm(false);
    setEditingProject(null);
    await loadData();
    if (createdProject) {
      await handleSelectProject(createdProject);
    }
  };

  const handleSelectProject = async (project: Project) => {
    try {
      const fullProject = await getProjectById(project.id);
      if (fullProject) {
        setSelectedProject(fullProject);
        const phases = await getPhasesByProjectId(project.id);
        setProjectPhases(phases);
        setShowPhases(true);
      }
    } catch (err) {
      console.error('Failed to load project:', err);
    }
  };

  const handleBackToList = () => {
    setShowPhases(false);
    setSelectedProject(null);
    setProjectPhases([]);
  };

  const refreshPhases = async () => {
    if (selectedProject) {
      const phases = await getPhasesByProjectId(selectedProject.id);
      setProjectPhases(phases);
    }
  };

  const getTeamName = (teamId: string | null): string => {
    if (!teamId) return 'Il mio spazio di lavoro';
    return teams.find((team) => team.id === teamId)?.name || 'Il mio spazio di lavoro';
  };

  const getProjectTeamMembers = (project: Project): TeamMember[] => {
    if (!project.teamId) return [];
    return teamMembers.filter((member) => member.teamId === project.teamId);
  };

  const filteredProjects = projects
    .filter((project) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const members = getProjectTeamMembers(project);
      return (
        project.name.toLowerCase().includes(q) ||
        getTeamName(project.teamId).toLowerCase().includes(q) ||
        members.some((member) => member.fullName.toLowerCase().includes(q))
      );
    })
    .filter((project) => (filterTeamId === 'all' ? true : project.teamId === filterTeamId))
    .filter((project) => (filterMode === 'all' ? true : project.boardMode === filterMode))
    .filter((project) => {
      if (filterMembers === 'all') return true;
      const hasMembers = getProjectTeamMembers(project).length > 0;
      return filterMembers === 'with' ? hasMembers : !hasMembers;
    })
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

        {selectedProject.boardMode === 'phases' && (
          <div className="card mb-3">
            <PhaseList phases={projectPhases} projectId={selectedProject.id} onRefresh={refreshPhases} />
          </div>
        )}

        <div className="card mb-3">
          <TagManager projectId={selectedProject.id} />
        </div>

        <div className="card mb-3">
          <SectionManager projectId={selectedProject.id} boardMode={selectedProject.boardMode} />
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
            <select value={filterMembers} onChange={(event) => setFilterMembers(event.target.value as 'all' | 'with' | 'without')}>
              <option value="all">Membri</option>
              <option value="with">Con membri</option>
              <option value="without">Senza membri</option>
            </select>
            <select value={filterMode} onChange={(event) => setFilterMode(event.target.value as 'all' | 'phases' | 'sections')}>
              <option value="all">Stato</option>
              <option value="phases">Fasi</option>
              <option value="sections">Sezioni</option>
            </select>
          </div>
        </div>

        <div className="projects-table">
          <div className="projects-table-head">
            <div>Nome</div>
            <div>Membri team</div>
            <div>Team</div>
            <div>Ultima modifica</div>
            <div />
          </div>
          <div className="projects-table-body">
            {filteredProjects.length === 0 ? (
              <div className="projects-row-empty">Nessun progetto trovato.</div>
            ) : (
              filteredProjects.map((project) => {
                const members = getProjectTeamMembers(project);
                return (
                  <button key={project.id} type="button" className="projects-row" onClick={() => void handleSelectProject(project)}>
                    <div className="projects-name-cell">
                      <strong>{project.name}</strong>
                    </div>
                    <div className="projects-members-cell" title={members.map((m) => m.fullName).join(', ')}>
                      {members.length === 0 ? (
                        <span className="text-muted">-</span>
                      ) : (
                        <>
                          {members.slice(0, 3).map((member) => (
                            <span key={`${project.id}-${member.id}`} className="projects-member-pill">
                              {member.fullName}
                            </span>
                          ))}
                          {members.length > 3 && <span className="projects-member-pill projects-member-more">+{members.length - 3}</span>}
                        </>
                      )}
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
                );
              })
            )}
          </div>
        </div>
      </section>

      {showForm && (
        <ProjectForm
          teams={teams}
          project={editingProject}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingProject(null);
          }}
        />
      )}
    </div>
  );
}
