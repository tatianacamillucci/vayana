import type { Database } from 'sql.js';
import { get, set, del } from 'idb-keyval';

export type { Database };

const DB_KEY = 'vayana-db';
const CURRENT_SCHEMA_VERSION = 6;

let dbInstance: Database | null = null;
let sqlJsLoaded: any = null;
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSaveDatabase(): void {
  if (!dbInstance) return;

  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }

  saveDebounceTimer = setTimeout(() => {
    saveDebounceTimer = null;
    void saveDatabase();
  }, 150);
}

async function loadSqlJs(): Promise<any> {
  if (sqlJsLoaded) return sqlJsLoaded;
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://sql.js.org/dist/sql-wasm.js';
    script.onload = () => {
      // @ts-ignore
      sqlJsLoaded = window.initSqlJs({
        locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
      });
      resolve(sqlJsLoaded);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function initializeDatabase(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  // Initialize sql.js
  const SQL = await loadSqlJs();

  // Try to load existing database from IndexedDB
  const savedDb = await get(DB_KEY);

  if (savedDb) {
    dbInstance = new SQL.Database(new Uint8Array(savedDb));
    console.log('Database loaded from IndexedDB');
  } else {
    dbInstance = new SQL.Database();
    console.log('New database created');
  }

  // Check and create schema if needed
  const schemaVersion = getSchemaVersion();
  if (schemaVersion < CURRENT_SCHEMA_VERSION) {
    createSchema();
    setSchemaVersion(CURRENT_SCHEMA_VERSION);
    await saveDatabase();
    console.log('Schema created and saved');
  }

  // Auto-persist every mutating query to avoid losing data on refresh.
  const dbAny = dbInstance as any;
  if (!dbAny.__vayanaAutoPersistPatched) {
    const originalRun = dbAny.run.bind(dbInstance);
    dbAny.run = (...args: any[]) => {
      const result = originalRun(...args);
      scheduleSaveDatabase();
      return result;
    };
    dbAny.__vayanaAutoPersistPatched = true;
  }

  return dbInstance!;
}

function getSchemaVersion(): number {
  if (!dbInstance) return 0;
  
  try {
    const result = dbInstance.exec("SELECT value FROM metadata WHERE key = 'schema_version'");
    if (result.length > 0 && result[0].values.length > 0) {
      return parseInt(result[0].values[0][0] as string, 10);
    }
  } catch {
    // Table doesn't exist yet
  }
  return 0;
}

function setSchemaVersion(version: number): void {
  if (!dbInstance) return;
  
  try {
    dbInstance.run(`
      INSERT OR REPLACE INTO metadata (key, value) VALUES ('schema_version', '${version}')
    `);
  } catch {
    // Ignore if table doesn't exist
  }
}

function createSchema(): void {
  if (!dbInstance) return;

  // Create metadata table for schema version
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Create teams table
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Create projects table
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      team_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      board_mode TEXT NOT NULL DEFAULT 'phases',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
    )
  `);

  // Create team members table
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL DEFAULT 'member',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    )
  `);

  // Create phases table
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS phases (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Create sections table
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Create tasks table
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      phase_id TEXT,
      section_id TEXT,
      parent_task_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      assignee TEXT,
      is_public INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date INTEGER,
      progress INTEGER NOT NULL DEFAULT 0,
      resource_subtype TEXT DEFAULT 'default_task',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE SET NULL,
      FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL,
      FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `);

  // Create task_projects junction table for multi-home tasks
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS task_projects (
      task_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      PRIMARY KEY (task_id, project_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Create custom_fields table
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS custom_fields (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      field_type TEXT NOT NULL DEFAULT 'text',
      options TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Create custom_field_values table
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS custom_field_values (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      field_id TEXT NOT NULL,
      value TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (field_id) REFERENCES custom_fields(id) ON DELETE CASCADE
    )
  `);

  // Create followers table
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS task_followers (
      task_id TEXT NOT NULL,
      follower_id TEXT NOT NULL,
      PRIMARY KEY (task_id, follower_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `);

  // Create portfolios table
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS portfolios (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Create portfolio_projects junction table
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS portfolio_projects (
      portfolio_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      PRIMARY KEY (portfolio_id, project_id),
      FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Create tags table
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6b7280',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Create task_tags junction table
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS task_tags (
      task_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (task_id, tag_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);

  // Create attachments table
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      stored_path TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `);

  // Create stories table
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `);

  // Create subtasks junction table
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      parent_task_id TEXT NOT NULL,
      child_task_id TEXT NOT NULL,
      FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (child_task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `);

  // Create task_dependencies junction table
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS task_dependencies (
      task_id TEXT NOT NULL,
      depends_on_task_id TEXT NOT NULL,
      dependency_type TEXT NOT NULL,
      PRIMARY KEY (task_id, depends_on_task_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `);

  // Add columns to existing tables if they don't exist (for upgrades)
  try {
    dbInstance.run("ALTER TABLE projects ADD COLUMN board_mode TEXT NOT NULL DEFAULT 'phases'");
  } catch {
    // Column may already exist
  }

  try {
    dbInstance.run("ALTER TABLE tasks ADD COLUMN section_id TEXT");
  } catch {
    // Column may already exist
  }

  try {
    dbInstance.run("ALTER TABLE tasks ADD COLUMN parent_task_id TEXT");
  } catch {
    // Column may already exist
  }

  try {
    dbInstance.run("ALTER TABLE tasks ADD COLUMN assignee TEXT");
  } catch {
    // Column may already exist
  }

  try {
    dbInstance.run("ALTER TABLE tasks ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0");
  } catch {
    // Column may already exist
  }
}

export async function saveDatabase(): Promise<void> {
  if (!dbInstance) return;
  
  const data = dbInstance.export();
  const buffer = new Uint8Array(data);
  await set(DB_KEY, buffer);
}

export async function clearDatabase(): Promise<void> {
  await del(DB_KEY);
  dbInstance = null;
}

export function getDatabase(): Database | null {
  return dbInstance;
}

export { CURRENT_SCHEMA_VERSION };
