import React, { useState, useEffect } from 'react';
import { Section, getSectionsByProject, createSection, updateSection, deleteSection, reorderSections } from '../lib/db/sections';

interface SectionManagerProps {
  projectId: string;
  boardMode: 'phases' | 'sections';
}

export function SectionManager({ projectId, boardMode }: SectionManagerProps): React.ReactElement {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [sectionName, setSectionName] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    if (boardMode === 'sections') {
      loadSections();
    }
  }, [projectId, boardMode]);

  const loadSections = async () => {
    setLoading(true);
    try {
      const data = await getSectionsByProject(projectId);
      setSections(data);
    } catch (err) {
      console.error('Failed to load sections:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingSection(null);
    setSectionName('');
    setShowForm(true);
  };

  const handleEdit = (section: Section) => {
    setEditingSection(section);
    setSectionName(section.name);
    setShowForm(true);
  };

  const handleDelete = async (section: Section) => {
    if (!confirm(`Eliminare la sezione "${section.name}"? I task verranno spostati senza sezione.`)) {
      return;
    }

    try {
      await deleteSection(section.id);
      await loadSections();
    } catch (err) {
      console.error('Failed to delete section:', err);
      alert('Failed to delete section');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionName.trim()) return;

    try {
      if (editingSection) {
        await updateSection(editingSection.id, sectionName.trim());
      } else {
        await createSection(projectId, sectionName.trim());
      }
      setShowForm(false);
      await loadSections();
    } catch (err) {
      console.error('Failed to save section:', err);
      alert('Failed to save section');
    }
  };

  const handleDragStart = (e: React.DragEvent, sectionId: string) => {
    setDraggedId(sectionId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetSectionId) return;

    const newOrder = [...sections];
    const draggedIndex = newOrder.findIndex(s => s.id === draggedId);
    const targetIndex = newOrder.findIndex(s => s.id === targetSectionId);

    const [dragged] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, dragged);

    try {
      await reorderSections(projectId, newOrder.map(s => s.id));
      await loadSections();
    } catch (err) {
      console.error('Failed to reorder sections:', err);
    }

    setDraggedId(null);
  };

  if (boardMode !== 'sections') {
    return <></>;
  }

  if (loading) {
    return <div className="loading">Caricamento...</div>;
  }

  return (
    <div className="section-manager">
      <div className="section-manager-header">
        <h4>Sezioni ({sections.length})</h4>
        <button className="btn-small" onClick={handleCreate}>
          + Nuova Sezione
        </button>
      </div>

      {sections.length === 0 ? (
        <p className="text-muted">Nessuna sezione. Crea sezioni per organizzare le colonne della board.</p>
      ) : (
        <div className="section-list">
          {sections.map((section) => (
            <div
              key={section.id}
              className="section-item"
              draggable
              onDragStart={(e) => handleDragStart(e, section.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, section.id)}
            >
              <span className="section-drag-handle">☰</span>
              <span className="section-name">{section.name}</span>
              <div className="section-actions">
                <button className="btn-icon" onClick={() => handleEdit(section)} title="Modifica">
                  ✏️
                </button>
                <button className="btn-icon" onClick={() => handleDelete(section)} title="Elimina">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal modal-small">
            <h3>{editingSection ? 'Modifica Sezione' : 'Nuova Sezione'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="section-name">Nome</label>
                <input
                  id="section-name"
                  type="text"
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  placeholder="Nome sezione"
                  autoFocus
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowForm(false)}>
                  Annulla
                </button>
                <button type="submit" className="primary">
                  {editingSection ? 'Salva' : 'Crea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
