import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './index';

export interface Phase {
  id: string;
  projectId: string;
  name: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function createPhase(
  name: string,
  projectId: string,
  sortOrder?: number
): Promise<Phase> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const now = new Date();
  const id = uuidv4();
  const order = sortOrder ?? await getNextSortOrder(projectId);

  db.run(
    'INSERT INTO phases (id, project_id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, projectId, name, order, now.getTime(), now.getTime()]
  );

  return {
    id,
    projectId,
    name,
    sortOrder: order,
    createdAt: now,
    updatedAt: now,
  };
}

async function getNextSortOrder(projectId: string): Promise<number> {
  const db = getDatabase();
  if (!db) return 0;

  const result = db.exec(
    'SELECT MAX(sort_order) FROM phases WHERE project_id = ?',
    [projectId]
  );

  if (result.length === 0 || result[0].values[0][0] === null) {
    return 0;
  }

  return (result[0].values[0][0] as number) + 1;
}

export async function getPhases(): Promise<Phase[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(
    'SELECT id, project_id, name, sort_order, created_at, updated_at FROM phases ORDER BY sort_order ASC'
  );

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

export async function getPhasesByProjectId(projectId: string): Promise<Phase[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(
    'SELECT id, project_id, name, sort_order, created_at, updated_at FROM phases WHERE project_id = ? ORDER BY sort_order ASC',
    [projectId]
  );

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

export async function getPhaseById(id: string): Promise<Phase | null> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(
    'SELECT id, project_id, name, sort_order, created_at, updated_at FROM phases WHERE id = ?',
    [id]
  );

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

export async function updatePhase(
  id: string,
  name: string,
  sortOrder?: number
): Promise<Phase | null> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const now = new Date();
  
  if (sortOrder !== undefined) {
    db.run(
      'UPDATE phases SET name = ?, sort_order = ?, updated_at = ? WHERE id = ?',
      [name, sortOrder, now.getTime(), id]
    );
  } else {
    db.run(
      'UPDATE phases SET name = ?, updated_at = ? WHERE id = ?',
      [name, now.getTime(), id]
    );
  }

  return getPhaseById(id);
}

export async function reorderPhases(
  projectId: string,
  phaseIds: string[]
): Promise<Phase[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const now = new Date();
  
  phaseIds.forEach((phaseId, index) => {
    db.run(
      'UPDATE phases SET sort_order = ?, updated_at = ? WHERE id = ? AND project_id = ?',
      [index, now.getTime(), phaseId, projectId]
    );
  });

  return getPhasesByProjectId(projectId);
}

export async function deletePhase(id: string): Promise<boolean> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  db.run('DELETE FROM phases WHERE id = ?', [id]);
  return true;
}

export async function getAllPhasesData(): Promise<{ phases: Phase[] }> {
  const phasesList = await getPhases();
  return { phases: phasesList };
}
