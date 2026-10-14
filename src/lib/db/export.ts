import { get, set, keys } from 'idb-keyval';
import { getAllTeamsData } from './teams';
import { getAllProjectsData } from './projects';
import { getAllPhasesData } from './phases';
import { getAllTasksData } from './tasks';
import { getAllTags } from './tags';
import { getAllSections } from './sections';
import { getAllAttachments } from './attachments';
import { getAllStories } from './stories';
import { getAllSubtasks } from './subtasks';
import { getAllDependencies } from './taskDependencies';
import { getAllTeamMembers } from './teamMembers';
import { getDatabase, CURRENT_SCHEMA_VERSION } from './index';

const BACKUP_KEY_PREFIX = 'vayana-backup-';
const MAX_BACKUPS = 3;

export interface ExportData {
  schemaVersion: number;
  exportedAt: string;
  data: {
    teams: Array<{
      id: string;
      name: string;
      createdAt: string;
      updatedAt: string;
    }>;
    teamMembers: Array<{
      id: string;
      teamId: string;
      fullName: string;
      email: string | null;
      role: string;
      createdAt: string;
      updatedAt: string;
    }>;
    projects: Array<{
      id: string;
      teamId: string | null;
      name: string;
      description: string | null;
      boardMode: string;
      createdAt: string;
      updatedAt: string;
    }>;
    phases: Array<{
      id: string;
      projectId: string;
      name: string;
      sortOrder: number;
      createdAt: string;
      updatedAt: string;
    }>;
    sections: Array<{
      id: string;
      projectId: string;
      name: string;
      sortOrder: number;
      createdAt: string;
      updatedAt: string;
    }>;
    tasks: Array<{
      id: string;
      phaseId: string;
      sectionId: string | null;
      parentTaskId: string | null;
      title: string;
      description: string | null;
      status: string;
      priority: string;
      dueDate: string | null;
      progress: number;
      createdAt: string;
      updatedAt: string;
    }>;
    tags: Array<{
      id: string;
      projectId: string;
      name: string;
      color: string;
      createdAt: string;
      updatedAt: string;
    }>;
    taskTags: Array<{
      taskId: string;
      tagId: string;
    }>;
    attachments: Array<{
      id: string;
      taskId: string;
      filename: string;
      size: number;
      mimeType: string;
      storedPath: string;
      createdAt: string;
    }>;
    stories: Array<{
      id: string;
      taskId: string;
      type: string;
      content: string;
      author: string;
      createdAt: string;
      updatedAt: string;
    }>;
    subtasks: Array<{
      id: string;
      parentTaskId: string;
      childTaskId: string;
    }>;
    taskDependencies: Array<{
      taskId: string;
      dependsOnTaskId: string;
      dependencyType: string;
    }>;
  };
}

export interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
}

export async function exportData(): Promise<ExportData> {
  const { teams } = await getAllTeamsData();
  const teamMembers = await getAllTeamMembers();
  const { projects } = await getAllProjectsData();
  const { phases } = await getAllPhasesData();
  const { tasks } = await getAllTasksData();
  const tags = await getAllTags();
  const sections = await getAllSections();
  const attachments = await getAllAttachments();
  const stories = await getAllStories();
  const subtasks = await getAllSubtasks();
  const taskDependencies = await getAllDependencies();

  const exportData: ExportData = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      teams: teams.map((team) => ({
        id: team.id,
        name: team.name,
        createdAt: team.createdAt.toISOString(),
        updatedAt: team.updatedAt.toISOString(),
      })),
      teamMembers: teamMembers.map((member) => ({
        id: member.id,
        teamId: member.teamId,
        fullName: member.fullName,
        email: member.email,
        role: member.role,
        createdAt: member.createdAt.toISOString(),
        updatedAt: member.updatedAt.toISOString(),
      })),
      projects: projects.map((project) => ({
        id: project.id,
        teamId: project.teamId,
        name: project.name,
        description: project.description,
        boardMode: (project as any).boardMode || 'phases',
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      })),
      phases: phases.map((phase) => ({
        id: phase.id,
        projectId: phase.projectId,
        name: phase.name,
        sortOrder: phase.sortOrder,
        createdAt: phase.createdAt.toISOString(),
        updatedAt: phase.updatedAt.toISOString(),
      })),
      sections: sections.map((section) => ({
        id: section.id,
        projectId: section.projectId,
        name: section.name,
        sortOrder: section.sortOrder,
        createdAt: section.createdAt.toISOString(),
        updatedAt: section.updatedAt.toISOString(),
      })),
      tasks: tasks.map((task) => ({
        id: task.id,
        phaseId: task.phaseId,
        sectionId: (task as any).sectionId || null,
        parentTaskId: (task as any).parentTaskId || null,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        progress: task.progress,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      })),
      tags: tags.map((tag) => ({
        id: tag.id,
        projectId: tag.projectId,
        name: tag.name,
        color: tag.color,
        createdAt: tag.createdAt.toISOString(),
        updatedAt: tag.updatedAt.toISOString(),
      })),
      taskTags: [] as { taskId: string; tagId: string }[],
      attachments: attachments.map((attachment) => ({
        id: attachment.id,
        taskId: attachment.taskId,
        filename: attachment.filename,
        size: attachment.size,
        mimeType: attachment.mimeType,
        storedPath: attachment.storedPath,
        createdAt: attachment.createdAt.toISOString(),
      })),
      stories: stories.map((story) => ({
        id: story.id,
        taskId: story.taskId,
        type: story.type,
        content: story.content,
        author: story.author,
        createdAt: story.createdAt.toISOString(),
        updatedAt: story.updatedAt.toISOString(),
      })),
      subtasks: subtasks.map((st) => ({
        id: st.id,
        parentTaskId: st.parentTaskId,
        childTaskId: st.childTaskId,
      })),
      taskDependencies: taskDependencies.map((td) => ({
        taskId: td.taskId,
        dependsOnTaskId: td.dependsOnTaskId,
        dependencyType: td.dependencyType,
      })),
    },
  };

  const db = getDatabase();
  if (db) {
    const taskTagsResult = db.exec('SELECT task_id, tag_id FROM task_tags');
    if (taskTagsResult.length > 0) {
      exportData.data.taskTags = taskTagsResult[0].values.map((row) => ({
        taskId: row[0] as string,
        tagId: row[1] as string,
      }));
    }
  }

  return exportData;
}

export function downloadExport(data: ExportData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `vayana-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function createBackup(): Promise<void> {
  const { teams } = await getAllTeamsData();
  const { projects } = await getAllProjectsData();
  const { phases } = await getAllPhasesData();
  const { tasks } = await getAllTasksData();
  
  const backup = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    data: { teams, projects, phases, tasks },
  };

  const timestamp = Date.now();
  await set(`${BACKUP_KEY_PREFIX}${timestamp}`, backup);

  // Clean up old backups
  const allKeys = await keys();
  const backupKeys = allKeys
    .filter((k) => typeof k === 'string' && k.startsWith(BACKUP_KEY_PREFIX))
    .sort()
    .reverse();

  if (backupKeys.length > MAX_BACKUPS) {
    // Note: Backup cleanup - in production, implement selective deletion
    // For now, we keep all backups until next run
  }
}

export async function getBackups(): Promise<Array<{ timestamp: string; teamCount: number; projectCount: number; phaseCount: number; taskCount: number }>> {
  const allKeys = await keys();
  const backupKeys = allKeys
    .filter((k) => typeof k === 'string' && k.startsWith(BACKUP_KEY_PREFIX))
    .sort()
    .reverse();

  const backups: Array<{ timestamp: string; teamCount: number; projectCount: number; phaseCount: number; taskCount: number }> = [];
  
  for (const key of backupKeys.slice(0, MAX_BACKUPS)) {
    const keyStr = String(key);
    const backup = await get<any>(keyStr);
    if (backup) {
      backups.push({
        timestamp: keyStr.replace(BACKUP_KEY_PREFIX, ''),
        teamCount: backup.data?.teams?.length || 0,
        projectCount: backup.data?.projects?.length || 0,
        phaseCount: backup.data?.phases?.length || 0,
        taskCount: backup.data?.tasks?.length || 0,
      });
    }
  }

  return backups;
}

export async function importData(
  jsonString: string,
  mode: 'merge' | 'overwrite'
): Promise<ImportResult> {
  const errors: string[] = [];
  let imported = 0;

  let parsed: ExportData;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { success: false, imported: 0, errors: ['Invalid JSON format'] };
  }

  if (!parsed.schemaVersion) {
    errors.push('Missing schema version');
  } else if (parsed.schemaVersion > CURRENT_SCHEMA_VERSION) {
    errors.push(`Incompatible schema version: ${parsed.schemaVersion}. Maximum supported: ${CURRENT_SCHEMA_VERSION}`);
  }

  if (!parsed.data || !parsed.data.teams) {
    errors.push('Invalid data structure: missing teams array');
  }

  if (errors.length > 0) {
    return { success: false, imported: 0, errors };
  }

  await createBackup();

  const db = getDatabase();
  if (!db) {
    return { success: false, imported: 0, errors: ['Database not initialized'] };
  }

  if (mode === 'overwrite') {
    db.run('DELETE FROM team_members');
    db.run('DELETE FROM tasks');
    db.run('DELETE FROM phases');
    db.run('DELETE FROM projects');
    db.run('DELETE FROM teams');
  }

  const existingTeamIds = new Set<string>();
  if (mode === 'merge') {
    const teamsResult = db.exec('SELECT id FROM teams');
    if (teamsResult.length > 0) {
      teamsResult[0].values.forEach(row => existingTeamIds.add(row[0] as string));
    }
  }

  for (const team of parsed.data.teams) {
    if (!team.id || !team.name) {
      errors.push(`Invalid team: missing required fields`);
      continue;
    }

    if (typeof team.name !== 'string' || team.name.trim() === '') {
      errors.push(`Invalid team name for ID ${team.id}`);
      continue;
    }

    const createdAt = new Date(team.createdAt).getTime();
    const updatedAt = new Date(team.updatedAt).getTime();

    if (isNaN(createdAt) || isNaN(updatedAt)) {
      errors.push(`Invalid timestamps for team ${team.id}`);
      continue;
    }

    db.run(
      `INSERT OR REPLACE INTO teams (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      [team.id, team.name, createdAt, updatedAt]
    );

    imported++;
  }

  for (const member of (parsed.data.teamMembers || [])) {
    if (!member.id || !member.teamId || !member.fullName) {
      errors.push('Invalid team member: missing required fields');
      continue;
    }

    const createdAt = new Date(member.createdAt).getTime();
    const updatedAt = new Date(member.updatedAt).getTime();
    if (isNaN(createdAt) || isNaN(updatedAt)) {
      errors.push(`Invalid timestamps for team member ${member.id}`);
      continue;
    }

    db.run(
      `INSERT OR REPLACE INTO team_members (id, team_id, full_name, email, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        member.id,
        member.teamId,
        member.fullName,
        member.email || null,
        member.role || 'member',
        createdAt,
        updatedAt,
      ]
    );
  }

  const existingProjectIds = new Set<string>();
  if (mode === 'merge') {
    const projectsResult = db.exec('SELECT id FROM projects');
    if (projectsResult.length > 0) {
      projectsResult[0].values.forEach(row => existingProjectIds.add(row[0] as string));
    }
  }

  const validTeamIds = new Set<string>();
  const teamsResult = db.exec('SELECT id FROM teams');
  if (teamsResult.length > 0) {
    teamsResult[0].values.forEach(row => validTeamIds.add(row[0] as string));
  }

  for (const project of (parsed.data.projects || [])) {
    if (!project.id || !project.name || !project.teamId) {
      errors.push(`Invalid project: missing required fields`);
      continue;
    }

    if (!validTeamIds.has(project.teamId)) {
      errors.push(`Invalid team ID ${project.teamId} for project ${project.id}`);
      continue;
    }

    const createdAt = new Date(project.createdAt).getTime();
    const updatedAt = new Date(project.updatedAt).getTime();

    if (isNaN(createdAt) || isNaN(updatedAt)) {
      errors.push(`Invalid timestamps for project ${project.id}`);
      continue;
    }

    db.run(
      `INSERT OR REPLACE INTO projects (id, team_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [project.id, project.teamId, project.name, project.description || null, createdAt, updatedAt]
    );

    imported++;
  }

  for (const phase of (parsed.data.phases || [])) {
    if (!phase.id || !phase.name || !phase.projectId) {
      errors.push(`Invalid phase: missing required fields`);
      continue;
    }

    const validProjectIds = new Set<string>();
    const projectsResult = db.exec('SELECT id FROM projects');
    if (projectsResult.length > 0) {
      projectsResult[0].values.forEach(row => validProjectIds.add(row[0] as string));
    }

    if (!validProjectIds.has(phase.projectId)) {
      errors.push(`Invalid project ID ${phase.projectId} for phase ${phase.id}`);
      continue;
    }

    const createdAt = new Date(phase.createdAt).getTime();
    const updatedAt = new Date(phase.updatedAt).getTime();

    if (isNaN(createdAt) || isNaN(updatedAt)) {
      errors.push(`Invalid timestamps for phase ${phase.id}`);
      continue;
    }

    db.run(
      `INSERT OR REPLACE INTO phases (id, project_id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [phase.id, phase.projectId, phase.name, phase.sortOrder || 0, createdAt, updatedAt]
    );

    imported++;
  }

  for (const task of (parsed.data.tasks || [])) {
    if (!task.id || !task.title) {
      errors.push(`Invalid task: missing required fields`);
      continue;
    }

    const validPhaseIds = new Set<string>();
    const phasesResult = db.exec('SELECT id FROM phases');
    if (phasesResult.length > 0) {
      phasesResult[0].values.forEach(row => validPhaseIds.add(row[0] as string));
    }

    if (task.phaseId && !validPhaseIds.has(task.phaseId)) {
      errors.push(`Invalid phase ID ${task.phaseId} for task ${task.id}`);
      continue;
    }

    const createdAt = new Date(task.createdAt).getTime();
    const updatedAt = new Date(task.updatedAt).getTime();

    if (isNaN(createdAt) || isNaN(updatedAt)) {
      errors.push(`Invalid timestamps for task ${task.id}`);
      continue;
    }

    db.run(
      `INSERT OR REPLACE INTO tasks (id, phase_id, title, description, status, priority, due_date, progress, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        task.phaseId || null,
        task.title,
        task.description || null,
        task.status || 'todo',
        task.priority || 'medium',
        task.dueDate ? new Date(task.dueDate).getTime() : null,
        task.progress || 0,
        createdAt,
        updatedAt,
      ]
    );

    imported++;
  }

  return {
    success: errors.length === 0,
    imported,
    errors,
  };
}

export function validateImportData(jsonString: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed.schemaVersion) {
      errors.push('Missing schema version');
    }

    if (!parsed.data?.teams || !Array.isArray(parsed.data.teams)) {
      errors.push('Invalid data structure: teams array required');
      return { valid: false, errors };
    }

    for (const team of parsed.data.teams) {
      if (!team.id) errors.push('Team missing id');
      if (!team.name) errors.push('Team missing name');
      if (team.createdAt && isNaN(new Date(team.createdAt).getTime())) {
        errors.push(`Invalid createdAt for team ${team.id}`);
      }
      if (team.updatedAt && isNaN(new Date(team.updatedAt).getTime())) {
        errors.push(`Invalid updatedAt for team ${team.id}`);
      }
    }

    if (parsed.data.projects) {
      for (const project of parsed.data.projects) {
        if (!project.id) errors.push('Project missing id');
        if (!project.name) errors.push('Project missing name');
        if (!project.teamId) errors.push('Project missing teamId');
        if (project.createdAt && isNaN(new Date(project.createdAt).getTime())) {
          errors.push(`Invalid createdAt for project ${project.id}`);
        }
        if (project.updatedAt && isNaN(new Date(project.updatedAt).getTime())) {
          errors.push(`Invalid updatedAt for project ${project.id}`);
        }
      }
    }

    if (parsed.data.phases) {
      for (const phase of parsed.data.phases) {
        if (!phase.id) errors.push('Phase missing id');
        if (!phase.name) errors.push('Phase missing name');
        if (!phase.projectId) errors.push('Phase missing projectId');
        if (phase.createdAt && isNaN(new Date(phase.createdAt).getTime())) {
          errors.push(`Invalid createdAt for phase ${phase.id}`);
        }
        if (phase.updatedAt && isNaN(new Date(phase.updatedAt).getTime())) {
          errors.push(`Invalid updatedAt for phase ${phase.id}`);
        }
      }
    }

    if (parsed.data.tasks) {
      for (const task of parsed.data.tasks) {
        if (!task.id) errors.push('Task missing id');
        if (!task.title) errors.push('Task missing title');
        // phaseId is optional for personal tasks without project
        if (task.createdAt && isNaN(new Date(task.createdAt).getTime())) {
          errors.push(`Invalid createdAt for task ${task.id}`);
        }
        if (task.updatedAt && isNaN(new Date(task.updatedAt).getTime())) {
          errors.push(`Invalid updatedAt for task ${task.id}`);
        }
      }
    }
  } catch {
    errors.push('Invalid JSON format');
  }

  return { valid: errors.length === 0, errors };
}
