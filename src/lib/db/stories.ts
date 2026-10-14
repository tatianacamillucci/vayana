import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './index';

export interface Story {
  id: string;
  taskId: string;
  type: 'system' | 'comment';
  content: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function createStory(
  taskId: string,
  type: 'system' | 'comment',
  content: string,
  author: string = 'System'
): Promise<Story> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const now = new Date();
  const id = uuidv4();

  db.run(
    'INSERT INTO stories (id, task_id, type, content, author, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, taskId, type, content, author, now.getTime(), now.getTime()]
  );

  return {
    id,
    taskId,
    type,
    content,
    author,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getStoriesByTask(taskId: string): Promise<Story[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec('SELECT id, task_id, type, content, author, created_at, updated_at FROM stories WHERE task_id = ? ORDER BY created_at ASC', [taskId]);
  
  if (result.length === 0) return [];

  return result[0].values.map((row) => ({
    id: row[0] as string,
    taskId: row[1] as string,
    type: row[2] as 'system' | 'comment',
    content: row[3] as string,
    author: row[4] as string,
    createdAt: new Date(row[5] as number),
    updatedAt: new Date(row[6] as number),
  }));
}

export async function getStoryById(id: string): Promise<Story | null> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec('SELECT id, task_id, type, content, author, created_at, updated_at FROM stories WHERE id = ?', [id]);
  
  if (result.length === 0 || result[0].values.length === 0) return null;

  const row = result[0].values[0];
  return {
    id: row[0] as string,
    taskId: row[1] as string,
    type: row[2] as 'system' | 'comment',
    content: row[3] as string,
    author: row[4] as string,
    createdAt: new Date(row[5] as number),
    updatedAt: new Date(row[6] as number),
  };
}

export async function updateStory(id: string, content: string): Promise<Story | null> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const now = new Date();
  db.run(
    'UPDATE stories SET content = ?, updated_at = ? WHERE id = ?',
    [content, now.getTime(), id]
  );

  return getStoryById(id);
}

export async function deleteStory(id: string): Promise<boolean> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  db.run('DELETE FROM stories WHERE id = ?', [id]);
  return true;
}

export async function getAllStories(): Promise<Story[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec('SELECT id, task_id, type, content, author, created_at, updated_at FROM stories ORDER BY created_at DESC');
  
  if (result.length === 0) return [];

  return result[0].values.map((row) => ({
    id: row[0] as string,
    taskId: row[1] as string,
    type: row[2] as 'system' | 'comment',
    content: row[3] as string,
    author: row[4] as string,
    createdAt: new Date(row[5] as number),
    updatedAt: new Date(row[6] as number),
  }));
}
