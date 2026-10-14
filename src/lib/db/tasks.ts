import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './index';
import { createStory } from './stories';

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskSubtype = 'default_task' | 'milestone' | 'approval_task';

export interface Task {
  id: string;
  phaseId: string;
  sectionId: string | null;
  parentTaskId: string | null;
  title: string;
  description: string | null;
  assignee: string | null;
  isPublic: boolean;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  progress: number;
  resourceSubtype?: TaskSubtype;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskUpdate {
  phaseId?: string | null;
  title?: string;
  description?: string | null;
  assignee?: string | null;
  isPublic?: boolean;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date | null;
  progress?: number;
  sectionId?: string | null;
  parentTaskId?: string | null;
  resourceSubtype?: TaskSubtype;
  updatedBy?: string | null;
}

function formatStatusLabel(status: TaskStatus): string {
  if (status === 'done') return 'completata';
  if (status === 'in_progress') return 'in corso';
  return 'da fare';
}

function formatPriorityLabel(priority: TaskPriority): string {
  if (priority === 'high') return 'alta';
  if (priority === 'low') return 'bassa';
  return 'media';
}

function formatDueDateLabel(value: Date | null): string {
  if (!value) return 'nessuna data';
  return value.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

function mapRowToTask(row: any[]): Task {
  return {
    id: row[0] as string,
    phaseId: (row[1] as string) || '',
    sectionId: row[2] as string | null,
    parentTaskId: row[3] as string | null,
    title: row[4] as string,
    description: row[5] as string | null,
    assignee: row[6] as string | null,
    isPublic: Number(row[7] || 0) === 1,
    status: row[8] as TaskStatus,
    priority: row[9] as TaskPriority,
    dueDate: row[10] ? new Date(row[10] as number) : null,
    progress: row[11] as number,
    resourceSubtype: (row[12] as TaskSubtype) || 'default_task',
    createdAt: new Date(row[13] as number),
    updatedAt: new Date(row[14] as number),
  };
}

export async function createTask(
  phaseId: string | null,
  title: string,
  description?: string,
  status: TaskStatus = 'todo',
  priority: TaskPriority = 'medium',
  dueDate?: Date,
  progress: number = 0,
  sectionId?: string | null,
  parentTaskId?: string | null,
  resourceSubtype: TaskSubtype = 'default_task',
  assignee?: string | null,
  isPublic: boolean = false
): Promise<Task> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const now = new Date();
  const id = uuidv4();

  db.run(
    `INSERT INTO tasks (id, phase_id, section_id, parent_task_id, title, description, assignee, is_public, status, priority, due_date, progress, resource_subtype, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      phaseId || null,
      sectionId || null,
      parentTaskId || null,
      title,
      description || null,
      assignee || null,
      isPublic ? 1 : 0,
      status,
      priority,
      dueDate ? dueDate.getTime() : null,
      progress,
      resourceSubtype,
      now.getTime(),
      now.getTime(),
    ]
  );

  const storyAuthor = (assignee || '').trim() || 'Sistema';
  try {
    await createStory(id, 'system', 'ha creato questa attività', storyAuthor);
  } catch (err) {
    console.error('Failed to create initial task story', err);
  }

  return {
    id,
    phaseId: phaseId || '',
    sectionId: sectionId || null,
    parentTaskId: parentTaskId || null,
    title,
    description: description || null,
    assignee: assignee || null,
    isPublic,
    status,
    priority,
    dueDate: dueDate || null,
    progress,
    resourceSubtype,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getTasks(): Promise<Task[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(
    'SELECT id, phase_id, section_id, parent_task_id, title, description, assignee, is_public, status, priority, due_date, progress, resource_subtype, created_at, updated_at FROM tasks ORDER BY created_at DESC'
  );

  if (result.length === 0) return [];

  return result[0].values.map(mapRowToTask);
}

export async function getTaskById(id: string): Promise<Task | null> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(
    'SELECT id, phase_id, section_id, parent_task_id, title, description, assignee, is_public, status, priority, due_date, progress, resource_subtype, created_at, updated_at FROM tasks WHERE id = ?',
    [id]
  );

  if (result.length === 0 || result[0].values.length === 0) return null;

  return mapRowToTask(result[0].values[0]);
}

export async function getTasksByPhaseId(phaseId: string): Promise<Task[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(
    'SELECT id, phase_id, section_id, parent_task_id, title, description, assignee, is_public, status, priority, due_date, progress, resource_subtype, created_at, updated_at FROM tasks WHERE phase_id = ? ORDER BY created_at DESC',
    [phaseId]
  );

  if (result.length === 0) return [];

  return result[0].values.map(mapRowToTask);
}

export async function getTasksBySectionId(sectionId: string): Promise<Task[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(
    'SELECT id, phase_id, section_id, parent_task_id, title, description, assignee, is_public, status, priority, due_date, progress, resource_subtype, created_at, updated_at FROM tasks WHERE section_id = ? ORDER BY created_at DESC',
    [sectionId]
  );

  if (result.length === 0) return [];

  return result[0].values.map(mapRowToTask);
}

export async function getTasksByProjectId(projectId: string): Promise<Task[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(
    `SELECT t.id, t.phase_id, t.section_id, t.parent_task_id, t.title, t.description, t.assignee, t.is_public, t.status, t.priority, t.due_date, t.progress, t.resource_subtype, t.created_at, t.updated_at 
     FROM tasks t
     JOIN phases p ON t.phase_id = p.id
     WHERE p.project_id = ?
     ORDER BY t.created_at DESC`,
    [projectId]
  );

  if (result.length === 0) return [];

  return result[0].values.map(mapRowToTask);
}

export async function updateTask(id: string, updates: TaskUpdate): Promise<Task | null> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const existing = await getTaskById(id);
  if (!existing) return null;

  const now = new Date();
  const phaseId = updates.phaseId !== undefined ? updates.phaseId : existing.phaseId;
  const title = updates.title ?? existing.title;
  const description = updates.description !== undefined ? updates.description : existing.description;
  const assignee = updates.assignee !== undefined ? updates.assignee : existing.assignee;
  const isPublic = updates.isPublic !== undefined ? updates.isPublic : existing.isPublic;
  const status = updates.status ?? existing.status;
  const priority = updates.priority ?? existing.priority;
  const dueDate = updates.dueDate !== undefined ? updates.dueDate : existing.dueDate;
  const progress = updates.progress ?? existing.progress;
  const sectionId = updates.sectionId !== undefined ? updates.sectionId : existing.sectionId;
  const parentTaskId = updates.parentTaskId !== undefined ? updates.parentTaskId : existing.parentTaskId;
  const updatedBy = updates.updatedBy !== undefined ? updates.updatedBy : null;

  const changeMessages: string[] = [];
  if (title !== existing.title) changeMessages.push(`titolo "${title}"`);
  if (description !== existing.description) {
    changeMessages.push(description ? 'descrizione aggiornata' : 'descrizione rimossa');
  }
  if (assignee !== existing.assignee) {
    changeMessages.push(`assegnatario: ${assignee || 'nessuno'}`);
  }
  if (isPublic !== existing.isPublic) {
    changeMessages.push(isPublic ? 'visibilità: pubblica' : 'visibilità: privata');
  }
  if (status !== existing.status) {
    changeMessages.push(`stato: ${formatStatusLabel(status)}`);
  }
  if (priority !== existing.priority) {
    changeMessages.push(`priorità: ${formatPriorityLabel(priority)}`);
  }
  if ((dueDate?.getTime() || 0) !== (existing.dueDate?.getTime() || 0)) {
    changeMessages.push(`scadenza: ${formatDueDateLabel(dueDate)}`);
  }
  if (progress !== existing.progress) {
    changeMessages.push(`avanzamento: ${progress}%`);
  }

  db.run(
    `UPDATE tasks SET phase_id = ?, title = ?, description = ?, assignee = ?, is_public = ?, status = ?, priority = ?, due_date = ?, progress = ?, section_id = ?, parent_task_id = ?, updated_at = ? WHERE id = ?`,
    [
      phaseId || null,
      title,
      description,
      assignee || null,
      isPublic ? 1 : 0,
      status,
      priority,
      dueDate ? dueDate.getTime() : null,
      progress,
      sectionId,
      parentTaskId,
      now.getTime(),
      id,
    ]
  );

  if (changeMessages.length > 0) {
    const author = (updatedBy || assignee || existing.assignee || 'Sistema').trim();
    try {
      await createStory(id, 'system', `ha modificato ${changeMessages.join(' · ')}`, author || 'Sistema');
    } catch (err) {
      console.error('Failed to create task update story', err);
    }
  }

  return getTaskById(id);
}

export async function deleteTask(id: string): Promise<boolean> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  db.run('DELETE FROM tasks WHERE id = ?', [id]);
  return true;
}

export async function getTasksByStatus(status: TaskStatus): Promise<Task[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(
    'SELECT id, phase_id, section_id, parent_task_id, title, description, assignee, is_public, status, priority, due_date, progress, resource_subtype, created_at, updated_at FROM tasks WHERE status = ? ORDER BY created_at DESC',
    [status]
  );

  if (result.length === 0) return [];

  return result[0].values.map(mapRowToTask);
}

export async function getTasksDueToday(): Promise<Task[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const result = db.exec(
    'SELECT id, phase_id, section_id, parent_task_id, title, description, assignee, is_public, status, priority, due_date, progress, resource_subtype, created_at, updated_at FROM tasks WHERE due_date >= ? AND due_date < ? ORDER BY due_date ASC',
    [today.getTime(), tomorrow.getTime()]
  );

  if (result.length === 0) return [];

  return result[0].values.map(mapRowToTask);
}

export async function getTasksDueThisWeek(): Promise<Task[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const result = db.exec(
    'SELECT id, phase_id, section_id, parent_task_id, title, description, assignee, is_public, status, priority, due_date, progress, resource_subtype, created_at, updated_at FROM tasks WHERE due_date >= ? AND due_date < ? ORDER BY due_date ASC',
    [today.getTime(), nextWeek.getTime()]
  );

  if (result.length === 0) return [];

  return result[0].values.map(mapRowToTask);
}

export async function getTasksDueLater(): Promise<Task[]> {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const nextWeek = new Date();
  nextWeek.setHours(0, 0, 0, 0);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const result = db.exec(
    'SELECT id, phase_id, section_id, parent_task_id, title, description, assignee, is_public, status, priority, due_date, progress, resource_subtype, created_at, updated_at FROM tasks WHERE due_date >= ? ORDER BY due_date ASC',
    [nextWeek.getTime()]
  );

  if (result.length === 0) return [];

  return result[0].values.map(mapRowToTask);
}

export async function getAllTasksData(): Promise<{ tasks: Task[] }> {
  const tasksList = await getTasks();
  return { tasks: tasksList };
}
