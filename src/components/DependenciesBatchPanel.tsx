import React, { useMemo, useState } from 'react';
import { Task } from '../lib/db/tasks';

const API_BASE_URL = 'http://localhost:4000';

interface ApiDependencyItem {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  dependsOnTask?: { id: string; title: string; status: string };
  task?: { id: string; title: string; status: string };
}

interface DependenciesResponse {
  blocking: ApiDependencyItem[];
  blockedBy: ApiDependencyItem[];
}

interface DependenciesBatchPanelProps {
  tasks: Task[];
}

const defaultBatchPayload = {
  continueOnError: true,
  operations: [
    {
      id: 'op-1',
      action: 'tasks.update',
      payload: {
        id: 'TASK_ID',
        priority: 'HIGH',
      },
    },
    {
      id: 'op-2',
      action: 'tasks.assign',
      payload: {
        id: 'TASK_ID',
        userIds: ['USER_ID'],
      },
    },
  ],
};

export function DependenciesBatchPanel({ tasks }: DependenciesBatchPanelProps): React.ReactElement {
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [dependsOnTaskId, setDependsOnTaskId] = useState('');
  const [dependencies, setDependencies] = useState<DependenciesResponse | null>(null);
  const [depsLoading, setDepsLoading] = useState(false);
  const [depsMessage, setDepsMessage] = useState('');

  const [batchPayload, setBatchPayload] = useState(JSON.stringify(defaultBatchPayload, null, 2));
  const [batchResult, setBatchResult] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);

  const availableTargets = useMemo(
    () => tasks.filter((t) => t.id !== selectedTaskId),
    [tasks, selectedTaskId],
  );

  const loadDependencies = async () => {
    if (!selectedTaskId) return;
    setDepsLoading(true);
    setDepsMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${selectedTaskId}/dependencies`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`Errore ${res.status}: impossibile caricare dipendenze`);
      }
      const data = (await res.json()) as DependenciesResponse;
      setDependencies(data);
    } catch (err: any) {
      setDepsMessage(err?.message || 'Errore nel caricamento dipendenze');
      setDependencies(null);
    } finally {
      setDepsLoading(false);
    }
  };

  const addDependency = async () => {
    if (!selectedTaskId || !dependsOnTaskId) return;
    setDepsMessage('');
    try {
      const res = await fetch(
        `${API_BASE_URL}/tasks/${selectedTaskId}/dependencies/${dependsOnTaskId}`,
        {
          method: 'POST',
          credentials: 'include',
        },
      );
      if (!res.ok) {
        const errBody = await safeJson(res);
        throw new Error(errBody?.message || `Errore ${res.status}: impossibile creare dipendenza`);
      }
      setDependsOnTaskId('');
      await loadDependencies();
      setDepsMessage('Dipendenza creata');
    } catch (err: any) {
      setDepsMessage(err?.message || 'Errore nella creazione dipendenza');
    }
  };

  const removeDependency = async (taskId: string, depId: string) => {
    setDepsMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${taskId}/dependencies/${depId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`Errore ${res.status}: impossibile rimuovere dipendenza`);
      }
      await loadDependencies();
    } catch (err: any) {
      setDepsMessage(err?.message || 'Errore nella rimozione dipendenza');
    }
  };

  const executeBatch = async () => {
    setBatchLoading(true);
    setBatchResult('');
    try {
      const parsed = JSON.parse(batchPayload);
      const res = await fetch(`${API_BASE_URL}/batch`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(data?.message || `Errore ${res.status} in batch`);
      }
      setBatchResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setBatchResult(`Errore: ${err?.message || 'Batch non eseguito'}`);
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <div className="grid-2 mb-3">
      <section className="card api-panel">
        <div className="api-panel-header">
          <h3>Dipendenze Task (API)</h3>
          <button className="btn-secondary" onClick={loadDependencies} disabled={!selectedTaskId || depsLoading}>
            {depsLoading ? 'Carico...' : 'Aggiorna'}
          </button>
        </div>

        <div className="form-group">
          <label>Task principale</label>
          <select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)}>
            <option value="">Seleziona task...</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </div>

        <div className="api-inline-controls">
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <label>Dipende da</label>
            <select value={dependsOnTaskId} onChange={(e) => setDependsOnTaskId(e.target.value)}>
              <option value="">Seleziona task...</option>
              {availableTargets.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-primary" onClick={addDependency} disabled={!selectedTaskId || !dependsOnTaskId}>
            Aggiungi
          </button>
        </div>

        {depsMessage && <div className="api-message">{depsMessage}</div>}

        {dependencies && (
          <div className="api-deps-grid">
            <div>
              <h4>Questo task blocca</h4>
              {dependencies.blocking.length === 0 ? (
                <p className="text-muted">Nessuna dipendenza</p>
              ) : (
                <ul className="api-list">
                  {dependencies.blocking.map((item) => (
                    <li key={item.id}>
                      <span>{item.dependsOnTask?.title || item.dependsOnTaskId}</span>
                      <button
                        className="btn-icon"
                        onClick={() => removeDependency(item.taskId, item.dependsOnTaskId)}
                        title="Rimuovi"
                      >
                        x
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h4>Questo task è bloccato da</h4>
              {dependencies.blockedBy.length === 0 ? (
                <p className="text-muted">Nessuna dipendenza</p>
              ) : (
                <ul className="api-list">
                  {dependencies.blockedBy.map((item) => (
                    <li key={item.id}>
                      <span>{item.task?.title || item.taskId}</span>
                      <button
                        className="btn-icon"
                        onClick={() => removeDependency(item.taskId, item.dependsOnTaskId)}
                        title="Rimuovi"
                      >
                        x
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="card api-panel">
        <div className="api-panel-header">
          <h3>Batch API (test rapido)</h3>
          <button className="btn-primary" onClick={executeBatch} disabled={batchLoading}>
            {batchLoading ? 'Eseguo...' : 'Esegui batch'}
          </button>
        </div>
        <div className="form-group">
          <label>Payload JSON</label>
          <textarea
            value={batchPayload}
            onChange={(e) => setBatchPayload(e.target.value)}
            rows={14}
            className="api-json-editor"
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Risultato</label>
          <pre className="api-result">{batchResult || 'Nessuna esecuzione'}</pre>
        </div>
      </section>
    </div>
  );
}

async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
