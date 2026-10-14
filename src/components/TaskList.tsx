import React, { useState } from 'react';
import { Task } from '../lib/db/tasks';
import { Phase } from '../lib/db/phases';
import { Project } from '../lib/db/projects';

type SortField = 'status' | 'priority' | 'dueDate' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface TaskListProps {
  tasks: Task[];
  phases: Phase[];
  projects: Project[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskList({ tasks, phases, projects, onEdit, onDelete }: TaskListProps): React.ReactElement {
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const getPhaseName = (phaseId: string): string => {
    if (!phaseId) return 'Senza fase';
    const phase = phases.find(p => p.id === phaseId);
    return phase?.name || 'Senza fase';
  };

  const getProjectName = (phaseId: string): string => {
    if (!phaseId) return 'Senza progetto';
    const phase = phases.find(p => p.id === phaseId);
    if (!phase) return 'Senza progetto';
    const project = projects.find(p => p.id === phase.projectId);
    return project?.name || 'Senza progetto';
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'todo': return 'Todo';
      case 'in_progress': return 'In Progress';
      case 'done': return 'Done';
      default: return status;
    }
  };

  const getPriorityClass = (priority: string): string => {
    switch (priority) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return '';
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '-';
    return date.toLocaleDateString();
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'status':
        const statusOrder = { todo: 0, in_progress: 1, done: 2 };
        comparison = statusOrder[a.status] - statusOrder[b.status];
        break;
      case 'priority':
        const priorityOrder = { low: 0, medium: 1, high: 2 };
        comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
        break;
      case 'dueDate':
        if (!a.dueDate && !b.dueDate) comparison = 0;
        else if (!a.dueDate) comparison = 1;
        else if (!b.dueDate) comparison = -1;
        else comparison = a.dueDate.getTime() - b.dueDate.getTime();
        break;
      case 'createdAt':
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <p>No tasks yet. Create your first task to get started.</p>
      </div>
    );
  }

  return (
    <div className="task-list">
      <div className="task-list-header">
        <button onClick={() => handleSort('status')} className="sort-btn">
          Status <SortIcon field="status" />
        </button>
        <button onClick={() => handleSort('priority')} className="sort-btn">
          Priority <SortIcon field="priority" />
        </button>
        <button onClick={() => handleSort('dueDate')} className="sort-btn">
          Due Date <SortIcon field="dueDate" />
        </button>
        <button onClick={() => handleSort('createdAt')} className="sort-btn">
          Created <SortIcon field="createdAt" />
        </button>
      </div>

      {sortedTasks.map((task) => (
        <div key={task.id} className={`task-card ${getPriorityClass(task.priority)}`}>
          <div className="task-main">
            <div className="task-title-row">
              <span className={`task-status status-${task.status}`}>{getStatusLabel(task.status)}</span>
              <h4>{task.title}</h4>
            </div>
            {task.description && <p className="task-description">{task.description}</p>}
            <div className="task-meta">
              <span className="task-phase">{getPhaseName(task.phaseId)}</span>
              <span className="task-project">{getProjectName(task.phaseId)}</span>
              <span className={`task-priority ${getPriorityClass(task.priority)}`}>{task.priority}</span>
              <span className="task-due-date">Due: {formatDate(task.dueDate)}</span>
              <span className="task-progress">Progress: {task.progress}%</span>
            </div>
          </div>
          <div className="task-actions">
            <button className="edit-btn" onClick={() => onEdit(task)}>Edit</button>
            <button className="delete-btn" onClick={() => onDelete(task)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
