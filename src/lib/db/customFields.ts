import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './index';

export interface CustomField {
  id: string;
  projectId: string;
  name: string;
  fieldType: 'text' | 'number' | 'enum' | 'date' | 'multi_enum';
  options: string[];
  createdAt: Date;
}

export async function createCustomField(
  projectId: string,
  name: string,
  fieldType: 'text' | 'number' | 'enum' | 'date' | 'multi_enum' = 'text',
  options: string[] = []
): Promise<CustomField> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const now = new Date();
  const id = uuidv4();

  db.run(
    'INSERT INTO custom_fields (id, project_id, name, field_type, options, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, projectId, name, fieldType, JSON.stringify(options), now.getTime()]
  );

  return {
    id,
    projectId,
    name,
    fieldType,
    options,
    createdAt: now,
  };
}

export async function getCustomFieldsByProject(projectId: string): Promise<CustomField[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec('SELECT id, project_id, name, field_type, options, created_at FROM custom_fields WHERE project_id = ?', [projectId]);
  
  if (result.length === 0) return [];

  return result[0].values.map((row) => ({
    id: row[0] as string,
    projectId: row[1] as string,
    name: row[2] as string,
    fieldType: row[3] as 'text' | 'number' | 'enum' | 'date' | 'multi_enum',
    options: row[4] ? JSON.parse(row[4] as string) : [],
    createdAt: new Date(row[5] as number),
  }));
}

export async function deleteCustomField(id: string): Promise<boolean> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  db.run('DELETE FROM custom_fields WHERE id = ?', [id]);
  return true;
}
