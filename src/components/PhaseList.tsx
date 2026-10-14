import React, { useState, useEffect } from 'react';
import { Phase, createPhase, updatePhase, deletePhase, reorderPhases } from '../lib/db/phases';
import { Task, getTasksByPhaseId } from '../lib/db/tasks';

interface PhaseListProps {
  phases: Phase[];
  projectId: string;
  onRefresh: () => void;
}

export function PhaseList({ phases, projectId, onRefresh }: PhaseListProps): React.ReactElement {
  const [newPhaseName, setNewPhaseName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(false);
  const [tasksByPhase, setTasksByPhase] = useState<Record<string, Task[]>>({});

  useEffect(() => {
    void loadTasksByPhase();
  }, [phases.map((p) => p.id).join('|')]);

  const loadTasksByPhase = async () => {
    try {
      const entries = await Promise.all(
        phases.map(async (phase) => [phase.id, await getTasksByPhaseId(phase.id)] as const)
      );
      setTasksByPhase(Object.fromEntries(entries));
    } catch (err) {
      console.error('Failed to load tasks by phase:', err);
      setTasksByPhase({});
    }
  };

  const refreshAll = async () => {
    onRefresh();
    await loadTasksByPhase();
  };

  const handleAddPhase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhaseName.trim()) return;

    setLoading(true);
    try {
      await createPhase(newPhaseName.trim(), projectId);
      setNewPhaseName('');
      await refreshAll();
    } catch (err) {
      console.error('Failed to create phase:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditStart = (phase: Phase) => {
    setEditingId(phase.id);
    setEditingName(phase.name);
  };

  const handleEditSave = async (phase: Phase) => {
    if (!editingName.trim()) return;

    setLoading(true);
    try {
      await updatePhase(phase.id, editingName.trim());
      setEditingId(null);
      await refreshAll();
    } catch (err) {
      console.error('Failed to update phase:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (phase: Phase) => {
    if (!confirm(`Sei sicuro di voler eliminare la fase "${phase.name}"?`)) {
      return;
    }

    setLoading(true);
    try {
      await deletePhase(phase.id);
      await refreshAll();
    } catch (err) {
      console.error('Failed to delete phase:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;

    const newOrder = [...phases];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    const phaseIds = newOrder.map((p) => p.id);

    setLoading(true);
    try {
      await reorderPhases(projectId, phaseIds);
      await refreshAll();
    } catch (err) {
      console.error('Failed to reorder phases:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === phases.length - 1) return;

    const newOrder = [...phases];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    const phaseIds = newOrder.map((p) => p.id);

    setLoading(true);
    try {
      await reorderPhases(projectId, phaseIds);
      await refreshAll();
    } catch (err) {
      console.error('Failed to reorder phases:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDueDate = (date: Date | null): string => {
    if (!date) return 'Nessuna scadenza';
    return date.toLocaleDateString();
  };

  const formatStatusLabel = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'todo':
        return 'Da fare';
      case 'in_progress':
        return 'In corso';
      case 'in_review':
        return 'In revisione';
      case 'done':
        return 'Completata';
      case 'cancelled':
        return 'Eliminata';
      default:
        return status;
    }
  };

  return (
    <div className="phase-list-container">
      <div className="phase-list-header">
        <h4>Fasi progetto</h4>
        <span className="text-secondary">{phases.length} fasi</span>
      </div>

      {phases.length > 0 && (
        <div className="phase-list">
          {phases.map((phase, index) => {
            const phaseTasks = tasksByPhase[phase.id] || [];

            return (
              <div key={phase.id} className="phase-item-wrap">
                <div className="phase-item">
                  <span className="phase-order">#{index + 1}</span>

                  {editingId === phase.id ? (
                    <input
                      type="text"
                      className="phase-input"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleEditSave(phase)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleEditSave(phase);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                      disabled={loading}
                    />
                  ) : (
                    <span className="phase-name" onClick={() => handleEditStart(phase)} title="Click per modificare">
                      {phase.name}
                    </span>
                  )}

                  <span className="phase-task-count">{phaseTasks.length} task</span>

                  <div className="phase-actions">
                    <button
                      className="btn-icon"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0 || loading}
                      title="Sposta su"
                      aria-label="Sposta su"
                    >
                      ↑
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === phases.length - 1 || loading}
                      title="Sposta giù"
                      aria-label="Sposta giù"
                    >
                      ↓
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => handleDelete(phase)}
                      disabled={loading}
                      title="Elimina"
                      aria-label="Elimina"
                    >
                      🗑
                    </button>
                  </div>
                </div>

                <div className="phase-task-list">
                  {phaseTasks.length === 0 ? (
                    <p className="text-muted">Nessun task in questa fase.</p>
                  ) : (
                    phaseTasks.map((task) => (
                      <div key={task.id} className="phase-task-row">
                        <div className="phase-task-title">{task.title}</div>
                        <div className="phase-task-meta">
                            <span className={`status-badge status-${task.status.toLowerCase()}`}>{formatStatusLabel(task.status)}</span>
                          <span>Priorità: {task.priority}</span>
                          <span>{formatDueDate(task.dueDate)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={handleAddPhase} className="add-phase-form">
        <input
          type="text"
          value={newPhaseName}
          onChange={(e) => setNewPhaseName(e.target.value)}
          placeholder="Nome nuova fase"
          disabled={loading}
        />
        <button type="submit" className="btn-primary" disabled={loading || !newPhaseName.trim()}>
          Aggiungi fase
        </button>
      </form>
    </div>
  );
}
