import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './index';

export interface CustomFieldValue {
  id: string;
  taskId: string;
  fieldId: string;
  value: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function setCustomFieldValue(
  taskId: string,
  fieldId: string,
  value: string | null
): Promise<CustomFieldValue> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const now = new Date();
  
  const existing = db.exec('SELECT id FROM custom_field_values WHERE task_id = ? AND field_id = ?', [taskId, fieldId]);
  
  if (existing.length > 0 && existing[0].values.length > 0) {
    db.run(
      'UPDATE custom_field_values SET value = ?, updated_at = ? WHERE task_id = ? AND field_id = ?',
      [value, now.getTime(), taskId, fieldId]
    );
    return {
      id: existing[0].values[0][0] as string,
      taskId,
      fieldId,
      value,
      createdAt: now,
      updatedAt: now,
    };
  }

  const id = uuidv4();
  db.run(
    'INSERT INTO custom_field_values (id, task_id, field_id, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, taskId, fieldId, value, now.getTime(), now.getTime()]
  );

  return {
    id,
    taskId,
    fieldId,
    value,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getCustomFieldValuesByTask(taskId: string): Promise<CustomFieldValue[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec('SELECT id, task_id, field_id, value, created_at, updated_at FROM custom_field_values WHERE task_id = ?', [taskId]);
  
  if (result.length === 0) return [];

  return result[0].values.map((row) => ({
    id: row[0] as string,
    taskId: row[1] as string,
    fieldId: row[2] as string,
    value: row[3] as string | null,
    createdAt: new Date(row[4] as number),
    updatedAt: new Date(row[5] as number),
  }));
}
