import { getDatabase } from './index';

export async function addFollower(taskId: string, followerId: string): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  db.run(
    'INSERT OR IGNORE INTO task_followers (task_id, follower_id) VALUES (?, ?)',
    [taskId, followerId]
  );
}

export async function removeFollower(taskId: string, followerId: string): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  db.run('DELETE FROM task_followers WHERE task_id = ? AND follower_id = ?', [taskId, followerId]);
}

export async function getFollowersByTask(taskId: string): Promise<string[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec('SELECT follower_id FROM task_followers WHERE task_id = ?', [taskId]);
  
  if (result.length === 0) return [];

  return result[0].values.map(row => row[0] as string);
}

export async function isFollower(taskId: string, followerId: string): Promise<boolean> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec('SELECT 1 FROM task_followers WHERE task_id = ? AND follower_id = ?', [taskId, followerId]);
  
  return result.length > 0 && result[0].values.length > 0;
}
