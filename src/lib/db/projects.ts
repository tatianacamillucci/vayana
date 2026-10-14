import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './index';
import { getTeams, createTeam } from './teams';

export interface Project {
  id: string;
  teamId: string | null;
  name: string;
  description: string | null;
  boardMode: 'phases' | 'sections';
  createdAt: Date;
  updatedAt: Date;
}

async function getOrCreateDefaultTeam(): Promise<string> {
  const teams = await getTeams();
  if (teams.length > 0) {
    return teams[0].id;
  }
  const defaultTeam = await createTeam('Default');
  return defaultTeam.id;
}

export async function createProject(
  name: string,
  teamId?: string,
  description?: string,
  boardMode: 'phases' | 'sections' = 'phases'
): Promise<Project> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const now = new Date();
  const id = uuidv4();

  let finalTeamId = teamId || null;
  if (!finalTeamId) {
    finalTeamId = await getOrCreateDefaultTeam();
  }

  db.run(
    'INSERT INTO projects (id, team_id, name, description, board_mode, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, finalTeamId, name, description || null, boardMode, now.getTime(), now.getTime()]
  );

  return {
    id,
    teamId: finalTeamId,
    name,
    description: description || null,
    boardMode,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getProjects(): Promise<Project[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(
    'SELECT id, team_id, name, description, board_mode, created_at, updated_at FROM projects ORDER BY created_at DESC'
  );

  if (result.length === 0) return [];

  return result[0].values.map((row) => ({
    id: row[0] as string,
    teamId: row[1] as string,
    name: row[2] as string,
    description: row[3] as string | null,
    boardMode: ((row[4] as string) || 'phases') as 'phases' | 'sections',
    createdAt: new Date(row[5] as number),
    updatedAt: new Date(row[6] as number),
  }));
}

export async function getProjectById(id: string): Promise<Project | null> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(
    'SELECT id, team_id, name, description, board_mode, created_at, updated_at FROM projects WHERE id = ?',
    [id]
  );

  if (result.length === 0 || result[0].values.length === 0) return null;

  const row = result[0].values[0];
  return {
    id: row[0] as string,
    teamId: row[1] as string,
    name: row[2] as string,
    description: row[3] as string | null,
    boardMode: (row[4] as string) as 'phases' | 'sections',
    createdAt: new Date(row[5] as number),
    updatedAt: new Date(row[6] as number),
  };
}

export async function getProjectsByTeamId(teamId: string): Promise<Project[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(
    'SELECT id, team_id, name, description, board_mode, created_at, updated_at FROM projects WHERE team_id = ? ORDER BY created_at DESC',
    [teamId]
  );

  if (result.length === 0) return [];

  return result[0].values.map((row) => ({
    id: row[0] as string,
    teamId: row[1] as string,
    name: row[2] as string,
    description: row[3] as string | null,
    boardMode: ((row[4] as string) || 'phases') as 'phases' | 'sections',
    createdAt: new Date(row[5] as number),
    updatedAt: new Date(row[6] as number),
  }));
}

export async function updateProject(
  id: string,
  name: string,
  description?: string,
  boardMode?: 'phases' | 'sections'
): Promise<Project | null> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const now = new Date();
  
  if (boardMode) {
    db.run(
      'UPDATE projects SET name = ?, description = ?, board_mode = ?, updated_at = ? WHERE id = ?',
      [name, description || null, boardMode, now.getTime(), id]
    );
  } else {
    db.run(
      'UPDATE projects SET name = ?, description = ?, updated_at = ? WHERE id = ?',
      [name, description || null, now.getTime(), id]
    );
  }

  return getProjectById(id);
}

export async function deleteProject(id: string): Promise<boolean> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  db.run('DELETE FROM projects WHERE id = ?', [id]);
  return true;
}

export async function getAllProjectsData(): Promise<{ projects: Project[] }> {
  const projectsList = await getProjects();
  return { projects: projectsList };
}
