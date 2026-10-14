import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const teams = sqliteTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  boardMode: text('board_mode', { enum: ['phases', 'sections'] }).notNull().default('phases'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const phases = sqliteTable('phases', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const sections = sqliteTable('sections', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  phaseId: text('phase_id').notNull(),
  sectionId: text('section_id'),
  parentTaskId: text('parent_task_id'),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('todo'),
  priority: text('priority').notNull().default('medium'),
  dueDate: integer('due_date', { mode: 'timestamp' }),
  progress: integer('progress').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  name: text('name').notNull(),
  color: text('color').notNull().default('#6b7280'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const taskTags = sqliteTable('task_tags', {
  taskId: text('task_id').notNull(),
  tagId: text('tag_id').notNull(),
});

export const attachments = sqliteTable('attachments', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull(),
  filename: text('filename').notNull(),
  size: integer('size').notNull(),
  mimeType: text('mime_type').notNull(),
  storedPath: text('stored_path').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const stories = sqliteTable('stories', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull(),
  type: text('type', { enum: ['system', 'comment'] }).notNull(),
  content: text('content').notNull(),
  author: text('author').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const subtasks = sqliteTable('subtasks', {
  id: text('id').primaryKey(),
  parentTaskId: text('parent_task_id').notNull(),
  childTaskId: text('child_task_id').notNull(),
});

export const taskDependencies = sqliteTable('task_dependencies', {
  taskId: text('task_id').notNull(),
  dependsOnTaskId: text('depends_on_task_id').notNull(),
  dependencyType: text('dependency_type', { enum: ['blocks', 'is_blocked_by'] }).notNull(),
});

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Phase = typeof phases.$inferSelect;
export type NewPhase = typeof phases.$inferInsert;
export type Section = typeof sections.$inferSelect;
export type NewSection = typeof sections.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type TaskTag = typeof taskTags.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;
export type Story = typeof stories.$inferSelect;
export type NewStory = typeof stories.$inferInsert;
export type Subtask = typeof subtasks.$inferSelect;
export type TaskDependency = typeof taskDependencies.$inferSelect;
