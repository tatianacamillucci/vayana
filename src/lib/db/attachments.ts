import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './index';

export interface Attachment {
  id: string;
  taskId: string;
  filename: string;
  size: number;
  mimeType: string;
  storedPath: string;
  createdAt: Date;
}

export async function createAttachment(
  taskId: string,
  filename: string,
  size: number,
  mimeType: string,
  storedPath: string
): Promise<Attachment> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const now = new Date();
  const id = uuidv4();

  db.run(
    'INSERT INTO attachments (id, task_id, filename, size, mime_type, stored_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, taskId, filename, size, mimeType, storedPath, now.getTime()]
  );

  return {
    id,
    taskId,
    filename,
    size,
    mimeType,
    storedPath,
    createdAt: now,
  };
}

export async function getAttachmentsByTask(taskId: string): Promise<Attachment[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec('SELECT id, task_id, filename, size, mime_type, stored_path, created_at FROM attachments WHERE task_id = ? ORDER BY created_at DESC', [taskId]);
  
  if (result.length === 0) return [];

  return result[0].values.map((row) => ({
    id: row[0] as string,
    taskId: row[1] as string,
    filename: row[2] as string,
    size: row[3] as number,
    mimeType: row[4] as string,
    storedPath: row[5] as string,
    createdAt: new Date(row[6] as number),
  }));
}

export async function getAttachmentById(id: string): Promise<Attachment | null> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec('SELECT id, task_id, filename, size, mime_type, stored_path, created_at FROM attachments WHERE id = ?', [id]);
  
  if (result.length === 0 || result[0].values.length === 0) return null;

  const row = result[0].values[0];
  return {
    id: row[0] as string,
    taskId: row[1] as string,
    filename: row[2] as string,
    size: row[3] as number,
    mimeType: row[4] as string,
    storedPath: row[5] as string,
    createdAt: new Date(row[6] as number),
  };
}

export async function deleteAttachment(id: string): Promise<boolean> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  db.run('DELETE FROM attachments WHERE id = ?', [id]);
  return true;
}

export async function getAllAttachments(): Promise<Attachment[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec('SELECT id, task_id, filename, size, mime_type, stored_path, created_at FROM attachments ORDER BY created_at DESC');
  
  if (result.length === 0) return [];

  return result[0].values.map((row) => ({
    id: row[0] as string,
    taskId: row[1] as string,
    filename: row[2] as string,
    size: row[3] as number,
    mimeType: row[4] as string,
    storedPath: row[5] as string,
    createdAt: new Date(row[6] as number),
  }));
}
