import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './index';

export interface Section {
  id: string;
  projectId: string;
  name: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function createSection(projectId: string, name: string): Promise<Section> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const now = new Date();
  const id = uuidv4();

  const maxOrderResult = db.exec('SELECT MAX(sort_order) FROM sections WHERE project_id = ?', [projectId]);
  const maxOrder = maxOrderResult.length > 0 && maxOrderResult[0].values[0][0] !== null 
    ? (maxOrderResult[0].values[0][0] as number) + 1 
    : 0;

  db.run(
    'INSERT INTO sections (id, project_id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, projectId, name, maxOrder, now.getTime(), now.getTime()]
  );

  return {
    id,
    projectId,
    name,
    sortOrder: maxOrder,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getSectionsByProject(projectId: string): Promise<Section[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec('SELECT id, project_id, name, sort_order, created_at, updated_at FROM sections WHERE project_id = ? ORDER BY sort_order', [projectId]);
  
  if (result.length === 0) return [];

  return result[0].values.map((row) => ({
    id: row[0] as string,
    projectId: row[1] as string,
    name: row[2] as string,
    sortOrder: row[3] as number,
    createdAt: new Date(row[4] as number),
    updatedAt: new Date(row[5] as number),
  }));
}

export async function getSectionById(id: string): Promise<Section | null> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec('SELECT id, project_id, name, sort_order, created_at, updated_at FROM sections WHERE id = ?', [id]);
  
  if (result.length === 0 || result[0].values.length === 0) return null;

  const row = result[0].values[0];
  return {
    id: row[0] as string,
    projectId: row[1] as string,
    name: row[2] as string,
    sortOrder: row[3] as number,
    createdAt: new Date(row[4] as number),
    updatedAt: new Date(row[5] as number),
  };
}

export async function updateSection(id: string, name: string): Promise<Section | null> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const now = new Date();
  db.run(
    'UPDATE sections SET name = ?, updated_at = ? WHERE id = ?',
    [name, now.getTime(), id]
  );

  return getSectionById(id);
}

export async function deleteSection(id: string): Promise<boolean> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  db.run('UPDATE tasks SET section_id = NULL WHERE section_id = ?', [id]);
  db.run('DELETE FROM sections WHERE id = ?', [id]);
  return true;
}

export async function reorderSections(projectId: string, sectionIds: string[]): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  sectionIds.forEach((sectionId, index) => {
    db.run('UPDATE sections SET sort_order = ? WHERE id = ? AND project_id = ?', [index, sectionId, projectId]);
  });
}

export async function getAllSections(): Promise<Section[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec('SELECT id, project_id, name, sort_order, created_at, updated_at FROM sections ORDER BY project_id, sort_order');
  
  if (result.length === 0) return [];

  return result[0].values.map((row) => ({
    id: row[0] as string,
    projectId: row[1] as string,
    name: row[2] as string,
    sortOrder: row[3] as number,
    createdAt: new Date(row[4] as number),
    updatedAt: new Date(row[5] as number),
  }));
}
