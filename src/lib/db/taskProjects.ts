import { getDatabase } from './index';

export async function addTaskToProject(taskId: string, projectId: string): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');
  db.run(
    'INSERT OR IGNORE INTO task_projects (task_id, project_id) VALUES (?, ?)',
    [taskId, projectId]
  );
}

export async function removeTaskFromProject(taskId: string, projectId: string): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');
  db.run('DELETE FROM task_projects WHERE task_id = ? AND project_id = ?', [taskId, projectId]);
}

export async function getProjectsByTaskId(taskId: string): Promise<string[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');
  const result = db.exec('SELECT project_id FROM task_projects WHERE task_id = ?', [taskId]);
  if (result.length === 0) return [];
  return result[0].values.map(row => row[0] as string);
}

export async function getTasksByProjectIdMulti(projectId: string): Promise<string[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');
  const result = db.exec('SELECT task_id FROM task_projects WHERE project_id = ?', [projectId]);
  if (result.length === 0) return [];
  return result[0].values.map(row => row[0] as string);
}

export async function removeAllProjectMemberships(taskId: string): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');
  db.run('DELETE FROM task_projects WHERE task_id = ?', [taskId]);
}
