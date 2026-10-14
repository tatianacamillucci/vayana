import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './index';

export interface Subtask {
  id: string;
  parentTaskId: string;
  childTaskId: string;
}

export async function addSubtask(parentTaskId: string, childTaskId: string): Promise<Subtask> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const id = uuidv4();

  db.run(
    'INSERT INTO subtasks (id, parent_task_id, child_task_id) VALUES (?, ?, ?)',
    [id, parentTaskId, childTaskId]
  );

  return {
    id,
    parentTaskId,
    childTaskId,
  };
}

export async function removeSubtask(id: string): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  db.run('DELETE FROM subtasks WHERE id = ?', [id]);
}

export async function getSubtasksByParent(parentTaskId: string): Promise<string[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec('SELECT child_task_id FROM subtasks WHERE parent_task_id = ?', [parentTaskId]);
  
  if (result.length === 0) return [];

  return result[0].values.map((row) => row[0] as string);
}

export async function getParentTaskByChild(childTaskId: string): Promise<string | null> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec('SELECT parent_task_id FROM subtasks WHERE child_task_id = ?', [childTaskId]);
  
  if (result.length === 0 || result[0].values.length === 0) return null;

  return result[0].values[0][0] as string;
}

export async function getAllSubtasks(): Promise<Subtask[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec('SELECT id, parent_task_id, child_task_id FROM subtasks');
  
  if (result.length === 0) return [];

  return result[0].values.map((row) => ({
    id: row[0] as string,
    parentTaskId: row[1] as string,
    childTaskId: row[2] as string,
  }));
}

export async function removeAllSubtasksForParent(parentTaskId: string): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  db.run('DELETE FROM subtasks WHERE parent_task_id = ?', [parentTaskId]);
}
