import React, { useState, useEffect } from 'react';
import { Task, getTasksByProjectId, updateTask, getTaskById } from '../lib/db/tasks';
import { addSubtask, removeSubtask, getSubtasksByParent } from '../lib/db/subtasks';
import { addDependency, removeDependency, getBlockingTasks, getBlockedByTasks } from '../lib/db/taskDependencies';

interface SubtaskManagerProps {
  taskId: string;
  projectId: string;
}

export function SubtaskManager({ taskId, projectId }: SubtaskManagerProps): React.ReactElement {
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState('');

  useEffect(() => {
    loadData();
  }, [taskId, projectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const ids = await getSubtasksByParent(taskId);

      const tasks: Task[] = [];
      for (const id of ids) {
        const task = await getTaskById(id);
        if (task) tasks.push(task);
      }
      setSubtasks(tasks);

      const allProjectTasks = await getTasksByProjectId(projectId);
      const filtered = allProjectTasks.filter(t => t.id !== taskId && !ids.includes(t.id));
      setAvailableTasks(filtered);
    } catch (err) {
      console.error('Failed to load subtasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubtask = async () => {
    if (!selectedTaskId) return;

    try {
      await addSubtask(taskId, selectedTaskId);
      if (newSubtaskDueDate) {
        await updateTask(selectedTaskId, { dueDate: new Date(newSubtaskDueDate) });
      }
      setShowAdd(false);
      setSelectedTaskId('');
      setNewSubtaskDueDate('');
      await loadData();
    } catch (err) {
      console.error('Failed to add subtask:', err);
      alert('Failed to add subtask');
    }
  };

  const handleRemoveSubtask = async (childTaskId: string) => {
    if (!confirm('Rimuovere questo subtask?')) return;

    try {
      const allSubtasks = await getSubtasksByParent(taskId);
      const subtask = allSubtasks.find(id => id === childTaskId);
      if (subtask) {
        await removeSubtask(childTaskId);
      }
      await loadData();
    } catch (err) {
      console.error('Failed to remove subtask:', err);
      alert('Failed to remove subtask');
    }
  };

  const handleToggleSubtaskStatus = async (subtask: Task) => {
    const newStatus = subtask.status === 'done' ? 'todo' : 'done';
    const newProgress = newStatus === 'done' ? 100 : 0;
    await updateTask(subtask.id, { status: newStatus, progress: newProgress });
    await loadData();
    await updateParentProgress();
  };

  const updateParentProgress = async () => {
    const childIds = await getSubtasksByParent(taskId);
    if (childIds.length === 0) return;

    let doneCount = 0;
    for (const id of childIds) {
      const task = await getTaskById(id);
      if (task?.status === 'done') doneCount++;
    }

    const progress = Math.round((doneCount / childIds.length) * 100);
    await updateTask(taskId, { progress });
  };

  if (loading) {
    return <div className="loading">Caricamento...</div>;
  }

  return (
    <div className="subtask-manager">
      <div className="subtask-header">
        <h4>Subtasks ({subtasks.length})</h4>
        <button className="btn-small" onClick={() => setShowAdd(true)}>
          + Aggiungi
        </button>
      </div>

      {subtasks.length === 0 ? (
        <p className="text-muted">Nessun subtask. Aggiungi task esistenti come subtasks.</p>
      ) : (
        <div className="subtask-list">
          {subtasks.map(subtask => (
            <div key={subtask.id} className="subtask-item">
              <input
                type="checkbox"
                checked={subtask.status === 'done'}
                onChange={() => handleToggleSubtaskStatus(subtask)}
              />
              <span className={subtask.status === 'done' ? 'completed' : ''}>
                {subtask.title}
              </span>
              <button
                className="btn-icon"
                onClick={() => handleRemoveSubtask(subtask.id)}
                title="Rimuovi"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay">
          <div className="modal modal-small">
            <h3>Aggiungi Subtask</h3>
            <div className="form-group">
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
              >
                <option value="">Seleziona task...</option>
                {availableTasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Scadenza</label>
              <input
                type="date"
                value={newSubtaskDueDate}
                onChange={(e) => setNewSubtaskDueDate(e.target.value)}
              />
            </div>
            <div className="form-actions">
              <button
                onClick={() => {
                  setShowAdd(false);
                  setSelectedTaskId('');
                  setNewSubtaskDueDate('');
                }}
              >
                Annulla
              </button>
              <button className="primary" onClick={handleAddSubtask} disabled={!selectedTaskId}>
                Aggiungi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface DependencyManagerProps {
  taskId: string;
  projectId: string;
}

export function DependencyManager({ taskId, projectId }: DependencyManagerProps): React.ReactElement {
  const [blockingTasks, setBlockingTasks] = useState<Task[]>([]);
  const [blockedByTasks, setBlockedByTasks] = useState<Task[]>([]);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [dependencyType, setDependencyType] = useState<'blocks' | 'is_blocked_by'>('blocks');

  useEffect(() => {
    loadData();
  }, [taskId, projectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const blocking = await getBlockingTasks(taskId);
      const blockedBy = await getBlockedByTasks(taskId);

      const blockingTasksData: Task[] = [];
      for (const id of blocking) {
        const task = await getTaskById(id);
        if (task) blockingTasksData.push(task);
      }
      setBlockingTasks(blockingTasksData);

      const blockedByTasksData: Task[] = [];
      for (const id of blockedBy) {
        const task = await getTaskById(id);
        if (task) blockedByTasksData.push(task);
      }
      setBlockedByTasks(blockedByTasksData);

      const allProjectTasks = await getTasksByProjectId(projectId);
      const currentTaskIds = [taskId, ...blocking, ...blockedBy];
      const filtered = allProjectTasks.filter(t => !currentTaskIds.includes(t.id));
      setAvailableTasks(filtered);
    } catch (err) {
      console.error('Failed to load dependencies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDependency = async () => {
    if (!selectedTaskId) return;

    try {
      await addDependency(taskId, selectedTaskId, dependencyType);
      setShowAdd(false);
      setSelectedTaskId('');
      await loadData();
    } catch (err) {
      console.error('Failed to add dependency:', err);
      alert('Failed to add dependency');
    }
  };

  const handleRemoveDependency = async (depTaskId: string, type: 'blocks' | 'is_blocked_by') => {
    try {
      if (type === 'blocks') {
        await removeDependency(taskId, depTaskId);
      } else {
        await removeDependency(depTaskId, taskId);
        await removeDependency(taskId, depTaskId);
      }
      await loadData();
    } catch (err) {
      console.error('Failed to remove dependency:', err);
      alert('Failed to remove dependency');
    }
  };

  if (loading) {
    return <div className="loading">Caricamento...</div>;
  }

  return (
    <div className="dependency-manager">
      <div className="dependency-header">
        <h4>Dipendenze</h4>
        <button className="btn-small" onClick={() => setShowAdd(true)}>
          + Aggiungi
        </button>
      </div>

      <div className="dependency-section">
        <h5>Blocca ({blockingTasks.length})</h5>
        {blockingTasks.length === 0 ? (
          <p className="text-muted">Nessun task bloccato.</p>
        ) : (
          <div className="dependency-list">
            {blockingTasks.map(t => (
              <div key={t.id} className="dependency-item">
                <span>🔒 {t.title}</span>
                <button className="btn-icon" onClick={() => handleRemoveDependency(t.id, 'blocks')}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dependency-section">
        <h5>Bloccato da ({blockedByTasks.length})</h5>
        {blockedByTasks.length === 0 ? (
          <p className="text-muted">Nessun task che blocca.</p>
        ) : (
          <div className="dependency-list">
            {blockedByTasks.map(t => (
              <div key={t.id} className="dependency-item">
                <span>🚫 {t.title}</span>
                <button className="btn-icon" onClick={() => handleRemoveDependency(t.id, 'is_blocked_by')}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="modal-overlay">
          <div className="modal modal-small">
            <h3>Aggiungi Dipendenza</h3>
            <div className="form-group">
              <label>Tipo</label>
              <select value={dependencyType} onChange={(e) => setDependencyType(e.target.value as 'blocks' | 'is_blocked_by')}>
                <option value="blocks">Questo task blocca</option>
                <option value="is_blocked_by">Questo task è bloccato da</option>
              </select>
            </div>
            <div className="form-group">
              <label>Task</label>
              <select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)}>
                <option value="">Seleziona task...</option>
                {availableTasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
            <div className="form-actions">
              <button onClick={() => setShowAdd(false)}>Annulla</button>
              <button className="primary" onClick={handleAddDependency} disabled={!selectedTaskId}>
                Aggiungi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
