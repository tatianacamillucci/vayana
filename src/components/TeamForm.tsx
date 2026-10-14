import React, { useEffect, useState } from 'react';
import { createTeam, updateTeam, type Team } from '../lib/db/teams';
import { getTeamMembersByTeamId, replaceTeamMembers, TeamMemberRole } from '../lib/db/teamMembers';

interface TeamFormProps {
  editingTeam?: Team | null;
  onSuccess: () => void;
  onCancel?: () => void;
}

interface DraftMember {
  id: string;
  fullName: string;
  email: string;
  role: TeamMemberRole;
}

export function TeamForm({ editingTeam, onSuccess, onCancel }: TeamFormProps): React.ReactElement {
  const [name, setName] = useState('');
  const [members, setMembers] = useState<DraftMember[]>([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<TeamMemberRole>('member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editingTeam;

  useEffect(() => {
    const loadEditingState = async () => {
      if (!editingTeam) {
        setName('');
        setMembers([]);
        return;
      }

      setName(editingTeam.name);
      try {
        const existingMembers = await getTeamMembersByTeamId(editingTeam.id);
        setMembers(
          existingMembers.map((member) => ({
            id: member.id,
            fullName: member.fullName,
            email: member.email || '',
            role: member.role,
          }))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load team members');
      }
    };

    void loadEditingState();
  }, [editingTeam]);

  const hasLead = members.some((member) => member.role === 'team_lead');

  function addMember() {
    const fullName = newMemberName.trim();
    if (!fullName) {
      setError('Il nome utente e obbligatorio');
      return;
    }

    if (newMemberRole === 'team_lead' && hasLead) {
      setError('Puoi avere un solo team leader');
      return;
    }

    setMembers((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        fullName,
        email: newMemberEmail.trim(),
        role: newMemberRole,
      },
    ]);

    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberRole('member');
    setError(null);
  }

  function removeMember(id: string) {
    setMembers((prev) => prev.filter((member) => member.id !== id));
  }

  function updateMemberRole(id: string, role: TeamMemberRole) {
    if (role === 'team_lead' && members.some((member) => member.role === 'team_lead' && member.id !== id)) {
      setError('Puoi avere un solo team leader');
      return;
    }

    setMembers((prev) => prev.map((member) => (member.id === id ? { ...member, role } : member)));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setError('Il nome team e obbligatorio');
      return;
    }

    if (members.length === 0) {
      setError('Aggiungi almeno un utente al team');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let teamId: string;
      if (isEditing && editingTeam) {
        await updateTeam(editingTeam.id, name.trim());
        teamId = editingTeam.id;
      } else {
        const createdTeam = await createTeam(name.trim());
        teamId = createdTeam.id;
      }

      await replaceTeamMembers(
        teamId,
        members.map((member) => ({
          fullName: member.fullName,
          email: member.email,
          role: member.role,
        }))
      );

      setName('');
      setMembers([]);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save team');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="team-form">
      <h2>{isEditing ? 'Modifica Team' : 'Crea Team'}</h2>

      {error && <div className="form-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="team-name">Nome Team</label>
        <input
          id="team-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Es. Product Team"
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="form-group">
        <label>Utenti del team</label>
        <div className="team-member-add">
          <input
            type="text"
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            placeholder="Nome utente"
            disabled={isSubmitting}
          />
          <input
            type="email"
            value={newMemberEmail}
            onChange={(e) => setNewMemberEmail(e.target.value)}
            placeholder="Email (opzionale)"
            disabled={isSubmitting}
          />
          <select
            value={newMemberRole}
            onChange={(e) => setNewMemberRole(e.target.value as TeamMemberRole)}
            disabled={isSubmitting}
          >
            <option value="member">Member</option>
            <option value="team_lead">Team Lead</option>
          </select>
          <button type="button" className="btn-secondary" onClick={addMember} disabled={isSubmitting}>
            Aggiungi
          </button>
        </div>
      </div>

      <div className="team-members-list">
        {members.length === 0 ? (
          <p className="text-muted">Nessun utente aggiunto.</p>
        ) : (
          members.map((member) => (
            <div key={member.id} className="team-member-row">
              <div>
                <strong>{member.fullName}</strong>
                <div className="text-muted">{member.email || 'Nessuna email'}</div>
              </div>
              <div className="team-member-actions">
                <select
                  value={member.role}
                  onChange={(e) => updateMemberRole(member.id, e.target.value as TeamMemberRole)}
                  disabled={isSubmitting}
                >
                  <option value="member">Member</option>
                  <option value="team_lead">Team Lead</option>
                </select>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => removeMember(member.id)}
                  disabled={isSubmitting}
                >
                  Rimuovi
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="form-actions">
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? 'Salvataggio...' : isEditing ? 'Aggiorna Team' : 'Crea Team'}
        </button>

        {isEditing && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="btn-secondary"
          >
            Annulla
          </button>
        )}
      </div>
    </form>
  );
}