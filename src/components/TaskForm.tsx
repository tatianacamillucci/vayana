import React, { useState, useEffect } from 'react';
import { Phase, createPhase } from '../lib/db/phases';
import { createTask, updateTask, Task, TaskStatus, TaskPriority, getTasksByProjectId } from '../lib/db/tasks';
import { Tag } from '../lib/db/tags';
import { TagSelector } from './TagSelector';
import { AttachmentManager } from './AttachmentManager';
import { StoryManager } from './StoryManager';
import { SubtaskManager, DependencyManager } from './SubtaskManager';
import { FollowerManager } from './FollowerManager';
import { getTagsByTask, addTagToTask, removeAllTagsFromTask } from '../lib/db/taskTags';
import { getBlockedByTasks, setBlockedByTasks } from '../lib/db/taskDependencies';

interface TaskFormProps {
  phases: Phase[];
  task?: Task | null;
  tags?: Tag[];
  projectId?: string;
  boardMode?: 'phases' | 'sections';
  onSave: () => void;
  onCancel: () => void;
}

export function TaskForm({ phases, task, tags = [], projectId, boardMode = 'phases', onSave, onCancel }: TaskFormProps): React.ReactElement {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [phaseId, setPhaseId] = useState(task?.phaseId || '');
  const [status, setStatus] = useState<TaskStatus>(task?.status || 'todo');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'medium');
  const [dueDate, setDueDate] = useState(task?.dueDate ? task.dueDate.toISOString().split('T')[0] : '');
  const [progress, setProgress] = useState(task?.progress || 0);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [availableDependencyTasks, setAvailableDependencyTasks] = useState<Task[]>([]);
  const [selectedDependencyIds, setSelectedDependencyIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPhaseId(task.phaseId || '');
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(task.dueDate ? task.dueDate.toISOString().split('T')[0] : '');
      setProgress(task.progress);
      loadTaskTags(task.id);
      loadTaskDependencies(task.id);
    }
  }, [task]);

  useEffect(() => {
    void loadAvailableDependencyTasks();
  }, [projectId, task?.id]);

  const loadTaskTags = async (taskId: string) => {
    try {
      const tagIds = await getTagsByTask(taskId);
      setSelectedTagIds(tagIds);
    } catch (err) {
      console.error('Failed to load task tags:', err);
    }
  };

  const loadTaskDependencies = async (taskId: string) => {
    try {
      const blockedByIds = await getBlockedByTasks(taskId);
      setSelectedDependencyIds(blockedByIds);
    } catch (err) {
      console.error('Failed to load task dependencies:', err);
    }
  };

  const loadAvailableDependencyTasks = async () => {
    if (!projectId) {
      setAvailableDependencyTasks([]);
      return;
    }

    try {
      const projectTasks = await getTasksByProjectId(projectId);
      const filtered = projectTasks.filter((item) => item.id !== task?.id);
      setAvailableDependencyTasks(filtered);
    } catch (err) {
      console.error('Failed to load project tasks for dependencies:', err);
      setAvailableDependencyTasks([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    if (!phaseId && projectId && boardMode === 'phases') {
      setError('Per favore seleziona una fase');
      return;
    }

    let finalPhaseId = phaseId;
    if (!finalPhaseId && boardMode === 'sections' && projectId) {
      const defaultPhase = await createPhase(projectId, 'Primo Task');
      finalPhaseId = defaultPhase.id;
    }

    if (!finalPhaseId && projectId) {
      setError('Per favore seleziona una fase');
      return;
    }

    setLoading(true);
    try {
      const dueDateObj = dueDate ? new Date(dueDate) : undefined;
      
      if (task) {
        await updateTask(task.id, {
          phaseId: finalPhaseId || null,
          title: title.trim(),
          description: description.trim() || null,
          status,
          priority,
          dueDate: dueDateObj || null,
          progress,
        });
        await saveTaskTags(task.id);
        await saveTaskDependencies(task.id);
      } else {
        const newTask = await createTask(
          finalPhaseId || null,
          title.trim(),
          description.trim() || undefined,
          status,
          priority,
          dueDateObj,
          progress
        );
        await saveTaskTags(newTask.id);
        await saveTaskDependencies(newTask.id);
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  const saveTaskTags = async (taskId: string) => {
    try {
      await removeAllTagsFromTask(taskId);
      for (const tagId of selectedTagIds) {
        await addTagToTask(taskId, tagId);
      }
    } catch (err) {
      console.error('Failed to save task tags:', err);
    }
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    setStatus(newStatus);
    if (newStatus === 'done') {
      setProgress(100);
    }
  };

  const saveTaskDependencies = async (taskId: string) => {
    try {
      await setBlockedByTasks(taskId, selectedDependencyIds);
    } catch (err) {
      console.error('Failed to save task dependencies:', err);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal task-project-modal">
        <h2>{task ? 'Edit Task' : 'New Task'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="task-title">Title</label>
            <input
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="task-description">Description</label>
            <textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description (optional)"
              disabled={loading}
              rows={3}
            />
          </div>

          {tags.length > 0 && (
            <div className="form-group">
              <label>Tags</label>
              <TagSelector
                tags={tags}
                selectedTagIds={selectedTagIds}
                onChange={setSelectedTagIds}
              />
            </div>
          )}

          {projectId && (
            <div className="form-group">
              <label htmlFor="task-dependencies">Dipende da</label>
              <select
                id="task-dependencies"
                className="multi-select"
                multiple
                value={selectedDependencyIds}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions).map((opt) => opt.value);
                  setSelectedDependencyIds(values);
                }}
                disabled={loading || availableDependencyTasks.length === 0}
              >
                {availableDependencyTasks.map((depTask) => (
                  <option key={depTask.id} value={depTask.id}>
                    {depTask.title}
                  </option>
                ))}
              </select>
              <small className="text-muted">
                Seleziona i task che devono essere completati prima di questo.
              </small>
            </div>
          )}

          {task && (
            <div className="form-group">
              <AttachmentManager taskId={task.id} />
            </div>
          )}

          {task && (
            <div className="form-group">
              <StoryManager taskId={task.id} />
            </div>
          )}

          {task && (
            <div className="form-group">
              <FollowerManager taskId={task.id} />
            </div>
          )}

          {task && projectId && (
            <>
              <div className="form-group">
                <SubtaskManager taskId={task.id} projectId={projectId} />
              </div>
              <div className="form-group">
                <DependencyManager taskId={task.id} projectId={projectId} />
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="task-phase">Fase (opzionale)</label>
            <select
              id="task-phase"
              value={phaseId}
              onChange={(e) => setPhaseId(e.target.value)}
              disabled={loading}
            >
              <option value="">Nessuna fase (task personale)</option>
              {phases.map((phase) => (
                <option key={phase.id} value={phase.id}>
                  {phase.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="task-status">Status</label>
              <select
                id="task-status"
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                disabled={loading}
              >
                <option value="todo">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="task-priority">Priority</label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                disabled={loading}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="task-due-date">Due Date</label>
              <input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="task-progress">Progress: {progress}%</label>
              <input
                id="task-progress"
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(parseInt(e.target.value, 10))}
                disabled={loading}
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="button" onClick={onCancel} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={loading}>
              {loading ? 'Saving...' : task ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
