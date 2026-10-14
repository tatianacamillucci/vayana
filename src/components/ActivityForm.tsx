import React, { useState, useEffect } from 'react';
import { Task, createTask, updateTask, TaskStatus } from '../lib/db/tasks';
import { Phase } from '../lib/db/phases';
import { Project } from '../lib/db/projects';
import { Team } from '../lib/db/teams';

interface ActivityFormProps {
  task: Task | null;
  teams: Team[];
  projects: Project[];
  phases: Phase[];
  tasks: Task[];
  onSave: () => void;
  onCancel: () => void;
}

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface Comment {
  id: string;
  text: string;
  createdAt: Date;
  author: string;
}

export function ActivityForm({ task, teams, projects, phases, tasks, onSave, onCancel }: ActivityFormProps): React.ReactElement {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id || '');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedPhaseId, setSelectedPhaseId] = useState('');
  const [dueDate, setDueDate] = useState(task?.dueDate ? task.dueDate.toISOString().split('T')[0] : '');
  const [status, setStatus] = useState<TaskStatus>(task?.status || 'todo');
  const [priority, setPriority] = useState(task?.priority || 'medium');
  const [progress, setProgress] = useState(task?.progress || 0);
  const [dependencyIds, setDependencyIds] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setDueDate(task.dueDate ? task.dueDate.toISOString().split('T')[0] : '');
      setStatus(task.status);
      setPriority(task.priority);
      setProgress(task.progress);
    }
  }, [task]);

  useEffect(() => {
    if (selectedProjectId) {
      const projectPhases = phases.filter(p => p.projectId === selectedProjectId);
      if (projectPhases.length > 0) {
        setSelectedPhaseId(projectPhases[0].id);
      }
    }
  }, [selectedProjectId, phases]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Titolo obbligatorio');
      return;
    }

    if (!selectedPhaseId) {
      setError('Seleziona una fase');
      return;
    }

    setLoading(true);
    try {
      const dueDateObj = dueDate ? new Date(dueDate) : undefined;
      
      if (task) {
        await updateTask(task.id, {
          title: title.trim(),
          description: description.trim() || null,
          status,
          priority,
          dueDate: dueDateObj || null,
          progress,
        });
      } else {
        await createTask(
          selectedPhaseId,
          title.trim(),
          description.trim() || undefined,
          status,
          priority,
          dueDateObj,
          progress
        );
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore salvataggio');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    setStatus(newStatus);
    if (newStatus === 'done') {
      setProgress(100);
    }
  };

  const addSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks([...subtasks, {
      id: Date.now().toString(),
      title: newSubtaskTitle.trim(),
      completed: false
    }]);
    setNewSubtaskTitle('');
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter(s => s.id !== id));
  };

  const toggleSubtask = (id: string) => {
    setSubtasks(subtasks.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  };

  const addComment = () => {
    if (!newComment.trim()) return;
    setComments([...comments, {
      id: Date.now().toString(),
      text: newComment.trim(),
      createdAt: new Date(),
      author: teams.find(t => t.id === selectedTeamId)?.name || 'Utente'
    }]);
    setNewComment('');
  };

  const projectPhases = selectedProjectId 
    ? phases.filter(p => p.projectId === selectedProjectId)
    : [];

  const availableTasks = tasks.filter(t => t.id !== task?.id);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal-large task-project-modal" onClick={e => e.stopPropagation()}>
        <h2>{task ? 'Modifica Attività' : 'Nuova Attività'}</h2>
        
        <div className="activity-tabs">
          <button 
            className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Dettagli
          </button>
          <button 
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Storico
          </button>
        </div>

        {activeTab === 'details' && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Titolo</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titolo dell'attività"
                disabled={loading}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Team</label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Seleziona team</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Progetto</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Seleziona progetto</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Fase</label>
                <select
                  value={selectedPhaseId}
                  onChange={(e) => setSelectedPhaseId(e.target.value)}
                  disabled={loading || projectPhases.length === 0}
                >
                  <option value="">Seleziona fase</option>
                  {projectPhases.map(phase => (
                    <option key={phase.id} value={phase.id}>{phase.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Data di Scadenza</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Dipendenze</label>
              <select
                multiple
                value={dependencyIds}
                onChange={(e) => setDependencyIds(Array.from(e.target.selectedOptions, opt => opt.value))}
                disabled={loading}
                className="multi-select"
              >
                {availableTasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Descrizione</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrizione dell'attività"
                disabled={loading}
                rows={3}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Stato</label>
                <select
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                  disabled={loading}
                >
                  <option value="todo">Da fare</option>
                  <option value="in_progress">In corso</option>
                  <option value="done">Completata</option>
                </select>
              </div>

              <div className="form-group">
                <label>Priorità</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  disabled={loading}
                >
                  <option value="low">Bassa</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Progresso: {progress}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(parseInt(e.target.value, 10))}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Sottoattività</label>
              <div className="subtask-input">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Aggiungi sottoattività"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubtask())}
                />
                <button type="button" onClick={addSubtask}>+</button>
              </div>
              {subtasks.length > 0 && (
                <div className="subtask-list">
                  {subtasks.map(subtask => (
                    <div key={subtask.id} className="subtask-item">
                      <input
                        type="checkbox"
                        checked={subtask.completed}
                        onChange={() => toggleSubtask(subtask.id)}
                      />
                      <span className={subtask.completed ? 'completed' : ''}>{subtask.title}</span>
                      <button type="button" onClick={() => removeSubtask(subtask.id)} className="btn-icon">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="form-actions">
              <button type="button" onClick={onCancel} disabled={loading} className="btn-secondary">
                Abbandona
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Salvataggio...' : task ? 'Salva' : 'Crea'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'history' && (
          <div className="history-tab">
            <div className="form-group">
              <label>Aggiungi Commento</label>
              <div className="comment-input">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Scrivi un commento..."
                  rows={2}
                />
                <button type="button" onClick={addComment} className="btn-primary">Invia</button>
              </div>
            </div>

            <div className="comments-list">
              {comments.length === 0 ? (
                <p className="text-muted">Nessun commento ancora</p>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-header">
                      <span className="comment-author">{comment.author}</span>
                      <span className="comment-date">{comment.createdAt.toLocaleString()}</span>
                    </div>
                    <p className="comment-text">{comment.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
