import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './index';

export type TeamMemberRole = 'member' | 'team_lead';

export interface TeamMember {
  id: string;
  teamId: string;
  fullName: string;
  email: string | null;
  role: TeamMemberRole;
  createdAt: Date;
  updatedAt: Date;
}

interface NewTeamMemberInput {
  fullName: string;
  email?: string;
  role?: TeamMemberRole;
}

function mapRowToMember(row: any[]): TeamMember {
  return {
    id: row[0] as string,
    teamId: row[1] as string,
    fullName: row[2] as string,
    email: row[3] as string | null,
    role: ((row[4] as string) || 'member') as TeamMemberRole,
    createdAt: new Date(row[5] as number),
    updatedAt: new Date(row[6] as number),
  };
}

export async function getTeamMembersByTeamId(teamId: string): Promise<TeamMember[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(
    `SELECT id, team_id, full_name, email, role, created_at, updated_at
     FROM team_members
     WHERE team_id = ?
     ORDER BY created_at ASC`,
    [teamId]
  );

  if (result.length === 0) return [];
  return result[0].values.map(mapRowToMember);
}

export async function replaceTeamMembers(teamId: string, members: NewTeamMemberInput[]): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const normalizedMembers = members
    .map((member) => ({
      fullName: member.fullName.trim(),
      email: member.email?.trim() || null,
      role: (member.role || 'member') as TeamMemberRole,
    }))
    .filter((member) => member.fullName.length > 0);

  db.run('DELETE FROM team_members WHERE team_id = ?', [teamId]);

  const now = Date.now();
  normalizedMembers.forEach((member) => {
    db.run(
      `INSERT INTO team_members (id, team_id, full_name, email, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), teamId, member.fullName, member.email, member.role, now, now]
    );
  });
}

export async function getAllTeamMembers(): Promise<TeamMember[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(
    `SELECT id, team_id, full_name, email, role, created_at, updated_at
     FROM team_members
     ORDER BY created_at ASC`
  );

  if (result.length === 0) return [];
  return result[0].values.map(mapRowToMember);
}
