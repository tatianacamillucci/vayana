// TeamsPageFallback.tsx — sql.js implementation (used when VITE_USE_BACKEND=false)
import React, { useState } from 'react';
import { TeamList } from '../components/TeamList';
import { TeamForm } from '../components/TeamForm';
import { useDatabase } from '../contexts/DatabaseContext';
import { exportData, downloadExport, importData, validateImportData } from '../lib/db/export';
import type { Team } from '../lib/db/teams';

export function TeamsPageFallback(): React.ReactElement {
  const { isReady, isLoading: dbLoading, error: dbError } = useDatabase();
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  function handleRefresh() {
    setRefreshKey((k) => k + 1);
  }

  async function handleExport() {
    try {
      const data = await exportData();
      downloadExport(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed');
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      
      const validation = validateImportData(text);
      if (!validation.valid) {
        setImportResult({
          success: false,
          message: `Validation errors: ${validation.errors.join(', ')}`,
        });
        return;
      }

      const result = await importData(text, importMode);
      
      if (result.success) {
        setImportResult({
          success: true,
          message: `Successfully imported ${result.imported} teams`,
        });
        handleRefresh();
      } else {
        setImportResult({
          success: false,
          message: `Import failed: ${result.errors.join(', ')}`,
        });
      }
    } catch (err) {
      setImportResult({
        success: false,
        message: err instanceof Error ? err.message : 'Import failed',
      });
    }

    e.target.value = '';
  }

  if (dbLoading) {
    return (
      <div className="page-container">
        <div className="loading">Inizializzazione database...</div>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="page-container">
        <div className="error">Errore database: {dbError}</div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="page-container">
        <div className="error">Database non pronto</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Persone</h1>
        <div className="header-actions">
          <button onClick={handleExport} className="btn-secondary">
            Esporta
          </button>
        </div>
      </header>

      <div className="card mb-3">
        <TeamForm
          editingTeam={editingTeam}
          onSuccess={() => {
            setEditingTeam(null);
            handleRefresh();
          }}
          onCancel={() => setEditingTeam(null)}
        />
      </div>

      <div className="card mb-3">
        <h2 className="section-title">Importa Dati</h2>
        <div className="form-group" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="radio"
              name="importMode"
              value="merge"
              checked={importMode === 'merge'}
              onChange={() => setImportMode('merge')}
            />
            Unisci
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="radio"
              name="importMode"
              value="overwrite"
              checked={importMode === 'overwrite'}
              onChange={() => setImportMode('overwrite')}
            />
            Sostituisci tutto
          </label>
        </div>
        <input
          type="file"
          accept=".json"
          onChange={handleImport}
          className="filter-select"
          style={{ width: 'auto' }}
        />
        {importResult && (
          <div className={`import-result ${importResult.success ? 'success' : 'error'}`} style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '8px' }}>
            {importResult.message}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="section-title">Team</h2>
        <TeamList
          key={refreshKey}
          onEdit={(team) => setEditingTeam(team)}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  );
}
