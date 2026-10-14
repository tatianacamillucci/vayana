import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './index';

export interface Tag {
  id: string;
  projectId: string;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function createTag(projectId: string, name: string, color: string = '#6b7280'): Promise<Tag> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const now = new Date();
  const id = uuidv4();

  db.run(
    'INSERT INTO tags (id, project_id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, projectId, name, color, now.getTime(), now.getTime()]
  );

  return {
    id,
    projectId,
    name,
    color,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getTagsByProject(projectId: string): Promise<Tag[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec('SELECT id, project_id, name, color, created_at, updated_at FROM tags WHERE project_id = ? ORDER BY name', [projectId]);
  
  if (result.length === 0) return [];

  return result[0].values.map((row) => ({
    id: row[0] as string,
    projectId: row[1] as string,
    name: row[2] as string,
    color: row[3] as string,
    createdAt: new Date(row[4] as number),
    updatedAt: new Date(row[5] as number),
  }));
}

export async function getTagById(id: string): Promise<Tag | null> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec('SELECT id, project_id, name, color, created_at, updated_at FROM tags WHERE id = ?', [id]);
  
  if (result.length === 0 || result[0].values.length === 0) return null;

  const row = result[0].values[0];
  return {
    id: row[0] as string,
    projectId: row[1] as string,
    name: row[2] as string,
    color: row[3] as string,
    createdAt: new Date(row[4] as number),
    updatedAt: new Date(row[5] as number),
  };
}

export async function updateTag(id: string, name: string, color: string): Promise<Tag | null> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const now = new Date();
  db.run(
    'UPDATE tags SET name = ?, color = ?, updated_at = ? WHERE id = ?',
    [name, color, now.getTime(), id]
  );

  return getTagById(id);
}

export async function deleteTag(id: string): Promise<boolean> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  db.run('DELETE FROM tags WHERE id = ?', [id]);
  return true;
}

export async function getAllTags(): Promise<Tag[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec('SELECT id, project_id, name, color, created_at, updated_at FROM tags ORDER BY project_id, name');
  
  if (result.length === 0) return [];

  return result[0].values.map((row) => ({
    id: row[0] as string,
    projectId: row[1] as string,
    name: row[2] as string,
    color: row[3] as string,
    createdAt: new Date(row[4] as number),
    updatedAt: new Date(row[5] as number),
  }));
}
