import { getDatabase } from './index';

export interface TaskDependency {
  taskId: string;
  dependsOnTaskId: string;
  dependencyType: 'blocks' | 'is_blocked_by';
}

export async function addDependency(
  taskId: string,
  dependsOnTaskId: string,
  dependencyType: 'blocks' | 'is_blocked_by' = 'blocks'
): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  db.run(
    'INSERT OR IGNORE INTO task_dependencies (task_id, depends_on_task_id, dependency_type) VALUES (?, ?, ?)',
    [taskId, dependsOnTaskId, dependencyType]
  );
}

export async function removeDependency(taskId: string, dependsOnTaskId: string): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  db.run('DELETE FROM task_dependencies WHERE task_id = ? AND depends_on_task_id = ?', [taskId, dependsOnTaskId]);
}

export async function getDependenciesForTask(taskId: string): Promise<TaskDependency[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec('SELECT task_id, depends_on_task_id, dependency_type FROM task_dependencies WHERE task_id = ?', [taskId]);
  
  if (result.length === 0) return [];

  return result[0].values.map((row) => ({
    taskId: row[0] as string,
    dependsOnTaskId: row[1] as string,
    dependencyType: row[2] as 'blocks' | 'is_blocked_by',
  }));
}

export async function getBlockingTasks(taskId: string): Promise<string[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(
    `SELECT depends_on_task_id FROM task_dependencies 
     WHERE task_id = ? AND dependency_type = 'blocks'
     UNION
     SELECT task_id FROM task_dependencies
     WHERE depends_on_task_id = ? AND dependency_type = 'is_blocked_by'`,
    [taskId, taskId]
  );
  
  if (result.length === 0) return [];

  return result[0].values.map((row) => row[0] as string);
}

export async function getBlockedByTasks(taskId: string): Promise<string[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(
    `SELECT task_id FROM task_dependencies 
     WHERE depends_on_task_id = ? AND dependency_type = 'blocks'
     UNION
     SELECT depends_on_task_id FROM task_dependencies
     WHERE task_id = ? AND dependency_type = 'is_blocked_by'`,
    [taskId, taskId]
  );
  
  if (result.length === 0) return [];

  return result[0].values.map((row) => row[0] as string);
}

export async function getAllDependencies(): Promise<TaskDependency[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec('SELECT task_id, depends_on_task_id, dependency_type FROM task_dependencies');
  
  if (result.length === 0) return [];

  return result[0].values.map((row) => ({
    taskId: row[0] as string,
    dependsOnTaskId: row[1] as string,
    dependencyType: row[2] as 'blocks' | 'is_blocked_by',
  }));
}

export async function removeAllDependenciesForTask(taskId: string): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  db.run('DELETE FROM task_dependencies WHERE task_id = ? OR depends_on_task_id = ?', [taskId, taskId]);
}

export async function setBlockedByTasks(taskId: string, blockerTaskIds: string[]): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const uniqueIds = Array.from(new Set(blockerTaskIds.filter((id) => id && id !== taskId)));

  db.run(
    `DELETE FROM task_dependencies
     WHERE (task_id = ? AND dependency_type = 'is_blocked_by')
        OR (depends_on_task_id = ? AND dependency_type = 'blocks')`,
    [taskId, taskId]
  );

  uniqueIds.forEach((blockerId) => {
    db.run(
      'INSERT OR IGNORE INTO task_dependencies (task_id, depends_on_task_id, dependency_type) VALUES (?, ?, ?)',
      [taskId, blockerId, 'is_blocked_by']
    );
  });
}
