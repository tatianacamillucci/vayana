import { getDatabase } from './index';

export interface TaskTag {
  taskId: string;
  tagId: string;
}

export async function addTagToTask(taskId: string, tagId: string): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  db.run(
    'INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)',
    [taskId, tagId]
  );
}

export async function removeTagFromTask(taskId: string, tagId: string): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  db.run('DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?', [taskId, tagId]);
}

export async function getTagsByTask(taskId: string): Promise<string[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec('SELECT tag_id FROM task_tags WHERE task_id = ?', [taskId]);
  
  if (result.length === 0) return [];

  return result[0].values.map((row) => row[0] as string);
}

export async function getTaskIdsByTag(tagId: string): Promise<string[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec('SELECT task_id FROM task_tags WHERE tag_id = ?', [tagId]);
  
  if (result.length === 0) return [];

  return result[0].values.map((row) => row[0] as string);
}

export async function removeAllTagsFromTask(taskId: string): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  db.run('DELETE FROM task_tags WHERE task_id = ?', [taskId]);
}
