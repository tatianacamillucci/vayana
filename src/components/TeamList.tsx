import React, { useState, useEffect } from 'react';
import { getTeams, deleteTeam, type Team } from '../lib/db/teams';
import { getTeamMembersByTeamId } from '../lib/db/teamMembers';

interface TeamListProps {
  onEdit: (team: Team) => void;
  onRefresh: () => void;
}

interface TeamRowData {
  team: Team;
  membersCount: number;
  leaderName: string | null;
}

export function TeamList({ onEdit, onRefresh }: TeamListProps): React.ReactElement {
  const [teams, setTeams] = useState<TeamRowData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadTeams();
  }, []);

  async function loadTeams() {
    setIsLoading(true);
    try {
      const rawTeams = await getTeams();
      const enriched = await Promise.all(
        rawTeams.map(async (team) => {
          const members = await getTeamMembersByTeamId(team.id);
          const leader = members.find((member) => member.role === 'team_lead');
          return {
            team,
            membersCount: members.length,
            leaderName: leader?.fullName || null,
          };
        })
      );

      setTeams(enriched);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teams');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Sei sicuro di voler eliminare questo team?')) return;

    try {
      await deleteTeam(id);
      await loadTeams();
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete team');
    }
  }

  if (isLoading) {
    return <div className="team-list-loading">Caricamento team...</div>;
  }

  if (error) {
    return <div className="team-list-error">Errore: {error}</div>;
  }

  if (teams.length === 0) {
    return (
      <div className="team-list-empty">
        <p>Nessun team creato. Inizia creando il primo team.</p>
      </div>
    );
  }

  return (
    <div className="team-list">
      <h2>Team ({teams.length})</h2>
      <ul className="team-list-items">
        {teams.map(({ team, membersCount, leaderName }) => (
          <li key={team.id} className="team-item">
            <div className="team-info">
              <span className="team-name">{team.name}</span>
              <div className="team-meta-row">
                <span className="team-meta-pill">Creato: {team.createdAt.toLocaleDateString()}</span>
                <span className="team-meta-pill">Utenti: {membersCount}</span>
                <span className="team-meta-pill">Team leader: {leaderName || 'Non assegnato'}</span>
              </div>
            </div>
            <div className="team-actions">
              <button
                onClick={() => onEdit(team)}
                className="btn-edit team-btn"
                aria-label={`Edit ${team.name}`}
              >
                Modifica
              </button>
              <button
                onClick={() => handleDelete(team.id)}
                className="btn-delete team-btn"
                aria-label={`Delete ${team.name}`}
              >
                Elimina
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function useTeamList() {
  return TeamList;
}
