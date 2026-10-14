import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './index';

// Define Team locally for proper export
export interface Team {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function createTeam(name: string): Promise<Team> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const now = new Date();
  const id = uuidv4();

  db.run(
    'INSERT INTO teams (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
    [id, name, now.getTime(), now.getTime()]
  );

  return {
    id,
    name,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getTeams(): Promise<Team[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec('SELECT id, name, created_at, updated_at FROM teams ORDER BY created_at DESC');
  
  if (result.length === 0) return [];

  return result[0].values.map((row) => ({
    id: row[0] as string,
    name: row[1] as string,
    createdAt: new Date(row[2] as number),
    updatedAt: new Date(row[3] as number),
  }));
}

export async function getTeamById(id: string): Promise<Team | null> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec('SELECT id, name, created_at, updated_at FROM teams WHERE id = ?', [id]);
  
  if (result.length === 0 || result[0].values.length === 0) return null;

  const row = result[0].values[0];
  return {
    id: row[0] as string,
    name: row[1] as string,
    createdAt: new Date(row[2] as number),
    updatedAt: new Date(row[3] as number),
  };
}

export async function updateTeam(id: string, name: string): Promise<Team | null> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const now = new Date();
  db.run(
    'UPDATE teams SET name = ?, updated_at = ? WHERE id = ?',
    [name, now.getTime(), id]
  );

  return getTeamById(id);
}

export async function deleteTeam(id: string): Promise<boolean> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  db.run('DELETE FROM team_members WHERE team_id = ?', [id]);
  db.run('DELETE FROM teams WHERE id = ?', [id]);
  return true;
}

export async function getAllTeamsData(): Promise<{ teams: Team[] }> {
  const teamsList = await getTeams();
  return { teams: teamsList };
}
