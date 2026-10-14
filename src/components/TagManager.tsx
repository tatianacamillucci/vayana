import React, { useState, useEffect } from 'react';
import { Tag, createTag, getTagsByProject, updateTag, deleteTag } from '../lib/db/tags';

const TAG_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#6b7280',
];

interface TagManagerProps {
  projectId: string;
}

export function TagManager({ projectId }: TagManagerProps): React.ReactElement {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState(TAG_COLORS[0]);

  useEffect(() => {
    loadTags();
  }, [projectId]);

  const loadTags = async () => {
    setLoading(true);
    try {
      const tagsData = await getTagsByProject(projectId);
      setTags(tagsData);
    } catch (err) {
      console.error('Failed to load tags:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTag(null);
    setTagName('');
    setTagColor(TAG_COLORS[tags.length % TAG_COLORS.length]);
    setShowForm(true);
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagColor(tag.color);
    setShowForm(true);
  };

  const handleDelete = async (tag: Tag) => {
    if (!confirm(`Eliminare il tag "${tag.name}"?`)) {
      return;
    }

    try {
      await deleteTag(tag.id);
      await loadTags();
    } catch (err) {
      console.error('Failed to delete tag:', err);
      alert('Failed to delete tag');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tagName.trim()) {
      return;
    }

    try {
      if (editingTag) {
        await updateTag(editingTag.id, tagName.trim(), tagColor);
      } else {
        await createTag(projectId, tagName.trim(), tagColor);
      }
      setShowForm(false);
      await loadTags();
    } catch (err) {
      console.error('Failed to save tag:', err);
      alert('Failed to save tag');
    }
  };

  if (loading) {
    return <div className="loading">Caricamento tag...</div>;
  }

  return (
    <div className="tag-manager">
      <div className="tag-manager-header">
        <h3>Tag</h3>
        <button className="btn-small" onClick={handleCreate}>
          + Nuovo Tag
        </button>
      </div>

      {tags.length === 0 ? (
        <p className="text-muted">Nessun tag creato. Crea tag per organizzare i task.</p>
      ) : (
        <div className="tag-list">
          {tags.map(tag => (
            <div key={tag.id} className="tag-item">
              <span
                className="tag-chip"
                style={{ backgroundColor: tag.color, color: '#fff' }}
              >
                {tag.name}
              </span>
              <div className="tag-actions">
                <button className="btn-icon" onClick={() => handleEdit(tag)} title="Modifica">
                  ✏️
                </button>
                <button className="btn-icon" onClick={() => handleDelete(tag)} title="Elimina">
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
            <h3>{editingTag ? 'Modifica Tag' : 'Nuovo Tag'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="tag-name">Nome</label>
                <input
                  id="tag-name"
                  type="text"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="Nome tag"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Colore</label>
                <div className="color-picker">
                  {TAG_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`color-option ${tagColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setTagColor(color)}
                    />
                  ))}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowForm(false)}>
                  Annulla
                </button>
                <button type="submit" className="primary">
                  {editingTag ? 'Salva' : 'Crea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
