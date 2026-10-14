import React, { useState } from 'react';

// Status type aligned with backend (uppercase 5 states)
// The legacy sql.js path uses lowercase 3 states; we normalize on entry.
type BackendTaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
type LegacyTaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskStatus = BackendTaskStatus | LegacyTaskStatus;

// Normalize any status string to backend uppercase format
function normalizeStatus(status: string): BackendTaskStatus {
  switch (status.toLowerCase()) {
    case 'todo': return 'TODO';
    case 'in_progress': return 'IN_PROGRESS';
    case 'in_review': return 'IN_REVIEW';
    case 'done': return 'DONE';
    case 'cancelled': return 'CANCELLED';
    default: return 'TODO';
  }
}

export interface BoardTask {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueDate?: Date | string | null;
  progress?: number;
  phaseId?: string | null;
}

interface BoardTag {
  id: string;
  name: string;
  color: string;
}

interface TaskBoardProps {
  tasks: BoardTask[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  phases?: any[];
  tags?: BoardTag[];
  onEdit: (task: BoardTask) => void;
  onStatusChange?: (taskId: string, newStatus: BackendTaskStatus) => void;
  onRefresh?: () => void;
}

const COLUMNS: { status: BackendTaskStatus; label: string; color: string }[] = [
  { status: 'TODO', label: 'Da Fare', color: '#6b7280' },
  { status: 'IN_PROGRESS', label: 'In Corso', color: '#3b82f6' },
  { status: 'IN_REVIEW', label: 'In Revisione', color: '#f59e0b' },
  { status: 'DONE', label: 'Completato', color: '#22c55e' },
  { status: 'CANCELLED', label: 'Annullato', color: '#ef4444' },
];

const PRIORITY_EMOJI: Record<string, string> = {
  HIGH: '🔴', URGENT: '🔴', high: '🔴',
  MEDIUM: '🟡', medium: '🟡',
  LOW: '🟢', low: '🟢',
};

function formatDueDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const today = new Date();
  const dueDate = new Date(date as string);
  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'In ritardo';
  if (diffDays === 0) return 'Oggi';
  if (diffDays === 1) return 'Domani';
  if (diffDays <= 7) return `${diffDays} giorni`;
  return dueDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

function isOverdue(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  return new Date(date as string) < new Date();
}

export function TaskBoard({ tasks, tags = [], onEdit, onStatusChange, onRefresh }: TaskBoardProps): React.ReactElement {
  const [draggedTask, setDraggedTask] = useState<BoardTask | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<BackendTaskStatus | null>(null);

  const getTasksByStatus = (status: BackendTaskStatus): BoardTask[] =>
    tasks.filter((t) => normalizeStatus(t.status) === status);

  const handleDragStart = (e: React.DragEvent, task: BoardTask) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: BackendTaskStatus) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDragLeave = () => setDragOverColumn(null);

  const handleDrop = (e: React.DragEvent, newStatus: BackendTaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggedTask) return;
    const currentStatus = normalizeStatus(draggedTask.status);
    if (currentStatus !== newStatus) {
      if (onStatusChange) {
        onStatusChange(draggedTask.id, newStatus);
      } else if (onRefresh) {
        onRefresh();
      }
    }
    setDraggedTask(null);
  };

  const renderTaskCard = (task: BoardTask) => {
    const taskTags = tags.filter((tag) => {
      // Tags may be pre-filtered per task or global — show all provided tags
      return tag;
    });
    void taskTags; // Tags rendering deferred to Phase 13 full wiring

    return (
      <div
        key={task.id}
        className={`task-card-board priority-${task.priority?.toLowerCase()}`}
        draggable
        onDragStart={(e) => handleDragStart(e, task)}
        onClick={() => onEdit(task)}
      >
        <h4 className="task-card-title">{task.title}</h4>

        {task.description && (
          <p className="task-card-desc">
            {task.description.slice(0, 80)}
            {task.description.length > 80 ? '...' : ''}
          </p>
        )}

        <div className="task-card-meta">
          <div className="task-meta-left">
            {task.dueDate && (
              <span className={`task-due ${isOverdue(task.dueDate) ? 'overdue' : ''}`}>
                <span className="meta-icon">📅</span>
                {formatDueDate(task.dueDate)}
              </span>
            )}
            {task.progress !== undefined && task.progress > 0 && task.progress < 100 && (
              <span className="task-subtasks">
                <span className="meta-icon">☑</span>
                {task.progress}%
              </span>
            )}
          </div>
          <div className="task-meta-right">
            {task.priority && (
              <span className={`priority-indicator priority-${task.priority?.toLowerCase()}`} title={`Priorità: ${task.priority}`}>
                {PRIORITY_EMOJI[task.priority] ?? '🟢'}
              </span>
            )}
          </div>
        </div>

        {task.progress !== undefined && task.progress > 0 && task.progress < 100 && (
          <div className="task-progress-bar">
            <div className="task-progress-fill" style={{ width: `${task.progress}%` }}></div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="task-board">
      {COLUMNS.map((column) => (
        <div
          key={column.status}
          className={`board-column ${dragOverColumn === column.status ? 'drag-over' : ''}`}
          onDragOver={(e) => handleDragOver(e, column.status)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, column.status)}
        >
          <div className="column-header" style={{ borderLeft: `3px solid ${column.color}` }}>
            <h3>{column.label}</h3>
            <span className="task-count">{getTasksByStatus(column.status).length}</span>
          </div>
          <div className="column-tasks">
            {getTasksByStatus(column.status).map((task) => renderTaskCard(task))}
            {getTasksByStatus(column.status).length === 0 && (
              <div className="column-empty">
                <p>Nessun task</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
