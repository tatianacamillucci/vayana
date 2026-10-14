import React, { useState } from 'react';
import { TeamList } from '../components/TeamList';
import { TeamForm } from '../components/TeamForm';

const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';

// ── Backend-powered Teams page ───────────────────────────────────────────────
function TeamsPageBackend(): React.ReactElement {
  const [editingTeam, setEditingTeam] = useState<unknown>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleRefresh() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Persone</h1>
      </header>

      <div className="card mb-3">
        <TeamForm
          editingTeam={editingTeam as never}
          onSuccess={() => {
            setEditingTeam(null);
            handleRefresh();
          }}
          onCancel={() => setEditingTeam(null)}
        />
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

// ── Fallback (sql.js) Teams page — lazy loaded ───────────────────────────────
const TeamsPageFallback = React.lazy(() =>
  import('./TeamsPageFallback').then((m) => ({ default: m.TeamsPageFallback }))
);

// ── Public export ─────────────────────────────────────────────────────────────
export function TeamsPage(): React.ReactElement {
  if (USE_BACKEND) {
    return <TeamsPageBackend />;
  }
  return (
    <React.Suspense fallback={<div className="page-container"><div className="loading">Caricamento...</div></div>}>
      <TeamsPageFallback />
    </React.Suspense>
  );
}
