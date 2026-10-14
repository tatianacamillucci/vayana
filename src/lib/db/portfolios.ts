import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './index';

export interface Portfolio {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function createPortfolio(name: string, description?: string): Promise<Portfolio> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const now = new Date();
  const id = uuidv4();

  db.run(
    'INSERT INTO portfolios (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [id, name, description || null, now.getTime(), now.getTime()]
  );

  return {
    id,
    name,
    description: description || null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getPortfolios(): Promise<Portfolio[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec('SELECT id, name, description, created_at, updated_at FROM portfolios ORDER BY created_at DESC');
  
  if (result.length === 0) return [];

  return result[0].values.map((row) => ({
    id: row[0] as string,
    name: row[1] as string,
    description: row[2] as string | null,
    createdAt: new Date(row[3] as number),
    updatedAt: new Date(row[4] as number),
  }));
}

export async function deletePortfolio(id: string): Promise<boolean> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  db.run('DELETE FROM portfolios WHERE id = ?', [id]);
  return true;
}

export async function addProjectToPortfolio(portfolioId: string, projectId: string): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  db.run(
    'INSERT OR IGNORE INTO portfolio_projects (portfolio_id, project_id) VALUES (?, ?)',
    [portfolioId, projectId]
  );
}

export async function removeProjectFromPortfolio(portfolioId: string, projectId: string): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  db.run('DELETE FROM portfolio_projects WHERE portfolio_id = ? AND project_id = ?', [portfolioId, projectId]);
}

export async function getProjectsByPortfolio(portfolioId: string): Promise<string[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec('SELECT project_id FROM portfolio_projects WHERE portfolio_id = ?', [portfolioId]);
  
  if (result.length === 0) return [];

  return result[0].values.map(row => row[0] as string);
}
