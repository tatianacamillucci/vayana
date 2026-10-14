import React, { useState, useEffect } from 'react';
import { Story, getStoriesByTask, createStory, updateStory, deleteStory } from '../lib/db/stories';

interface StoryManagerProps {
  taskId: string;
}

export function StoryManager({ taskId }: StoryManagerProps): React.ReactElement {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    loadStories();
  }, [taskId]);

  const loadStories = async () => {
    setLoading(true);
    try {
      const data = await getStoriesByTask(taskId);
      setStories(data);
    } catch (err) {
      console.error('Failed to load stories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await createStory(taskId, 'comment', newComment.trim(), 'User');
      setNewComment('');
      await loadStories();
    } catch (err) {
      console.error('Failed to add comment:', err);
      alert('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (storyId: string) => {
    if (!editContent.trim()) return;

    try {
      await updateStory(storyId, editContent.trim());
      setEditingStoryId(null);
      setEditContent('');
      await loadStories();
    } catch (err) {
      console.error('Failed to edit comment:', err);
      alert('Failed to edit comment');
    }
  };

  const handleDeleteComment = async (storyId: string) => {
    if (!confirm('Eliminare questo commento?')) return;

    try {
      await deleteStory(storyId);
      await loadStories();
    } catch (err) {
      console.error('Failed to delete comment:', err);
      alert('Failed to delete comment');
    }
  };

  const startEdit = (story: Story) => {
    setEditingStoryId(story.id);
    setEditContent(story.content);
  };

  const cancelEdit = () => {
    setEditingStoryId(null);
    setEditContent('');
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSystemMessage = (content: string): string => {
    if (content.includes('created')) return 'ha creato questo task';
    if (content.includes('status')) return 'ha cambiato lo stato';
    if (content.includes('priority')) return 'ha cambiato la priorità';
    if (content.includes('progress')) return 'ha aggiornato il progresso';
    if (content.includes('description')) return 'ha aggiornato la descrizione';
    return content;
  };

  if (loading) {
    return <div className="loading">Caricamento...</div>;
  }

  return (
    <div className="story-manager">
      <h4>Attività</h4>

      <div className="comment-input">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Aggiungi un commento..."
          rows={2}
        />
        <button
          onClick={handleAddComment}
          disabled={submitting || !newComment.trim()}
          className="btn-primary"
        >
          {submitting ? 'Inviando...' : 'Invia'}
        </button>
      </div>

      {stories.length === 0 ? (
        <p className="text-muted mt-2">Nessuna attività.</p>
      ) : (
        <div className="stories-list">
          {stories.map(story => (
            <div key={story.id} className={`story-item ${story.type === 'system' ? 'story-system' : 'story-comment'}`}>
              <div className="story-header">
                <span className="story-author">
                  {story.type === 'system' ? '🔄 Sistema' : '👤 ' + story.author}
                </span>
                <span className="story-date">{formatDate(story.createdAt)}</span>
              </div>
              
              {editingStoryId === story.id ? (
                <div className="story-edit">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={2}
                  />
                  <div className="story-edit-actions">
                    <button onClick={cancelEdit} className="btn-secondary">Annulla</button>
                    <button onClick={() => handleEditComment(story.id)} className="btn-primary">Salva</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="story-content">
                    {story.type === 'system' ? getSystemMessage(story.content) : story.content}
                  </div>
                  {story.type === 'comment' && (
                    <div className="story-actions">
                      <button onClick={() => startEdit(story)} className="btn-link">Modifica</button>
                      <button onClick={() => handleDeleteComment(story.id)} className="btn-link btn-danger-text">Elimina</button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
