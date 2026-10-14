import React, { useState, useEffect } from 'react';
import { Portfolio, createPortfolio, getPortfolios, deletePortfolio, addProjectToPortfolio, removeProjectFromPortfolio, getProjectsByPortfolio } from '../lib/db/portfolios';
import { Project, getProjects } from '../lib/db/projects';

export function PortfoliosPage(): React.ReactElement {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [portfolioProjects, setPortfolioProjects] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [portfoliosData, projectsData] = await Promise.all([
        getPortfolios(),
        getProjects(),
      ]);
      setPortfolios(portfoliosData);
      setProjects(projectsData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createPortfolio(newName.trim(), newDescription.trim() || undefined);
      setNewName('');
      setNewDescription('');
      setShowForm(false);
      await loadData();
    } catch (err) {
      console.error('Failed to create portfolio:', err);
      alert('Failed to create portfolio');
    }
  };

  const handleDelete = async (portfolio: Portfolio) => {
    if (!confirm(`Eliminare il portfolio "${portfolio.name}"?`)) return;
    try {
      await deletePortfolio(portfolio.id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete portfolio:', err);
    }
  };

  const handleSelectPortfolio = async (portfolio: Portfolio) => {
    setSelectedPortfolio(portfolio);
    const pProjects = await getProjectsByPortfolio(portfolio.id);
    setPortfolioProjects(pProjects);
  };

  const handleAddProject = async (projectId: string) => {
    if (!selectedPortfolio) return;
    await addProjectToPortfolio(selectedPortfolio.id, projectId);
    setPortfolioProjects([...portfolioProjects, projectId]);
  };

  const handleRemoveProject = async (projectId: string) => {
    if (!selectedPortfolio) return;
    await removeProjectFromPortfolio(selectedPortfolio.id, projectId);
    setPortfolioProjects(portfolioProjects.filter(id => id !== projectId));
  };

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'Unknown';

  if (loading) {
    return <div className="page-container"><div className="loading">Caricamento...</div></div>;
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Portfolio</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + Nuovo Portfolio
        </button>
      </header>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Nuovo Portfolio</h2>
            <div className="form-group">
              <label>Nome</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome portfolio"
              />
            </div>
            <div className="form-group">
              <label>Descrizione</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Descrizione (opzionale)"
                rows={3}
              />
            </div>
            <div className="form-actions">
              <button onClick={() => setShowForm(false)}>Annulla</button>
              <button className="primary" onClick={handleCreate}>Crea</button>
            </div>
          </div>
        </div>
      )}

      {portfolios.length === 0 ? (
        <div className="empty-state">
          <p>Nessun portfolio. Crea un portfolio per raggruppare progetti correlati.</p>
        </div>
      ) : (
        <div className="grid-2">
          <div className="card">
            <h3 className="section-title">Portfolio</h3>
            {portfolios.map(portfolio => (
              <div
                key={portfolio.id}
                className={`list-item ${selectedPortfolio?.id === portfolio.id ? 'active' : ''}`}
                onClick={() => handleSelectPortfolio(portfolio)}
                style={{ cursor: 'pointer' }}
              >
                <div>
                  <div className="list-item-title">{portfolio.name}</div>
                  {portfolio.description && (
                    <div className="list-item-meta">{portfolio.description}</div>
                  )}
                </div>
                <button
                  className="btn-icon"
                  onClick={(e) => { e.stopPropagation(); handleDelete(portfolio); }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          {selectedPortfolio && (
            <div className="card">
              <h3 className="section-title">Progetti in "{selectedPortfolio.name}"</h3>
              <div className="form-group">
                <select onChange={(e) => e.target.value && handleAddProject(e.target.value)} value="">
                  <option value="">Aggiungi progetto...</option>
                  {projects
                    .filter(p => !portfolioProjects.includes(p.id))
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
              </div>
              {portfolioProjects.length === 0 ? (
                <p className="text-muted">Nessun progetto nel portfolio.</p>
              ) : (
                portfolioProjects.map(projectId => (
                  <div key={projectId} className="list-item">
                    <span>{getProjectName(projectId)}</span>
                    <button className="btn-icon" onClick={() => handleRemoveProject(projectId)}>✕</button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
