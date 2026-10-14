import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createAttachment, deleteAttachment, getAttachmentsByTask } from '../lib/db/attachments';
import { getFile, storeFile } from '../lib/db/fileStorage';
import { addFollower, getFollowersByTask, removeFollower } from '../lib/db/followers';
import { createStory, deleteStory, getStoriesByTask, Story } from '../lib/db/stories';
import { createPhase, Phase, getPhasesByProjectId } from '../lib/db/phases';
import { createProject, Project } from '../lib/db/projects';
import { addTaskToProject, getProjectsByTaskId, removeAllProjectMemberships, removeTaskFromProject } from '../lib/db/taskProjects';
import { createTask, deleteTask, Task, updateTask } from '../lib/db/tasks';
import { Team } from '../lib/db/teams';
import { TeamMember } from '../lib/db/teamMembers';
import { PaperclipIcon } from './PaperclipIcon';
import { apiClient } from '@/lib/api/client';
import { Attachment as ApiAttachment, getAttachmentDownloadUrl, useDeleteAttachment, useTaskAttachments, useUploadAttachment } from '@/lib/hooks/useAttachments';

interface TaskDetailPanelProps {
  task: Task;
  currentUserName: string;
  projects: Project[];
  phases: Phase[];
  teams: Team[];
  teamMembers: TeamMember[];
  allTasks: Task[];
  onOpenProject?: (projectId: string) => void;
  onOpenTask?: (taskId: string) => void;
  onClose: () => void;
  onUpdated: () => Promise<void> | void;
}

type MentionType = 'utente' | 'progetto' | 'task' | 'team';

interface MentionTarget {
  value: string;
  type: MentionType;
}

interface AttachmentItem {
  id: string;
  taskId: string;
  filename: string;
  size: number;
  mimeType: string;
  storedPath?: string;
  downloadUrl?: string;
  createdAt?: Date | string;
}

const DESCRIPTION_TOOLS = ['+', 'B', 'I', 'U', 'S', '•', '1.', '↩', 'Link', '{ }', '</>', '*'];
const COMMENT_TOOLS = ['+', 'A', ':)', '@', '☆', '📎', '*'];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return 'U';
  return parts.map((part) => part[0].toUpperCase()).join('');
}

function getAvatarColor(seed: string): string {
  const palette = ['#7a6ff0', '#2f8ed6', '#2f9f88', '#8b79d9', '#4b9fca', '#4d8fb6', '#6d7fa8'];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

function getCaretCoords(el: HTMLTextAreaElement): { top: number; left: number } {
  const style = window.getComputedStyle(el);
  const mirror = document.createElement('div');
  const elRect = el.getBoundingClientRect();
  mirror.style.position = 'fixed';
  mirror.style.top = elRect.top + 'px';
  mirror.style.left = elRect.left + 'px';
  mirror.style.width = elRect.width + 'px';
  mirror.style.overflow = 'hidden';
  mirror.style.visibility = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.overflowWrap = 'break-word';
  mirror.style.wordBreak = 'break-word';
  (['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'boxSizing'] as const).forEach((prop) => {
    (mirror.style as unknown as Record<string, string>)[prop] = style.getPropertyValue(prop);
  });
  const caretPos = el.selectionStart ?? el.value.length;
  mirror.textContent = el.value.substring(0, caretPos);
  const caretSpan = document.createElement('span');
  caretSpan.textContent = '\u200b';
  mirror.appendChild(caretSpan);
  document.body.appendChild(mirror);
  const caretRect = caretSpan.getBoundingClientRect();
  document.body.removeChild(mirror);
  const lineHeight = parseInt(style.lineHeight) || 20;
  return { top: caretRect.top + lineHeight + 4, left: caretRect.left };
}

function readMentionQuery(value: string, caret: number): string | null {
  const left = value.slice(0, caret);
  const match = left.match(/@([a-zA-Z0-9À-ÿ_.-]{0,40})$/);
  if (!match) return null;
  return match[1];
}

function applyMentionAtCaret(value: string, caret: number, mentionValue: string): { value: string; caret: number } {
  const left = value.slice(0, caret);
  const right = value.slice(caret);
  const match = left.match(/@([a-zA-Z0-9À-ÿ_.-]{0,40})$/);
  if (!match) {
    const next = `${left}@${mentionValue} ${right}`;
    return { value: next, caret: (left + `@${mentionValue} `).length };
  }

  const query = match[1] || '';
  const start = left.length - query.length - 1;
  const nextLeft = `${left.slice(0, start)}@${mentionValue} `;
  const next = `${nextLeft}${right}`;
  return { value: next, caret: nextLeft.length };
}

function formatItDate(value: Date | null): string {
  if (!value) return 'Nessuna data di scadenza';
  return value.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatShortDueDate(value: Date | null): string {
  if (!value) return '';
  return value.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

function formatStoryTime(value: Date): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const startOfDayAfterTomorrow = new Date(startOfTomorrow);
  startOfDayAfterTomorrow.setDate(startOfDayAfterTomorrow.getDate() + 1);

  const time = value.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  if (value >= startOfToday && value < startOfTomorrow) {
    return `Oggi, ${time}`;
  }

  if (value >= startOfTomorrow && value < startOfDayAfterTomorrow) {
    return `Domani, ${time}`;
  }

  return value.toLocaleString('it-IT', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TaskDetailPanel({
  task,
  currentUserName,
  projects,
  phases,
  teams,
  teamMembers,
  allTasks,
  onOpenProject,
  onOpenTask,
  onClose,
  onUpdated,
}: TaskDetailPanelProps): React.ReactElement {
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const commentRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const commentFileInputRef = useRef<HTMLInputElement | null>(null);
  const assigneeRef = useRef<HTMLDivElement | null>(null);
  const dueRef = useRef<HTMLDivElement | null>(null);
  const projectRef = useRef<HTMLDivElement | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const subtaskCalendarRef = useRef<HTMLDivElement | null>(null);
  const panelContentRef = useRef<HTMLDivElement | null>(null);
  const [duePosStyle, setDuePosStyle] = useState<React.CSSProperties>({});
  const [subtaskDuePosStyle, setSubtaskDuePosStyle] = useState<React.CSSProperties>({});

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState(task.status);
  const [assignee, setAssignee] = useState(task.assignee || currentUserName);
  const [dueDate, setDueDate] = useState<Date | null>(task.dueDate || null);
  const [isPublic, setIsPublic] = useState(task.isPublic);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [stories, setStories] = useState<Story[]>([]);
  const [comment, setComment] = useState('');
  const [notifyCollaborators, setNotifyCollaborators] = useState(false);
  const [notifyRecipients, setNotifyRecipients] = useState<string[]>([]);
  const [showNotifyPicker, setShowNotifyPicker] = useState(false);
  const [activityTab, setActivityTab] = useState<'comments' | 'all'>('comments');
  const [activitySort, setActivitySort] = useState<'desc' | 'asc'>('desc');
  const [followers, setFollowers] = useState<string[]>([]);
  const [newFollowerName, setNewFollowerName] = useState('');
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<Record<string, string>>({});
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [attachmentTab, setAttachmentTab] = useState<'upload' | 'google'>('upload');
  const [googleDriveUrl, setGoogleDriveUrl] = useState('');
  const [isDescriptionFocused, setIsDescriptionFocused] = useState(false);
  const [isCommentFocused, setIsCommentFocused] = useState(false);
  const [descriptionMentionQuery, setDescriptionMentionQuery] = useState<string | null>(null);
  const [commentMentionQuery, setCommentMentionQuery] = useState<string | null>(null);
  const [descriptionMentionPos, setDescriptionMentionPos] = useState<{ top: number; left: number } | null>(null);
  const [commentMentionPos, setCommentMentionPos] = useState<{ top: number; left: number } | null>(null);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const [showDuePicker, setShowDuePicker] = useState(false);
  const [dueMonth, setDueMonth] = useState<Date>(new Date());
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [projectQuery, setProjectQuery] = useState('');
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [isPanelFullscreen, setIsPanelFullscreen] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState<Date | null>(null);
  const [showSubtaskDuePicker, setShowSubtaskDuePicker] = useState(false);
  const [subtaskDueMonth, setSubtaskDueMonth] = useState<Date>(new Date());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';
  const { data: apiAttachments = [], refetch: refetchApiAttachments } = useTaskAttachments(USE_BACKEND ? task.id : undefined);
  const uploadAttachmentMutation = useUploadAttachment();
  const deleteAttachmentMutation = useDeleteAttachment();

  const mentionTargets = useMemo<MentionTarget[]>(() => {
    const seen = new Set<string>();
    const out: MentionTarget[] = [];

    const push = (value: string, type: MentionType) => {
      const normalized = value.trim();
      if (!normalized) return;
      const key = `${type}:${normalized.toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ value: normalized, type });
    };

    push(currentUserName, 'utente');
    teamMembers.forEach((member) => push(member.fullName, 'utente'));
    projects.forEach((project) => push(project.name, 'progetto'));
    teams.forEach((team) => push(team.name, 'team'));
    allTasks.forEach((item) => push(item.title, 'task'));

    return out;
  }, [allTasks, currentUserName, projects, teamMembers, teams]);

  const assigneeOptions = useMemo(() => {
    const names = new Set<string>();
    const values: Array<{ name: string; email: string }> = [];

    const add = (name: string, email?: string | null) => {
      const normalized = name.trim();
      if (!normalized || names.has(normalized.toLowerCase())) return;
      names.add(normalized.toLowerCase());
      values.push({ name: normalized, email: email?.trim() || '' });
    };

    add(currentUserName);
    teamMembers.forEach((member) => add(member.fullName, member.email));
    return values;
  }, [currentUserName, teamMembers]);

  const availableFollowers = assigneeOptions.map((item) => item.name).filter((name) => !followers.includes(name));

  const filteredAssigneeOptions = useMemo(() => {
    const query = assigneeQuery.trim().toLowerCase();
    if (!query) return assigneeOptions;
    return assigneeOptions.filter(
      (option) => option.name.toLowerCase().includes(query) || option.email.toLowerCase().includes(query)
    );
  }, [assigneeOptions, assigneeQuery]);

  const filteredProjects = useMemo(() => {
    const query = projectQuery.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) => project.name.toLowerCase().includes(query));
  }, [projectQuery, projects]);

  const descriptionMentionResults = useMemo(() => {
    if (descriptionMentionQuery === null) return [];
    const query = descriptionMentionQuery.toLowerCase();
    return mentionTargets.filter((item) => item.value.toLowerCase().includes(query)).slice(0, 7);
  }, [descriptionMentionQuery, mentionTargets]);

  const commentMentionResults = useMemo(() => {
    if (commentMentionQuery === null) return [];
    const query = commentMentionQuery.toLowerCase();
    return mentionTargets.filter((item) => item.value.toLowerCase().includes(query)).slice(0, 7);
  }, [commentMentionQuery, mentionTargets]);

  const projectAvatarMap = useMemo(() => {
    const map = new Map<string, string[]>();
    projects.forEach((project) => {
      const members = teamMembers.filter((member) => member.teamId === project.teamId).slice(0, 3);
      const initials = members.map((member) => getInitials(member.fullName));
      if (!initials.includes(getInitials(currentUserName))) {
        initials.unshift(getInitials(currentUserName));
      }
      map.set(project.id, initials.slice(0, 3));
    });
    return map;
  }, [currentUserName, projects, teamMembers]);

  const parentPath = useMemo(() => {
    const byId = new Map(allTasks.map((item) => [item.id, item]));
    const chain: Task[] = [];
    const visited = new Set<string>();
    let cursor = task.parentTaskId;

    while (cursor && !visited.has(cursor)) {
      visited.add(cursor);
      const parent = byId.get(cursor);
      if (!parent) break;
      chain.unshift(parent);
      cursor = parent.parentTaskId;
    }

    return chain;
  }, [allTasks, task.parentTaskId]);

  const subtasks = useMemo(
    () =>
      allTasks
        .filter((item) => item.parentTaskId === task.id)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    [allTasks, task.id]
  );

  const mapApiAttachment = (attachment: ApiAttachment): AttachmentItem => ({
    id: attachment.id,
    taskId: attachment.taskId,
    filename: attachment.originalName || attachment.filename,
    size: attachment.size,
    mimeType: attachment.mimeType,
    downloadUrl: getAttachmentDownloadUrl(task.id, attachment.id),
    createdAt: attachment.createdAt,
  });

  useEffect(() => {
    void loadProjectMemberships();
    setTitle(task.title);
    setDescription(task.description || '');
    setStatus(task.status);
    setAssignee(task.assignee || currentUserName);
    setDueDate(task.dueDate || null);
    setIsPublic(task.isPublic);
    setDueMonth(task.dueDate || new Date());
    void loadStories();
    void loadFollowers();
    void loadAttachments();
  }, [currentUserName, phases, task]);

  useEffect(() => {
    if (USE_BACKEND) {
      setAttachments(apiAttachments.map(mapApiAttachment));
    }
  }, [USE_BACKEND, apiAttachments, task.id]);

  useEffect(() => {
    let cancelled = false;
    const createdUrls: string[] = [];

    const buildPreviews = async () => {
      const next: Record<string, string> = {};
      for (const attachment of attachments) {
        if (!attachment.mimeType.startsWith('image/')) continue;
        if (USE_BACKEND) {
          if (!attachment.downloadUrl) continue;
          try {
            const { data } = await apiClient.get(attachment.downloadUrl, { responseType: 'blob' });
            const url = URL.createObjectURL(data);
            createdUrls.push(url);
            next[attachment.id] = url;
          } catch {
            // ignore preview failures
          }
          continue;
        }
        if (!attachment.storedPath || attachment.storedPath.startsWith('url:')) continue;
        const stored = await getFile(attachment.storedPath);
        if (!stored) continue;
        const blob = new Blob([stored.data], { type: stored.mimeType || attachment.mimeType });
        const url = URL.createObjectURL(blob);
        createdUrls.push(url);
        next[attachment.id] = url;
      }
      if (!cancelled) setAttachmentPreviews(next);
    };

    void buildPreviews();
    return () => {
      cancelled = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [attachments]);

  const loadProjectMemberships = async () => {
    const fromJunction = await getProjectsByTaskId(task.id);
    const phaseProjectId = phases.find((item) => item.id === task.phaseId)?.projectId;
    const ids = Array.from(new Set([...(phaseProjectId ? [phaseProjectId] : []), ...fromJunction]));
    setSelectedProjectIds(ids);
  };

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (showAssigneePicker && assigneeRef.current && !assigneeRef.current.contains(target)) setShowAssigneePicker(false);
      if (showDuePicker && dueRef.current && !dueRef.current.contains(target)) setShowDuePicker(false);
      if (showProjectPicker && projectRef.current && !projectRef.current.contains(target)) setShowProjectPicker(false);
      if (showMoreActions && actionMenuRef.current && !actionMenuRef.current.contains(target)) setShowMoreActions(false);
      if (showSubtaskDuePicker && subtaskCalendarRef.current && !subtaskCalendarRef.current.contains(target)) setShowSubtaskDuePicker(false);
    };
    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, [showAssigneePicker, showDuePicker, showProjectPicker, showMoreActions, showSubtaskDuePicker]);

  useEffect(() => {
    if (showDuePicker && dueRef.current) {
      const rect = dueRef.current.getBoundingClientRect();
      setDuePosStyle({ position: 'fixed', top: rect.bottom + 4, left: rect.left, zIndex: 9999 });
    }
  }, [showDuePicker]);

  useEffect(() => {
    if (showSubtaskDuePicker && subtaskCalendarRef.current) {
      const rect = subtaskCalendarRef.current.getBoundingClientRect();
      setSubtaskDuePosStyle({ position: 'fixed', top: rect.bottom + 4, left: rect.left, zIndex: 9999 });
    }
  }, [showSubtaskDuePicker]);

  const loadStories = async () => {
    let data = await getStoriesByTask(task.id);
    if (data.length === 0) {
      const author = (task.assignee || currentUserName || 'Sistema').trim();
      await createStory(task.id, 'system', 'ha creato questa attività', author || 'Sistema');
      data = await getStoriesByTask(task.id);
    }

    const createdStories = data
      .filter((story) => story.type === 'system' && story.content === 'ha creato questa attività')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    if (createdStories.length > 1) {
      const duplicates = createdStories.slice(1);
      for (const duplicate of duplicates) {
        await deleteStory(duplicate.id);
      }
      data = await getStoriesByTask(task.id);
    }

    setStories(data);
  };

  const loadFollowers = async () => {
    const data = await getFollowersByTask(task.id);
    setFollowers(data);
  };

  const loadAttachments = async () => {
    if (USE_BACKEND) {
      const result = await refetchApiAttachments();
      const data = (result.data ?? []).map(mapApiAttachment);
      setAttachments(data);
      return;
    }
    const data = await getAttachmentsByTask(task.id);
    setAttachments(data);
  };

  const persist = async (updates: Parameters<typeof updateTask>[1]) => {
    const savedScroll = panelContentRef.current?.scrollTop;
    setSaving(true);
    setError('');
    try {
      await updateTask(task.id, { ...updates, updatedBy: currentUserName });
      await onUpdated();
      await loadStories();
    } catch (err) {
      console.error('Failed to update task', err);
      setError('Errore durante il salvataggio.');
    } finally {
      setSaving(false);
      requestAnimationFrame(() => {
        if (panelContentRef.current && savedScroll !== undefined) {
          panelContentRef.current.scrollTop = savedScroll;
        }
      });
    }
  };

  const handleCompleteToggle = async () => {
    const nextStatus = status === 'done' ? 'in_progress' : 'done';
    setStatus(nextStatus);
    await persist({ status: nextStatus, progress: nextStatus === 'done' ? 100 : 0 });
  };

  const handleTitleBlur = async () => {
    const next = title.trim();
    if (!next || next === task.title) return;
    await persist({ title: next });
  };

  const handleDescriptionBlur = async () => {
    const next = description.trim();
    const current = task.description || '';
    if (next === current) return;
    await persist({ description: next || null });
  };

  const handleAssigneeChange = async (nextAssignee: string) => {
    setAssignee(nextAssignee);
    setAssigneeQuery('');
    setShowAssigneePicker(false);
    await persist({ assignee: nextAssignee || null });
  };

  const handleDueDateChange = async (next: Date | null) => {
    setDueDate(next);
    setShowDuePicker(false);
    await persist({ dueDate: next });
  };

  const handlePrivacyToggle = async () => {
    const next = !isPublic;
    setIsPublic(next);
    await persist({ isPublic: next });
  };

  const getDefaultPhaseId = async (projectId: string): Promise<string> => {
    const projectPhases = await getPhasesByProjectId(projectId);
    if (projectPhases.length > 0) return projectPhases[0].id;
    const phase = await createPhase('Backlog', projectId);
    return phase.id;
  };

  const syncPrimaryPhase = async (projectIds: string[]) => {
    const primaryProjectId = projectIds[0];
    if (!primaryProjectId) {
      await persist({ phaseId: null });
      return;
    }
    const phaseId = await getDefaultPhaseId(primaryProjectId);
    await persist({ phaseId });
  };

  const handleToggleProject = async (projectId: string) => {
    const alreadySelected = selectedProjectIds.includes(projectId);
    const nextSelected = alreadySelected
      ? selectedProjectIds.filter((id) => id !== projectId)
      : [...selectedProjectIds, projectId];

    setSelectedProjectIds(nextSelected);
    if (alreadySelected) {
      await removeTaskFromProject(task.id, projectId);
    } else {
      await addTaskToProject(task.id, projectId);
    }
    await syncPrimaryPhase(nextSelected);
    setProjectQuery('');
  };

  const handleClearProjects = async () => {
    setSelectedProjectIds([]);
    setShowProjectPicker(false);
    setProjectQuery('');
    await removeAllProjectMemberships(task.id);
    await persist({ phaseId: null });
  };

  const handleCreateProjectAndAssign = async () => {
    const trimmed = newProjectName.trim();
    if (!trimmed) return;
    const teamId = teams[0]?.id;
    const project = await createProject(trimmed, teamId);
    setNewProjectName('');
    setProjectQuery('');
    await addTaskToProject(task.id, project.id);
    const nextSelected = [...selectedProjectIds, project.id];
    setSelectedProjectIds(nextSelected);
    await syncPrimaryPhase(nextSelected);
    await onUpdated();
  };

  const handleCreateSubtask = async () => {
    const titleValue = newSubtaskTitle.trim();
    if (!titleValue) return;
    const savedScroll = panelContentRef.current?.scrollTop;

    const created = await createTask(
      task.phaseId || null,
      titleValue,
      '',
      'todo',
      'medium',
      newSubtaskDueDate || undefined,
      0,
      task.sectionId || null,
      task.id,
      'default_task',
      currentUserName,
      task.isPublic
    );

    for (const projectId of selectedProjectIds) {
      await addTaskToProject(created.id, projectId);
    }

    setNewSubtaskTitle('');
    setNewSubtaskDueDate(null);
    setShowSubtaskDuePicker(false);
    setSubtaskDueMonth(new Date());
    await createStory(task.id, 'system', `ha creato la sottoattività "${titleValue}"`, currentUserName);
    await onUpdated();
    await loadStories();
    requestAnimationFrame(() => {
      if (panelContentRef.current && savedScroll !== undefined) {
        panelContentRef.current.scrollTop = savedScroll;
      }
    });
  };

  const handleToggleSubtaskDone = async (subtask: Task) => {
    const nextStatus = subtask.status === 'done' ? 'in_progress' : 'done';
    await updateTask(subtask.id, { status: nextStatus, progress: nextStatus === 'done' ? 100 : 0 });
    await onUpdated();
  };

  const handleAddFollower = async () => {
    const target = newFollowerName.trim();
    if (!target) return;
    await addFollower(task.id, target);
    setNewFollowerName('');
    await loadFollowers();
  };

  const handleRemoveFollower = async (follower: string) => {
    await removeFollower(task.id, follower);
    await loadFollowers();
  };

  const handleLeaveTask = async () => {
    if (!followers.includes(currentUserName)) return;
    await removeFollower(task.id, currentUserName);
    await loadFollowers();
  };

  const handleUploadLocalFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    if (USE_BACKEND) {
      for (const file of Array.from(files)) {
        await uploadAttachmentMutation.mutateAsync({ taskId: task.id, file });
      }
      event.target.value = '';
      setShowAttachmentMenu(false);
      await loadAttachments();
      return;
    }
    for (const file of Array.from(files)) {
      const storedPath = await storeFile(file);
      await createAttachment(task.id, file.name, file.size, file.type || 'application/octet-stream', storedPath);
    }
    event.target.value = '';
    setShowAttachmentMenu(false);
    await loadAttachments();
  };

  const handleUploadCommentFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    if (USE_BACKEND) {
      for (const file of Array.from(files)) {
        await uploadAttachmentMutation.mutateAsync({ taskId: task.id, file });
      }
      event.target.value = '';
      await loadAttachments();
      return;
    }
    for (const file of Array.from(files)) {
      const storedPath = await storeFile(file);
      await createAttachment(task.id, file.name, file.size, file.type || 'application/octet-stream', storedPath);
    }
    event.target.value = '';
    await loadAttachments();
  };

  const handleAddGoogleDriveAttachment = async () => {
    const url = googleDriveUrl.trim();
    if (!url) return;
    if (USE_BACKEND) {
      window.open(url, '_blank', 'noopener,noreferrer');
      setGoogleDriveUrl('');
      setShowAttachmentMenu(false);
      return;
    }
    await createAttachment(task.id, 'Google Drive', 0, 'link/google-drive', `url:${url}`);
    setGoogleDriveUrl('');
    setShowAttachmentMenu(false);
    await loadAttachments();
  };

  const handleOpenAttachment = async (attachment: AttachmentItem) => {
    if (USE_BACKEND) {
      const url = attachment.downloadUrl || getAttachmentDownloadUrl(task.id, attachment.id);
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (attachment.storedPath?.startsWith('url:')) {
      window.open(attachment.storedPath.slice(4), '_blank', 'noopener,noreferrer');
      return;
    }
    if (!attachment.storedPath) return;
    const stored = await getFile(attachment.storedPath);
    if (!stored) return;
    const blob = new Blob([stored.data], { type: stored.mimeType });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDeleteAttachment = async (attachment: AttachmentItem) => {
    if (USE_BACKEND) {
      await deleteAttachmentMutation.mutateAsync({ taskId: task.id, attachmentId: attachment.id });
      await loadAttachments();
      return;
    }
    await deleteAttachment(attachment.id);
    await loadAttachments();
  };

  const handleSendComment = async () => {
    const body = comment.trim();
    if (!body) return;
    await createStory(task.id, 'comment', body, currentUserName);
    if (notifyCollaborators && notifyRecipients.length > 0) {
      // TODO: implement real notification delivery (in-app + email) to selected recipients.
      await createStory(task.id, 'system', `notification:${notifyRecipients.length}`, currentUserName);
    }
    setComment('');
    setNotifyCollaborators(false);
    setNotifyRecipients([]);
    setShowNotifyPicker(false);
    await loadStories();
    requestAnimationFrame(() => {
      if (panelContentRef.current) {
        panelContentRef.current.scrollTop = panelContentRef.current.scrollHeight;
      }
    });
  };

  const visibleStories = useMemo(() => {
    const base = activityTab === 'comments' ? stories.filter((story) => story.type === 'comment') : stories;
    const sorted = [...base].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    if (activitySort === 'desc') sorted.reverse();
    return sorted;
  }, [activitySort, activityTab, stories]);

  const formatStoryText = (story: Story): string => {
    if (story.type === 'comment') return story.content;
    if (story.content.startsWith('notification:')) {
      const count = story.content.split(':')[1] || '0';
      return `ha notificato ${count} collaboratori`;
    }
    return story.content || 'ha aggiornato l’attività';
  };

  const onDescriptionChange = (next: string) => {
    setDescription(next);
    const caret = descriptionRef.current?.selectionStart ?? next.length;
    const query = readMentionQuery(next, caret);
    setDescriptionMentionQuery(query);
    if (query !== null && descriptionRef.current) {
      setDescriptionMentionPos(getCaretCoords(descriptionRef.current));
    }
  };

  const onCommentChange = (next: string) => {
    setComment(next);
    const caret = commentRef.current?.selectionStart ?? next.length;
    const query = readMentionQuery(next, caret);
    setCommentMentionQuery(query);
    if (query !== null && commentRef.current) {
      setCommentMentionPos(getCaretCoords(commentRef.current));
    }
  };

  const insertDescriptionMention = (value: string) => {
    if (!descriptionRef.current) return;
    const caret = descriptionRef.current.selectionStart ?? description.length;
    const next = applyMentionAtCaret(description, caret, value);
    setDescription(next.value);
    setDescriptionMentionQuery(null);
    setDescriptionMentionPos(null);
    requestAnimationFrame(() => {
      if (!descriptionRef.current) return;
      descriptionRef.current.focus();
      descriptionRef.current.selectionStart = next.caret;
      descriptionRef.current.selectionEnd = next.caret;
    });
  };

  const insertCommentMention = (value: string) => {
    if (!commentRef.current) return;
    const caret = commentRef.current.selectionStart ?? comment.length;
    const next = applyMentionAtCaret(comment, caret, value);
    setComment(next.value);
    setCommentMentionQuery(null);
    setCommentMentionPos(null);
    requestAnimationFrame(() => {
      if (!commentRef.current) return;
      commentRef.current.focus();
      commentRef.current.selectionStart = next.caret;
      commentRef.current.selectionEnd = next.caret;
    });
  };

  const getMonthLabel = (date: Date): string => {
    const value = date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const getMonthDays = (date: Date): Array<Date | null> => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const leading = (first.getDay() + 6) % 7;
    const days: Array<Date | null> = [];
    for (let i = 0; i < leading; i += 1) days.push(null);
    for (let day = 1; day <= last.getDate(); day += 1) days.push(new Date(year, month, day));
    return days;
  };

  const collaboratorText = `${notifyRecipients.length} persone riceveranno una notifica`;

  const toggleNotifyRecipient = (name: string) => {
    setNotifyRecipients((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name]
    );
  };

  const handleCopyTaskLink = async () => {
    const link = `${window.location.origin}${window.location.pathname}#task=${task.id}`;
    try {
      await navigator.clipboard.writeText(link);
      setError('');
    } catch {
      setError('Impossibile copiare il link.');
    }
  };

  const handleDuplicateTask = async () => {
    setShowMoreActions(false);
    const duplicate = await createTask(
      task.phaseId || null,
      `${title.trim() || task.title} (copia)`,
      description || undefined,
      status,
      task.priority,
      dueDate || undefined,
      task.progress,
      task.sectionId || null,
      null,
      task.resourceSubtype || 'default_task',
      assignee || null,
      isPublic
    );
    for (const projectId of selectedProjectIds) {
      await addTaskToProject(duplicate.id, projectId);
    }
    await onUpdated();
  };

  const handleDeleteTask = async () => {
    setShowMoreActions(false);
    await removeAllProjectMemberships(task.id);
    await deleteTask(task.id);
    await onUpdated();
    onClose();
  };

  const handlePrintTask = () => {
    setShowMoreActions(false);
    setShowAttachmentMenu(false);
    setShowAssigneePicker(false);
    setShowDuePicker(false);
    setShowProjectPicker(false);

    const due = dueDate
      ? dueDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : 'Nessuna scadenza';
    const projectNames = selectedProjectIds
      .map((id) => projects.find((p) => p.id === id)?.name)
      .filter(Boolean)
      .join(', ');

    const safe = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      setError('Popup bloccato: impossibile aprire la stampa.');
      return;
    }

    const html = `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <title>${safe(title || task.title)}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 28px; color: #1f2937; }
    h1 { margin: 0 0 14px; font-size: 26px; font-weight: 600; }
    .meta { margin: 10px 0 18px; font-size: 14px; }
    .meta-row { margin: 4px 0; }
    .label { color: #4b5563; font-weight: 600; margin-right: 6px; }
    .desc-title { margin-top: 18px; font-size: 16px; font-weight: 600; }
    .desc { margin-top: 8px; white-space: pre-wrap; line-height: 1.4; }
    .footer { margin-top: 28px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <h1>${safe(title || task.title)}</h1>
  <div class="meta">
    <div class="meta-row"><span class="label">Incaricato:</span>${safe(assignee || 'Non assegnato')}</div>
    <div class="meta-row"><span class="label">Scadenza:</span>${safe(due)}</div>
    <div class="meta-row"><span class="label">Progetti:</span>${safe(projectNames || 'Nessun progetto')}</div>
    <div class="meta-row"><span class="label">Visibilità:</span>${isPublic ? 'Pubblica' : 'Privata'}</div>
    <div class="meta-row"><span class="label">Stato:</span>${status === 'done' ? 'Completata' : 'In programma'}</div>
  </div>
  <div class="desc-title">Descrizione</div>
  <div class="desc">${safe(description || 'Nessuna descrizione')}</div>
  <div class="footer">Stampato da Vayana</div>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    setTimeout(() => printWindow.close(), 200);
  };

  return (
    <div className="task-panel-overlay" onClick={onClose}>
      <aside className={`task-panel ${isPanelFullscreen ? 'task-panel-fullscreen' : ''}`} onClick={(event) => event.stopPropagation()}>
        <header className="task-panel-header">
          <button className="btn-secondary task-complete-btn" onClick={handleCompleteToggle}>
            {status === 'done' ? 'Segna come non completata' : 'Contrassegna come completata'}
          </button>
          <div className="task-panel-actions" ref={actionMenuRef}>
            <button className="task-action-icon" title="Allegati" onClick={() => setShowAttachmentMenu((open) => !open)}>
              <PaperclipIcon className="task-action-svg" />
            </button>
            <button className="task-action-icon" title="Copia link attività" onClick={() => void handleCopyTaskLink()}>
              <svg className="task-action-svg" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M9.5 7.5h7a2 2 0 012 2v9a2 2 0 01-2 2h-7a2 2 0 01-2-2v-9a2 2 0 012-2z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6.5 16.5h-1a2 2 0 01-2-2v-9a2 2 0 012-2h7a2 2 0 012 2v1"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              className="task-action-icon"
              title={isPanelFullscreen ? 'Riduci finestra' : 'Schermo intero'}
              onClick={() => setIsPanelFullscreen((open) => !open)}
            >
              {isPanelFullscreen ? (
                <svg className="task-action-svg" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg className="task-action-svg" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <div className="task-more-wrap">
              <button
                className="task-action-icon"
                title="Altre azioni"
                onClick={() => setShowMoreActions((open) => !open)}
              >
                <svg className="task-action-svg" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="6" cy="12" r="1.8" fill="currentColor" />
                  <circle cx="12" cy="12" r="1.8" fill="currentColor" />
                  <circle cx="18" cy="12" r="1.8" fill="currentColor" />
                </svg>
              </button>
              {showMoreActions && (
                <div className="task-more-menu">
                  <button onClick={() => void handleDuplicateTask()}>Duplica attività</button>
                  <button onClick={handlePrintTask}>Stampa</button>
                  <button onClick={() => { setShowMoreActions(false); void handlePrivacyToggle(); }}>
                    {isPublic ? 'Rendi privata' : 'Rendi pubblica'}
                  </button>
                  <button onClick={() => { setShowMoreActions(false); setError('Etichette: in arrivo.'); }}>
                    Aggiungi etichette
                  </button>
                  <button className="danger" onClick={() => void handleDeleteTask()}>Elimina attività</button>
                </div>
              )}
            </div>
            <button className="task-action-icon" onClick={onClose} title="Chiudi">
              <svg className="task-action-svg" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </header>

        <div className="task-panel-privacy">
          <span>{isPublic ? 'Questa attività è pubblica per tutta l’organizzazione.' : 'Questa attività è visibile solo a te.'}</span>
          <button className="btn-link" onClick={handlePrivacyToggle}>
            {isPublic ? 'Rendi privata' : 'Rendi pubblica'}
          </button>
        </div>

        <div className="task-panel-content" ref={panelContentRef}>
          {parentPath.length > 0 && (
            <div className="task-breadcrumb-line" aria-label="Percorso attività">
              {parentPath.map((item) => (
                <React.Fragment key={item.id}>
                  <button type="button" className="task-breadcrumb-link" onClick={() => onOpenTask?.(item.id)}>
                    {item.title}
                  </button>
                  <span className="task-breadcrumb-separator" aria-hidden>{'>'}</span>
                </React.Fragment>
              ))}
              <span className="task-breadcrumb-current">{task.title}</span>
            </div>
          )}

          <input
            className="task-panel-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Nome attività"
          />

          <div className="task-meta-grid">
            <label>Incaricato</label>
            <div className="task-assignee-wrap" ref={assigneeRef}>
              <button className="task-assignee-trigger" onClick={() => setShowAssigneePicker((open) => !open)}>
                <span className="avatar-mini">{getInitials(assignee)}</span>
                <span>{assignee}</span>
                <span className="caret">▾</span>
              </button>
              {showAssigneePicker && (
                <div className="task-assignee-menu">
                  <div className="task-assignee-search-row">
                    <span className="avatar-mini">{getInitials(assignee)}</span>
                    <input
                      value={assigneeQuery}
                      onChange={(event) => setAssigneeQuery(event.target.value)}
                      placeholder={assignee}
                      autoFocus
                    />
                  </div>
                  {filteredAssigneeOptions.map((option) => (
                    <button key={option.name} className="task-assignee-option" onClick={() => void handleAssigneeChange(option.name)}>
                      <span className="avatar-mini">{getInitials(option.name)}</span>
                      <span className="task-assignee-name">{option.name}</span>
                      {option.email && <span className="task-assignee-email">{option.email}</span>}
                    </button>
                  ))}
                  {filteredAssigneeOptions.length === 0 && <p className="task-assignee-empty">Nessun utente trovato</p>}
                  <button className="task-assignee-extra" type="button">Invita i colleghi del team tramite email</button>
                  <button className="task-assignee-extra" type="button">Assegna a più utenti</button>
                </div>
              )}
            </div>

            <label>Data di scadenza</label>
            <div className="task-due-wrap" ref={dueRef}>
              <button className="task-due-trigger" onClick={() => setShowDuePicker((open) => !open)}>
                <span className="task-due-icon" aria-hidden />
                <span>{formatItDate(dueDate)}</span>
                {dueDate && (
                  <span
                    className="task-clear-x"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDueDateChange(null);
                    }}
                  >
                    ✕
                  </span>
                )}
              </button>
              {showDuePicker && (
                <div className="task-date-popover" style={duePosStyle}>
                  <div className="task-date-head">
                    <button onClick={() => setDueMonth(new Date(dueMonth.getFullYear(), dueMonth.getMonth() - 1, 1))}>‹</button>
                    <span>{getMonthLabel(dueMonth)}</span>
                    <button onClick={() => setDueMonth(new Date(dueMonth.getFullYear(), dueMonth.getMonth() + 1, 1))}>›</button>
                  </div>
                  <div className="task-date-grid task-date-weekdays">
                    {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((day, index) => (
                      <span key={`${day}-${index}`}>{day}</span>
                    ))}
                  </div>
                  <div className="task-date-grid">
                    {getMonthDays(dueMonth).map((day, index) =>
                      day ? (
                        <button key={day.toISOString()} onClick={() => void handleDueDateChange(day)}>
                          {day.getDate()}
                        </button>
                      ) : (
                        <span key={`empty-${index}`} />
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            <label>Progetti</label>
            <div className="task-project-wrap" ref={projectRef}>
              <div className="task-project-inline-layout">
                <div className="task-project-row-field">
                  <div className="task-project-inline">
                    {selectedProjectIds.map((projectId) => {
                      const project = projects.find((p) => p.id === projectId);
                      if (!project) return null;
                      return (
                        <div key={projectId} className="task-project-chip">
                          <button
                            type="button"
                            className="task-project-chip-main"
                            onClick={() => onOpenProject?.(project.id)}
                            title="Apri dettaglio progetto"
                          >
                            <span>{project.name}</span>
                          </button>
                          <button
                            type="button"
                            className="task-chip-remove"
                            onClick={() => void handleToggleProject(projectId)}
                            title="Rimuovi progetto"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  className="task-project-inline-add"
                  onClick={() => setShowProjectPicker((open) => !open)}
                  title="Aggiungi progetto"
                >
                  +
                </button>
              </div>
              {showProjectPicker && (
                <div className="task-project-menu">
                  <div className="task-project-create-row task-project-search-row">
                    <input
                      value={projectQuery}
                      onChange={(event) => setProjectQuery(event.target.value)}
                      placeholder="Aggiungi task a un progetto"
                    />
                  </div>
                  {filteredProjects.map((project) => (
                    <button key={project.id} className="task-project-option" onClick={() => void handleToggleProject(project.id)}>
                      <span>{selectedProjectIds.includes(project.id) ? '✓ ' : ''}{project.name}</span>
                      <div className="task-project-avatars">
                        {(projectAvatarMap.get(project.id) || []).map((initial, index) => (
                          <span key={`${project.id}-${index}`} style={{ backgroundColor: getAvatarColor(`${project.id}-${initial}-${index}`) }}>
                            {initial}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                  {filteredProjects.length === 0 && <p className="task-assignee-empty">Nessun progetto trovato</p>}
                  <div className="task-project-create-row">
                    <input
                      value={newProjectName}
                      onChange={(event) => setNewProjectName(event.target.value)}
                      placeholder="Nuovo progetto..."
                    />
                    <button className="btn-secondary" onClick={() => void handleCreateProjectAndAssign()}>Crea</button>
                  </div>
                  {selectedProjectIds.length > 0 && (
                    <button className="task-project-option" onClick={() => void handleClearProjects()}>
                      <span>Nessun progetto</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <section className="task-description-section">
            <h4>Descrizione</h4>
            {isDescriptionFocused && (
              <div className="task-editor-tools">
                {DESCRIPTION_TOOLS.map((tool) => (
                  <button key={tool} type="button">{tool}</button>
                ))}
              </div>
            )}
            <textarea
              ref={descriptionRef}
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              onFocus={() => setIsDescriptionFocused(true)}
              onBlur={() => {
                setIsDescriptionFocused(false);
                void handleDescriptionBlur();
              }}
              placeholder="In cosa consiste questa attività?"
              rows={7}
            />
            {descriptionMentionResults.length > 0 && descriptionMentionPos && (
              <div className="mention-box mention-box-caret" style={{ top: descriptionMentionPos.top, left: descriptionMentionPos.left }}>
                {descriptionMentionResults.map((item) => (
                  <button key={`${item.type}-${item.value}`} onMouseDown={(event) => event.preventDefault()} onClick={() => insertDescriptionMention(item.value)}>
                    @{item.value} <span>{item.type}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="task-subtasks-section">
            <div className="task-inline-header">
              <strong>Sottoattività</strong>
            </div>
            <div className="task-subtasks-create">
              <span>+</span>
              <input
                value={newSubtaskTitle}
                onChange={(event) => setNewSubtaskTitle(event.target.value)}
                placeholder="Crea sottoattività"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleCreateSubtask();
                  }
                }}
              />
              <div className="task-subtask-create-calendar-wrap" ref={subtaskCalendarRef}>
                <button
                  type="button"
                  className="task-subtask-create-calendar"
                  onClick={() => setShowSubtaskDuePicker((open) => !open)}
                  title={newSubtaskDueDate ? `Scadenza: ${formatShortDueDate(newSubtaskDueDate)}` : 'Imposta scadenza'}
                >
                  <span className="task-subtask-calendar-glyph" aria-hidden />
                </button>
                {showSubtaskDuePicker && (
                  <div className="task-subtask-calendar-popover" style={subtaskDuePosStyle}>
                    <div className="task-date-head">
                      <button onClick={() => setSubtaskDueMonth(new Date(subtaskDueMonth.getFullYear(), subtaskDueMonth.getMonth() - 1, 1))}>‹</button>
                      <span>{getMonthLabel(subtaskDueMonth)}</span>
                      <button onClick={() => setSubtaskDueMonth(new Date(subtaskDueMonth.getFullYear(), subtaskDueMonth.getMonth() + 1, 1))}>›</button>
                    </div>
                    <div className="task-date-grid task-date-weekdays">
                      {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((day, index) => (
                        <span key={`subtask-${day}-${index}`}>{day}</span>
                      ))}
                    </div>
                    <div className="task-date-grid">
                      {getMonthDays(subtaskDueMonth).map((day, index) =>
                        day ? (
                          <button
                            key={day.toISOString()}
                            onClick={() => {
                              setNewSubtaskDueDate(day);
                              setShowSubtaskDuePicker(false);
                            }}
                          >
                            {day.getDate()}
                          </button>
                        ) : (
                          <span key={`subtask-empty-${index}`} />
                        )
                      )}
                    </div>
                    <button
                      className="home-calendar-clear"
                      onClick={() => {
                        setNewSubtaskDueDate(null);
                        setShowSubtaskDuePicker(false);
                      }}
                    >
                      Rimuovi scadenza
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="task-subtask-open-btn"
                onClick={() => void handleCreateSubtask()}
                title="Crea e apri dettaglio sottoattività"
              >
                ›
              </button>
            </div>
            <div className="task-subtasks-list">
              {subtasks.length === 0 ? (
                <p className="text-muted">Nessuna sottoattività.</p>
              ) : (
                subtasks.map((subtask) => (
                  <div key={subtask.id} className="task-subtask-row">
                    <button
                      className={`task-subtask-check ${subtask.status === 'done' ? 'done' : ''}`}
                      onClick={() => void handleToggleSubtaskDone(subtask)}
                    >
                      {subtask.status === 'done' ? '✓' : ''}
                    </button>
                    <button className="task-subtask-title" onClick={() => onOpenTask?.(subtask.id)}>
                      {subtask.title}
                    </button>
                    <span className="task-subtask-due">{formatShortDueDate(subtask.dueDate)}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="task-attachment-section">
            <div className="task-inline-header">
              <strong>Allegati</strong>
              <span className="task-inline-count">{attachments.length}</span>
              <button className="btn-icon task-inline-clip-btn" onClick={() => setShowAttachmentMenu((open) => !open)} title="Apri menu allegati">
                <PaperclipIcon className="task-inline-clip-icon" />
              </button>
            </div>
            {showAttachmentMenu && (
              <div className="attachment-popover">
                <div className="attachment-tabs">
                  <button className={attachmentTab === 'upload' ? 'active' : ''} onClick={() => setAttachmentTab('upload')}>Carica</button>
                  <button className={attachmentTab === 'google' ? 'active' : ''} onClick={() => setAttachmentTab('google')}>Google Drive</button>
                </div>
                {attachmentTab === 'upload' && (
                  <div className="attachment-upload-box">
                    <p>Seleziona un file dal computer</p>
                    <input ref={fileInputRef} type="file" multiple onChange={handleUploadLocalFiles} />
                  </div>
                )}
                {attachmentTab === 'google' && (
                  <div className="attachment-upload-box">
                    <input
                      type="url"
                      value={googleDriveUrl}
                      onChange={(event) => setGoogleDriveUrl(event.target.value)}
                      placeholder="Incolla URL Google Drive"
                    />
                    <button className="btn-primary" onClick={() => void handleAddGoogleDriveAttachment()}>Collega</button>
                  </div>
                )}
              </div>
            )}
            {attachments.length > 0 && (
              <ul className="task-attachments-list">
                {attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <button className="task-attachment-thumb" onClick={() => void handleOpenAttachment(attachment)} title={attachment.filename}>
                      {attachmentPreviews[attachment.id] ? (
                        <img src={attachmentPreviews[attachment.id]} alt={attachment.filename} />
                      ) : (
                        <span className="task-attachment-fallback">{attachment.mimeType.startsWith('image/') ? 'IMG' : 'FILE'}</span>
                      )}
                    </button>
                    <div className="task-attachment-meta">
                      <button className="btn-link" onClick={() => void handleOpenAttachment(attachment)}>{attachment.filename}</button>
                      <small>{attachment.mimeType.startsWith('image/') ? 'Immagine' : 'Allegato'}</small>
                    </div>
                    <button className="btn-icon task-attachment-remove" onClick={() => void handleDeleteAttachment(attachment)} title="Rimuovi allegato">✕</button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="task-comments-feed">
            <div className="task-comments-head">
              <button type="button" className={`task-comments-tab ${activityTab === 'comments' ? 'active' : ''}`} onClick={() => setActivityTab('comments')}>
                Commenti
              </button>
              <button type="button" className={`task-comments-tab ${activityTab === 'all' ? 'active' : ''}`} onClick={() => setActivityTab('all')}>
                Tutta l'attività
              </button>
              <button type="button" className="task-comments-sort" onClick={() => setActivitySort((mode) => (mode === 'desc' ? 'asc' : 'desc'))}>
                {activitySort === 'desc' ? '↓ Meno recenti' : '↑ Più recenti'}
              </button>
            </div>
            <div className="task-comments-list">
              {visibleStories.length === 0 ? (
                <p className="text-muted">{activityTab === 'comments' ? 'Nessun commento.' : 'Nessuna attività.'}</p>
              ) : (
                visibleStories.map((story) => (
                  <div key={story.id} className="task-story-row">
                    <span className="avatar-mini">{getInitials(story.author)}</span>
                    <div>
                      <strong>{story.author}</strong> {formatStoryText(story)} <span className="task-story-time">· {formatStoryTime(story.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <footer className="task-panel-comment-footer">
          <div className="task-comment-editor">
            <span className="avatar-mini">{getInitials(currentUserName)}</span>
            <div className="task-comment-box">
              <textarea
                ref={commentRef}
                value={comment}
                onChange={(event) => onCommentChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleSendComment();
                  }
                }}
                onFocus={() => setIsCommentFocused(true)}
                onBlur={() => setIsCommentFocused(false)}
                placeholder="Aggiungi un commento"
                rows={3}
              />
              {isCommentFocused && (
                <div className="task-comment-tools">
                  <div>
                    {COMMENT_TOOLS.map((tool) => (
                      <button
                        key={tool}
                        type="button"
                        onClick={() => {
                          if (tool === '📎') commentFileInputRef.current?.click();
                        }}
                      >
                        {tool === '📎' ? <PaperclipIcon className="task-tool-icon" /> : tool}
                      </button>
                    ))}
                    <input
                      ref={commentFileInputRef}
                      type="file"
                      multiple
                      onChange={handleUploadCommentFiles}
                      style={{ display: 'none' }}
                    />
                  </div>
                  <label>
                    <input
                      type="checkbox"
                      checked={notifyCollaborators}
                      onChange={(event) => {
                        const next = event.target.checked;
                        setNotifyCollaborators(next);
                        if (next) {
                          setNotifyRecipients(followers);
                          setShowNotifyPicker(true);
                        } else {
                          setNotifyRecipients([]);
                          setShowNotifyPicker(false);
                        }
                      }}
                    />
                    Notifica collaboratori
                  </label>
                  <button
                    type="button"
                    className="task-notify-summary"
                    onClick={() => setShowNotifyPicker((open) => !open)}
                    disabled={!notifyCollaborators}
                    title="Scegli destinatari notifica"
                  >
                    {collaboratorText}
                  </button>
                  <button className="btn-primary" onClick={() => void handleSendComment()}>Commenta</button>
                </div>
              )}
              {isCommentFocused && notifyCollaborators && showNotifyPicker && (
                <div className="task-notify-picker">
                  {followers.length === 0 ? (
                    <p className="task-assignee-empty">Nessun collaboratore disponibile</p>
                  ) : (
                    followers.map((name) => (
                      <label key={name} className="task-notify-option">
                        <input
                          type="checkbox"
                          checked={notifyRecipients.includes(name)}
                          onChange={() => toggleNotifyRecipient(name)}
                        />
                        <span>{name}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
              {commentMentionResults.length > 0 && commentMentionPos && (
                <div className="mention-box mention-box-caret" style={{ top: commentMentionPos.top, left: commentMentionPos.left }}>
                  {commentMentionResults.map((item) => (
                    <button key={`${item.type}-${item.value}`} onMouseDown={(event) => event.preventDefault()} onClick={() => insertCommentMention(item.value)}>
                      @{item.value} <span>{item.type}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="task-collaborators">
            <div className="task-collaborators-main">
              <span>Collaboratori</span>
              <div className="task-collaborators-list">
                {followers.map((follower) => (
                  <button key={follower} className="collab-pill" onClick={() => void handleRemoveFollower(follower)} title="Rimuovi collaboratore">
                    {getInitials(follower)}
                  </button>
                ))}
                <select value={newFollowerName} onChange={(event) => setNewFollowerName(event.target.value)}>
                  <option value="">+ Aggiungi</option>
                  {availableFollowers.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <button className="btn-icon" onClick={() => void handleAddFollower()}>+</button>
              </div>
            </div>
            <button type="button" className="task-leave-btn" onClick={() => void handleLeaveTask()}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3a6 6 0 00-6 6v2.2L4.6 13a1.2 1.2 0 00.9 2h13a1.2 1.2 0 00.9-2L18 11.2V9a6 6 0 00-6-6z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 18a2 2 0 004 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <span>Abbandona attività</span>
            </button>
          </div>
        </footer>

        {saving && <div className="task-panel-saving">Salvataggio...</div>}
        {error && <div className="task-panel-error">{error}</div>}
      </aside>
    </div>
  );
}
