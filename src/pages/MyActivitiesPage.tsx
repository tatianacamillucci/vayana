import React, { useEffect, useMemo, useState } from 'react';
import { Task, createTask, getTasks, updateTask } from '../lib/db/tasks';
import { Phase, getPhases } from '../lib/db/phases';
import { Project, getProjects } from '../lib/db/projects';
import { Team, getTeams } from '../lib/db/teams';
import { TeamMember, getAllTeamMembers } from '../lib/db/teamMembers';
import { getProjectsByTaskId } from '../lib/db/taskProjects';
import { Attachment, getAllAttachments } from '../lib/db/attachments';
import { formatFileSize, getFile } from '../lib/db/fileStorage';
import { TaskDetailPanel } from '../components/TaskDetailPanel';
import { TaskCalendar } from '../components/TaskCalendar';

interface MyActivitiesPageProps {
  onOpenProject?: (projectId: string) => void;
}
type ActivitiesView = 'list' | 'board' | 'calendar' | 'dashboard' | 'file';
type BucketKey = 'recent' | 'today' | 'week' | 'later';

const PROFILE_STORAGE_KEY = 'vayana_profile_settings_v1';
const MYA_CUSTOM_COLUMNS_KEY = 'vayana_mya_custom_columns_v1';
const MYA_CUSTOM_VALUES_KEY = 'vayana_mya_custom_values_v1';
const MYA_SECTION_NAMES_KEY = 'vayana_mya_section_names_v1';
const MYA_BOARD_COLUMNS_KEY = 'vayana_mya_board_columns_v1';
const MYA_BOARD_TASK_COLUMN_KEY = 'vayana_mya_board_task_column_v1';

const DEFAULT_SECTION_NAMES: Record<BucketKey, string> = {
  recent: 'Assegnate di recente',
  today: 'Da fare oggi',
  week: 'Da fare la settimana prossima',
  later: 'Da fare più tardi',
};

interface CustomColumn {
  id: string;
  name: string;
}
interface CustomBoardColumn {
  id: string;
  name: string;
}
interface DashboardPanelState {
  title: string;
  taskIds: string[];
}

interface FileAttachmentItem extends Attachment {
  taskTitle: string;
}

const PROJECT_BADGE_PALETTE = [
  { bg: 'rgba(138, 95, 178, 0.22)', border: 'rgba(181, 141, 220, 0.42)', text: '#e7d5ff' },
  { bg: 'rgba(61, 129, 201, 0.2)', border: 'rgba(116, 170, 228, 0.4)', text: '#d6eaff' },
  { bg: 'rgba(66, 154, 128, 0.2)', border: 'rgba(111, 195, 167, 0.42)', text: '#d5f5ea' },
  { bg: 'rgba(188, 126, 74, 0.22)', border: 'rgba(224, 171, 123, 0.42)', text: '#ffe2c4' },
  { bg: 'rgba(167, 90, 120, 0.22)', border: 'rgba(212, 138, 167, 0.42)', text: '#ffd9e7' },
  { bg: 'rgba(111, 120, 208, 0.22)', border: 'rgba(153, 161, 235, 0.42)', text: '#dbe0ff' },
];

function getCurrentUserName(): string {
  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!stored) return 'Utente';
    const parsed = JSON.parse(stored) as { fullName?: string };
    return parsed.fullName?.trim() || 'Utente';
  } catch {
    return 'Utente';
  }
}

function formatDueDate(dueDate: Date | null): string {
  if (!dueDate) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  if (due.getTime() === today.getTime()) return 'Oggi';
  if (due.getTime() === tomorrow.getTime()) return 'Domani';
  return dueDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

function getProjectBadgeStyle(projectId: string): React.CSSProperties {
  let hash = 0;
  for (let i = 0; i < projectId.length; i += 1) {
    hash = (hash << 5) - hash + projectId.charCodeAt(i);
    hash |= 0;
  }
  const tone = PROJECT_BADGE_PALETTE[Math.abs(hash) % PROJECT_BADGE_PALETTE.length];
  return {
    background: tone.bg,
    borderColor: tone.border,
    color: tone.text,
  };
}

export function MyActivitiesPage({ onOpenProject }: MyActivitiesPageProps): React.ReactElement {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, Record<string, string>>>({});
  const [activeView, setActiveView] = useState<ActivitiesView>('list');
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [sectionNames, setSectionNames] = useState<Record<BucketKey, string>>(DEFAULT_SECTION_NAMES);
  const [taskProjectIds, setTaskProjectIds] = useState<Record<string, string[]>>({});
  const [customBoardColumns, setCustomBoardColumns] = useState<CustomBoardColumn[]>([]);
  const [taskBoardColumn, setTaskBoardColumn] = useState<Record<string, string>>({});
  const [collapsedBoardGroups, setCollapsedBoardGroups] = useState<Record<string, boolean>>({
    recent: false,
    today: false,
    week: false,
    later: false,
  });
  const [openBoardMenu, setOpenBoardMenu] = useState<string | null>(null);
  const [showBoardFilters, setShowBoardFilters] = useState(false);
  const [filterOpenActive, setFilterOpenActive] = useState(true);
  const [filterOpenDone, setFilterOpenDone] = useState(false);
  const [filterDueThisWeek, setFilterDueThisWeek] = useState(false);
  const [filterDueNextWeek, setFilterDueNextWeek] = useState(false);
  const [openListMenu, setOpenListMenu] = useState<'sort' | 'group' | 'options' | null>(null);
  const [listSort, setListSort] = useState<'recent' | 'dueAsc' | 'dueDesc' | 'titleAsc'>('recent');
  const [listGroupBy, setListGroupBy] = useState<'sections' | 'project' | 'visibility'>('sections');
  const [showEmptyListSections, setShowEmptyListSections] = useState(true);
  const [dashboardPanel, setDashboardPanel] = useState<DashboardPanelState | null>(null);
  const [fileItems, setFileItems] = useState<FileAttachmentItem[]>([]);
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const currentUserName = useMemo(() => getCurrentUserName(), []);

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    try {
      const rawColumns = localStorage.getItem(MYA_CUSTOM_COLUMNS_KEY);
      const rawValues = localStorage.getItem(MYA_CUSTOM_VALUES_KEY);
      const rawSectionNames = localStorage.getItem(MYA_SECTION_NAMES_KEY);
      const rawBoardColumns = localStorage.getItem(MYA_BOARD_COLUMNS_KEY);
      const rawBoardTaskColumn = localStorage.getItem(MYA_BOARD_TASK_COLUMN_KEY);
      if (rawColumns) {
        const parsed = JSON.parse(rawColumns) as CustomColumn[];
        if (Array.isArray(parsed)) setCustomColumns(parsed);
      }
      if (rawValues) {
        const parsed = JSON.parse(rawValues) as Record<string, Record<string, string>>;
        if (parsed && typeof parsed === 'object') setCustomValues(parsed);
      }
      if (rawSectionNames) {
        const parsed = JSON.parse(rawSectionNames) as Record<BucketKey, string>;
        if (parsed && typeof parsed === 'object') {
          setSectionNames({ ...DEFAULT_SECTION_NAMES, ...parsed });
        }
      }
      if (rawBoardColumns) {
        const parsed = JSON.parse(rawBoardColumns) as CustomBoardColumn[];
        if (Array.isArray(parsed)) setCustomBoardColumns(parsed);
      }
      if (rawBoardTaskColumn) {
        const parsed = JSON.parse(rawBoardTaskColumn) as Record<string, string>;
        if (parsed && typeof parsed === 'object') setTaskBoardColumn(parsed);
      }
    } catch {
      // ignore local storage parse errors
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(MYA_CUSTOM_COLUMNS_KEY, JSON.stringify(customColumns));
  }, [customColumns]);

  useEffect(() => {
    localStorage.setItem(MYA_CUSTOM_VALUES_KEY, JSON.stringify(customValues));
  }, [customValues]);

  useEffect(() => {
    localStorage.setItem(MYA_SECTION_NAMES_KEY, JSON.stringify(sectionNames));
  }, [sectionNames]);

  useEffect(() => {
    localStorage.setItem(MYA_BOARD_COLUMNS_KEY, JSON.stringify(customBoardColumns));
  }, [customBoardColumns]);

  useEffect(() => {
    localStorage.setItem(MYA_BOARD_TASK_COLUMN_KEY, JSON.stringify(taskBoardColumn));
  }, [taskBoardColumn]);

  useEffect(() => {
    let cancelled = false;
    const createdUrls: string[] = [];

    const buildPreviews = async () => {
      const next: Record<string, string> = {};
      for (const item of fileItems) {
        if (item.storedPath.startsWith('url:') || !item.mimeType.startsWith('image/')) continue;
        const stored = await getFile(item.storedPath);
        if (!stored) continue;
        const blob = new Blob([stored.data], { type: stored.mimeType || item.mimeType });
        const url = URL.createObjectURL(blob);
        createdUrls.push(url);
        next[item.id] = url;
      }
      if (!cancelled) setFilePreviews(next);
    };

    void buildPreviews();
    return () => {
      cancelled = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [fileItems]);

  useEffect(() => {
    const onDocumentClick = () => setOpenListMenu(null);
    document.addEventListener('click', onDocumentClick);
    return () => document.removeEventListener('click', onDocumentClick);
  }, []);

  useEffect(() => {
    setOpenListMenu(null);
  }, [activeView]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksData, phasesData, projectsData, teamsData, membersData, attachmentsData] = await Promise.all([
        getTasks(),
        getPhases(),
        getProjects(),
        getTeams(),
        getAllTeamMembers(),
        getAllAttachments(),
      ]);
      setTasks(tasksData);
      setPhases(phasesData);
      setProjects(projectsData);
      setTeams(teamsData);
      setTeamMembers(membersData);
      const mapEntries = await Promise.all(
        tasksData.map(async (task) => {
          const linked = await getProjectsByTaskId(task.id);
          return [task.id, linked] as const;
        })
      );
      const nextTaskProjectIds: Record<string, string[]> = {};
      mapEntries.forEach(([taskId, projectIds]) => {
        nextTaskProjectIds[taskId] = projectIds;
      });
      setTaskProjectIds(nextTaskProjectIds);
      const titleByTask = new Map(tasksData.map((item) => [item.id, item.title]));
      const scopedAttachments = attachmentsData
        .filter((item) => titleByTask.has(item.taskId))
        .map((item) => ({ ...item, taskTitle: titleByTask.get(item.taskId) || 'Attività' }));
      setFileItems(scopedAttachments);
      if (activeTask) {
        const refreshed = tasksData.find((item) => item.id === activeTask.id) || null;
        setActiveTask(refreshed);
      }
    } catch (err) {
      console.error('Failed to load activities data', err);
    } finally {
      setLoading(false);
    }
  };

  const createAssignedRecentTask = async () => {
    setCreating(true);
    try {
      await createTask(null, 'Nuova attività', '', 'todo', 'medium', undefined, 0, null, null, 'default_task', currentUserName, false);
      await loadData();
    } catch (err) {
      console.error('Failed to create task', err);
    } finally {
      setCreating(false);
    }
  };

  const createCalendarTaskTodayAndOpen = async () => {
    setCreating(true);
    try {
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      const created = await createTask(null, 'Nuova attività', '', 'todo', 'medium', todayDate, 0, null, null, 'default_task', currentUserName, false);
      await loadData();
      setActiveTask(created);
    } catch (err) {
      console.error('Failed to create today task from calendar', err);
    } finally {
      setCreating(false);
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    const next = task.status === 'done' ? 'in_progress' : 'done';
    await updateTask(task.id, { status: next, progress: next === 'done' ? 100 : task.progress });
    await loadData();
  };

  const getTaskProjects = (task: Task): Array<{ id: string; name: string }> => {
    const items: Array<{ id: string; name: string }> = [];
    const seen = new Set<string>();
    const linked = taskProjectIds[task.id] || [];
    linked.forEach((projectId) => {
      const project = projects.find((item) => item.id === projectId);
      if (!project || seen.has(project.id)) return;
      seen.add(project.id);
      items.push({ id: project.id, name: project.name });
    });
    if (task.phaseId) {
      const phase = phases.find((item) => item.id === task.phaseId);
      const phaseProject = projects.find((project) => project.id === phase?.projectId);
      if (phaseProject && !seen.has(phaseProject.id)) {
        seen.add(phaseProject.id);
        items.push({ id: phaseProject.id, name: phaseProject.name });
      }
    }
    return items;
  };

  const today = useMemo(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
  }, []);

  const endOfWeek = useMemo(() => {
    const value = new Date(today);
    value.setDate(value.getDate() + 7);
    return value;
  }, [today]);

  const tomorrow = useMemo(() => {
    const value = new Date(today);
    value.setDate(value.getDate() + 1);
    return value;
  }, [today]);

  const activeTasks = useMemo(() => tasks.filter((task) => task.status !== 'done'), [tasks]);

  const recentAssigned = useMemo(
    () =>
      activeTasks
        .filter((task) => {
          if (!task.dueDate) return true;
          const due = new Date(task.dueDate);
          due.setHours(0, 0, 0, 0);
          return due.getTime() === tomorrow.getTime();
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [activeTasks, tomorrow]
  );

  const dueToday = useMemo(
    () =>
      activeTasks.filter((task) => {
        if (!task.dueDate) return false;
        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);
        return due.getTime() === today.getTime();
      }),
    [activeTasks, today]
  );

  const dueNextWeek = useMemo(
    () =>
      activeTasks.filter((task) => {
        if (!task.dueDate) return false;
        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);
        return due > tomorrow && due <= endOfWeek;
      }),
    [activeTasks, endOfWeek, tomorrow]
  );

  const dueLater = useMemo(
    () =>
      activeTasks.filter((task) => {
        if (!task.dueDate) return false;
        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);
        return due > endOfWeek;
      }),
    [activeTasks, endOfWeek]
  );

  const listFilteredTasks = useMemo(() => {
    let base = tasks;
    if (filterOpenActive && !filterOpenDone) {
      base = base.filter((task) => task.status !== 'done');
    } else if (!filterOpenActive && filterOpenDone) {
      base = base.filter((task) => task.status === 'done');
    } else if (!filterOpenActive && !filterOpenDone) {
      base = [];
    }

    if (filterDueThisWeek || filterDueNextWeek) {
      const start = new Date(today);
      const day = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - day);
      const next = new Date(start);
      next.setDate(next.getDate() + 7);
      const nextNext = new Date(next);
      nextNext.setDate(nextNext.getDate() + 7);

      base = base.filter((task) => {
        if (!task.dueDate) return false;
        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);
        const inThisWeek = due >= start && due < next;
        const inNextWeek = due >= next && due < nextNext;
        return (filterDueThisWeek && inThisWeek) || (filterDueNextWeek && inNextWeek);
      });
    }

    const sorted = [...base];
    if (listSort === 'titleAsc') {
      sorted.sort((a, b) => a.title.localeCompare(b.title, 'it-IT'));
    } else if (listSort === 'dueAsc') {
      sorted.sort((a, b) => {
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return ad - bd;
      });
    } else if (listSort === 'dueDesc') {
      sorted.sort((a, b) => {
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : Number.MIN_SAFE_INTEGER;
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : Number.MIN_SAFE_INTEGER;
        return bd - ad;
      });
    } else {
      sorted.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }

    return sorted;
  }, [filterDueNextWeek, filterDueThisWeek, filterOpenActive, filterOpenDone, listSort, tasks, today]);

  const listRecentAssigned = useMemo(
    () =>
      listFilteredTasks.filter((task) => {
        if (!task.dueDate) return true;
        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);
        return due.getTime() === tomorrow.getTime();
      }),
    [listFilteredTasks, tomorrow]
  );

  const listDueToday = useMemo(
    () =>
      listFilteredTasks.filter((task) => {
        if (!task.dueDate) return false;
        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);
        return due.getTime() === today.getTime();
      }),
    [listFilteredTasks, today]
  );

  const listDueNextWeek = useMemo(
    () =>
      listFilteredTasks.filter((task) => {
        if (!task.dueDate) return false;
        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);
        return due > tomorrow && due <= endOfWeek;
      }),
    [endOfWeek, listFilteredTasks, tomorrow]
  );

  const listDueLater = useMemo(
    () =>
      listFilteredTasks.filter((task) => {
        if (!task.dueDate) return false;
        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);
        return due > endOfWeek;
      }),
    [endOfWeek, listFilteredTasks]
  );

  const completedTasks = useMemo(() => tasks.filter((task) => task.status === 'done'), [tasks]);
  const overdueTasks = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return tasks.filter((task) => {
      if (!task.dueDate || task.status === 'done') return false;
      const due = new Date(task.dueDate);
      due.setHours(0, 0, 0, 0);
      return due < now;
    });
  }, [tasks]);

  const nextMonthRange = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 30);
    return { start, end };
  }, []);

  const nextMonthTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (!task.dueDate) return false;
        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);
        return due >= nextMonthRange.start && due <= nextMonthRange.end;
      }),
    [nextMonthRange.end, nextMonthRange.start, tasks]
  );

  const dashboardSectionBars = useMemo(
    () => [
      { id: 'recent', name: sectionNames.recent, tasks: recentAssigned },
      { id: 'today', name: sectionNames.today, tasks: dueToday },
      { id: 'week', name: sectionNames.week, tasks: dueNextWeek },
      { id: 'later', name: sectionNames.later, tasks: dueLater },
    ],
    [dueLater, dueNextWeek, dueToday, recentAssigned, sectionNames.later, sectionNames.recent, sectionNames.today, sectionNames.week]
  );

  const dashboardProjectBars = useMemo(() => {
    const map = new Map<string, { id: string; name: string; taskIds: Set<string> }>();
    tasks.forEach((task) => {
      getTaskProjects(task).forEach((project) => {
        const current = map.get(project.id) || { id: project.id, name: project.name, taskIds: new Set<string>() };
        current.taskIds.add(task.id);
        map.set(project.id, current);
      });
    });
    return Array.from(map.values())
      .map((item) => ({ id: item.id, name: item.name, count: item.taskIds.size, taskIds: Array.from(item.taskIds) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [tasks, taskProjectIds, projects, phases]);

  const dashboardTimeline = useMemo(() => {
    const total = tasks.length;
    const out: Array<{ key: string; label: string; completed: number; total: number }> = [];
    for (let i = 8; i >= 0; i -= 1) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      const dayKey = day.toISOString().slice(0, 10);
      const completed = tasks.filter((task) => {
        if (task.status !== 'done') return false;
        const updated = new Date(task.updatedAt);
        updated.setHours(0, 0, 0, 0);
        return updated.getTime() <= day.getTime();
      }).length;
      out.push({
        key: dayKey,
        label: day.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
        completed,
        total,
      });
    }
    return out;
  }, [tasks]);

  const openDashboardPanel = (title: string, taskIds: string[]) => {
    setDashboardPanel({ title, taskIds: Array.from(new Set(taskIds)) });
  };

  const startsOfWeek = useMemo(() => {
    const start = new Date(today);
    const day = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - day);
    const next = new Date(start);
    next.setDate(next.getDate() + 7);
    const nextNext = new Date(next);
    nextNext.setDate(nextNext.getDate() + 7);
    return { start, next, nextNext };
  }, [today]);

  const boardFilteredTasks = useMemo(() => {
    let base = tasks;
    if (filterOpenActive && !filterOpenDone) {
      base = base.filter((task) => task.status !== 'done');
    } else if (!filterOpenActive && filterOpenDone) {
      base = base.filter((task) => task.status === 'done');
    } else if (!filterOpenActive && !filterOpenDone) {
      base = [];
    }

    if (filterDueThisWeek || filterDueNextWeek) {
      base = base.filter((task) => {
        if (!task.dueDate) return false;
        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);
        const inThisWeek = due >= startsOfWeek.start && due < startsOfWeek.next;
        const inNextWeek = due >= startsOfWeek.next && due < startsOfWeek.nextNext;
        return (filterDueThisWeek && inThisWeek) || (filterDueNextWeek && inNextWeek);
      });
    }
    return base;
  }, [filterDueNextWeek, filterDueThisWeek, filterOpenActive, filterOpenDone, startsOfWeek.next, startsOfWeek.nextNext, startsOfWeek.start, tasks]);

  const customBoardColumnIds = useMemo(() => new Set(customBoardColumns.map((column) => column.id)), [customBoardColumns]);

  const boardDefaultPool = useMemo(
    () => boardFilteredTasks.filter((task) => !customBoardColumnIds.has(taskBoardColumn[task.id] || '')),
    [boardFilteredTasks, customBoardColumnIds, taskBoardColumn]
  );

  const boardRecentAssigned = useMemo(
    () =>
      boardDefaultPool
        .filter((task) => {
          if (!task.dueDate) return true;
          const due = new Date(task.dueDate);
          due.setHours(0, 0, 0, 0);
          return due.getTime() === tomorrow.getTime();
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [boardDefaultPool, tomorrow]
  );

  const boardDueToday = useMemo(
    () =>
      boardDefaultPool.filter((task) => {
        if (!task.dueDate) return false;
        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);
        return due.getTime() === today.getTime();
      }),
    [boardDefaultPool, today]
  );

  const boardDueNextWeek = useMemo(
    () =>
      boardDefaultPool.filter((task) => {
        if (!task.dueDate) return false;
        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);
        return due > tomorrow && due <= endOfWeek;
      }),
    [boardDefaultPool, endOfWeek, tomorrow]
  );

  const boardDueLater = useMemo(
    () =>
      boardDefaultPool.filter((task) => {
        if (!task.dueDate) return false;
        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);
        return due > endOfWeek;
      }),
    [boardDefaultPool, endOfWeek]
  );

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateCustomCell = (taskId: string, columnId: string, value: string) => {
    setCustomValues((prev) => ({
      ...prev,
      [taskId]: {
        ...(prev[taskId] || {}),
        [columnId]: value,
      },
    }));
  };

  const addCustomColumn = () => {
    const name = prompt('Nome nuova colonna')?.trim();
    if (!name) return;
    const id = `col_${Date.now()}`;
    setCustomColumns((prev) => [...prev, { id, name }]);
  };

  const renameSection = (bucket: BucketKey) => {
    const current = sectionNames[bucket];
    const next = prompt('Rinomina sezione', current)?.trim();
    if (!next) return;
    setSectionNames((prev) => ({ ...prev, [bucket]: next }));
    setOpenBoardMenu(null);
  };

  const toggleBoardGroup = (bucket: string) => {
    setCollapsedBoardGroups((prev) => ({ ...prev, [bucket]: !prev[bucket] }));
    setOpenBoardMenu(null);
  };

  const renameCustomBoardColumn = (columnId: string) => {
    const current = customBoardColumns.find((column) => column.id === columnId);
    if (!current) return;
    const next = prompt('Rinomina sezione', current.name)?.trim();
    if (!next) return;
    setCustomBoardColumns((prev) => prev.map((column) => (column.id === columnId ? { ...column, name: next } : column)));
    setOpenBoardMenu(null);
  };

  const addBoardColumn = () => {
    const name = prompt('Nome nuova sezione', 'Nuova sezione')?.trim();
    if (!name) return;
    const id = `board_${Date.now()}`;
    setCustomBoardColumns((prev) => [...prev, { id, name }]);
    setCollapsedBoardGroups((prev) => ({ ...prev, [id]: false }));
  };

  const removeBoardColumn = (columnId: string) => {
    if (!confirm('Eliminare questa sezione?')) return;
    setCustomBoardColumns((prev) => prev.filter((column) => column.id !== columnId));
    setTaskBoardColumn((prev) => {
      const next: Record<string, string> = {};
      Object.entries(prev).forEach(([taskId, mappedColumn]) => {
        if (mappedColumn !== columnId) next[taskId] = mappedColumn;
      });
      return next;
    });
    setCollapsedBoardGroups((prev) => {
      const { [columnId]: _removed, ...rest } = prev;
      return rest;
    });
    setOpenBoardMenu(null);
  };

  const renameCustomColumn = (columnId: string) => {
    const current = customColumns.find((item) => item.id === columnId);
    if (!current) return;
    const next = prompt('Rinomina colonna', current.name)?.trim();
    if (!next) return;
    setCustomColumns((prev) => prev.map((item) => (item.id === columnId ? { ...item, name: next } : item)));
  };

  const removeCustomColumn = (columnId: string) => {
    if (!confirm('Rimuovere questa colonna personalizzata?')) return;
    setCustomColumns((prev) => prev.filter((item) => item.id !== columnId));
    setCustomValues((prev) => {
      const next: Record<string, Record<string, string>> = {};
      Object.entries(prev).forEach(([taskId, cols]) => {
        const { [columnId]: _removed, ...rest } = cols;
        next[taskId] = rest;
      });
      return next;
    });
  };

  const openAttachment = async (item: FileAttachmentItem) => {
    if (item.storedPath.startsWith('url:')) {
      window.open(item.storedPath.slice(4), '_blank', 'noopener,noreferrer');
      return;
    }
    const stored = await getFile(item.storedPath);
    if (!stored) return;
    const blob = new Blob([stored.data], { type: stored.mimeType || item.mimeType });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const gridTemplateColumns = useMemo(() => {
    const fixed = [
      'minmax(340px, 2.2fr)',
      'minmax(120px, 0.9fr)',
      'minmax(120px, 0.9fr)',
      'minmax(150px, 1.1fr)',
      'minmax(160px, 1.2fr)',
    ];
    const dynamic = customColumns.map(() => 'minmax(150px, 1fr)');
    return [...fixed, ...dynamic, '50px'].join(' ');
  }, [customColumns]);

  const renderSection = (sectionKey: string, title: string, sectionTasks: Task[]) => (
    <div className="mya-section" key={sectionKey}>
      <button className="mya-section-head" onClick={() => toggleSection(sectionKey)} type="button">
        <span className={`mya-chevron ${collapsedSections[sectionKey] ? 'collapsed' : ''}`} />
        <strong>{title}</strong>
      </button>
      {!collapsedSections[sectionKey] && (
        <div className="mya-section-rows">
          {sectionTasks.length === 0 ? (
            <div className="mya-row mya-row-empty">Nessuna attività</div>
          ) : (
            sectionTasks.map((task) => {
              const projectsInTask = getTaskProjects(task);
              return (
              <div className="mya-row" key={task.id} style={{ gridTemplateColumns }}>
                <div className="mya-cell mya-cell-name">
                  <button
                    className={`my-activity-check ${task.status === 'done' ? 'done' : ''}`}
                    onClick={() => void toggleTaskStatus(task)}
                    type="button"
                  >
                    {task.status === 'done' ? '✓' : ''}
                  </button>
                  <button className="my-activity-title" onClick={() => setActiveTask(task)} type="button">
                    {task.title}
                  </button>
                </div>
                <div className="mya-cell">{formatDueDate(task.dueDate) || '-'}</div>
                <div className="mya-cell">-</div>
                <div className="mya-cell">
                  {projectsInTask.length > 0 ? (
                    <div className="my-activity-projects my-activity-projects-stacked">
                      {projectsInTask.slice(0, 2).map((project) => (
                        <span key={`${task.id}-${project.id}`} className="my-activity-project" style={getProjectBadgeStyle(project.id)}>{project.name}</span>
                      ))}
                      {projectsInTask.length > 2 && (
                        <span
                          className="my-activity-project my-activity-project-overflow"
                          title={projectsInTask.slice(2).map((project) => project.name).join(', ')}
                        >
                          +{projectsInTask.length - 2}
                        </span>
                      )}
                    </div>
                  ) : '-'}
                </div>
                <div className="mya-cell">{task.isPublic ? 'Il mio spazio di lavoro' : 'Solo io'}</div>
                {customColumns.map((column) => (
                  <div className="mya-cell" key={`${task.id}-${column.id}`}>
                    <input
                      className="mya-cell-input"
                      value={customValues[task.id]?.[column.id] || ''}
                      onChange={(event) => updateCustomCell(task.id, column.id, event.target.value)}
                      placeholder="-"
                    />
                  </div>
                ))}
                <div className="mya-cell mya-cell-tail" />
              </div>
            )})
          )}
          <button className="mya-add-row" type="button" onClick={() => void createAssignedRecentTask()} disabled={creating}>
            Aggiungi attività...
          </button>
        </div>
      )}
    </div>
  );

  const listSections = useMemo(() => {
    if (listGroupBy === 'project') {
      const grouped = new Map<string, { key: string; title: string; tasks: Task[] }>();
      listFilteredTasks.forEach((task) => {
        const projectsForTask = getTaskProjects(task);
        const first = projectsForTask[0];
        const key = first ? `project:${first.id}` : 'project:none';
        const title = first ? first.name : 'Senza progetto';
        const existing = grouped.get(key) || { key, title, tasks: [] };
        existing.tasks.push(task);
        grouped.set(key, existing);
      });
      return Array.from(grouped.values());
    }

    if (listGroupBy === 'visibility') {
      const visibleMine = listFilteredTasks.filter((task) => !task.isPublic);
      const visibleWorkspace = listFilteredTasks.filter((task) => task.isPublic);
      return [
        { key: 'visibility:mine', title: 'Solo io', tasks: visibleMine },
        { key: 'visibility:workspace', title: 'Il mio spazio di lavoro', tasks: visibleWorkspace },
      ];
    }

    return [
      { key: 'recent', title: sectionNames.recent, tasks: listRecentAssigned },
      { key: 'today', title: sectionNames.today, tasks: listDueToday },
      { key: 'week', title: sectionNames.week, tasks: listDueNextWeek },
      { key: 'later', title: sectionNames.later, tasks: listDueLater },
    ];
  }, [getTaskProjects, listDueLater, listDueNextWeek, listDueToday, listFilteredTasks, listGroupBy, listRecentAssigned, sectionNames.later, sectionNames.recent, sectionNames.today, sectionNames.week]);

  const boardColumns: Array<{ key: string; title: string; tasks: Task[]; custom: boolean }> = [
    { key: 'recent', title: sectionNames.recent, tasks: boardRecentAssigned, custom: false },
    { key: 'today', title: sectionNames.today, tasks: boardDueToday, custom: false },
    { key: 'week', title: sectionNames.week, tasks: boardDueNextWeek, custom: false },
    { key: 'later', title: sectionNames.later, tasks: boardDueLater, custom: false },
    ...customBoardColumns.map((column) => ({
      key: column.id,
      title: column.name,
      tasks: boardFilteredTasks.filter((task) => taskBoardColumn[task.id] === column.id),
      custom: true,
    })),
  ];

  const moveTaskToBucket = async (taskId: string, bucket: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    if (customBoardColumnIds.has(bucket)) {
      setTaskBoardColumn((prev) => ({ ...prev, [taskId]: bucket }));
      return;
    }

    const base = new Date();
    base.setHours(0, 0, 0, 0);
    let dueDate: Date | null = null;

    if (bucket === 'today') {
      dueDate = new Date(base);
    } else if (bucket === 'week') {
      dueDate = new Date(base);
      dueDate.setDate(dueDate.getDate() + 3);
    } else if (bucket === 'later') {
      dueDate = new Date(base);
      dueDate.setDate(dueDate.getDate() + 14);
    }

    await updateTask(taskId, { dueDate });
    setTaskBoardColumn((prev) => {
      const { [taskId]: _removed, ...rest } = prev;
      return rest;
    });
    await loadData();
  };

  const createTaskInBucket = async (bucket: string) => {
    setCreating(true);
    try {
      const base = new Date();
      base.setHours(0, 0, 0, 0);
      let dueDate: Date | undefined;
      if (bucket === 'today') {
        dueDate = new Date(base);
      } else if (bucket === 'week') {
        dueDate = new Date(base);
        dueDate.setDate(dueDate.getDate() + 3);
      } else if (bucket === 'later') {
        dueDate = new Date(base);
        dueDate.setDate(dueDate.getDate() + 14);
      }

      const created = await createTask(null, 'Nuova attività', '', 'todo', 'medium', dueDate, 0, null, null, 'default_task', currentUserName, false);
      if (customBoardColumnIds.has(bucket)) {
        setTaskBoardColumn((prev) => ({ ...prev, [created.id]: bucket }));
      }
      await loadData();
    } catch (err) {
      console.error('Failed to create task in bucket', err);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="page-container my-activities-page">
      <div className="mya-top-sticky">
        <div className="mya-title-row">
          <div className="mya-title-left">
            <span className="mya-avatar">{currentUserName.charAt(0).toUpperCase()}</span>
            <h1>Le mie attività</h1>
          </div>
          <div className="mya-title-actions">
            <button className="btn-secondary" type="button">Condividi</button>
            <button className="btn-secondary" type="button">Personalizza</button>
          </div>
        </div>

        <div className="mya-nav-tabs">
          <button className={activeView === 'list' ? 'active' : ''} type="button" onClick={() => setActiveView('list')}>Elenco</button>
          <button className={activeView === 'board' ? 'active' : ''} type="button" onClick={() => setActiveView('board')}>Bacheca</button>
          <button className={activeView === 'calendar' ? 'active' : ''} type="button" onClick={() => setActiveView('calendar')}>Calendario</button>
          <button className={activeView === 'dashboard' ? 'active' : ''} type="button" onClick={() => setActiveView('dashboard')}>Dashboard</button>
          <button className={activeView === 'file' ? 'active' : ''} type="button" onClick={() => setActiveView('file')}>File</button>
        </div>

        <div className="mya-toolbar-row">
          <button
            className="mya-add-btn"
            type="button"
            onClick={() => void (activeView === 'calendar' ? createCalendarTaskTodayAndOpen() : createAssignedRecentTask())}
            disabled={creating}
          >
            + Aggiungi attività
          </button>
          <div className="mya-toolbar-actions" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setShowBoardFilters((open) => !open)}>Filtra</button>
            <div className="mya-toolbar-menu-wrap">
              <button type="button" disabled={activeView !== 'list'} onClick={() => setOpenListMenu((prev) => (prev === 'sort' ? null : 'sort'))}>Ordina</button>
              {activeView === 'list' && openListMenu === 'sort' && (
                <div className="mya-toolbar-menu">
                  <button type="button" onClick={() => { setListSort('recent'); setOpenListMenu(null); }}>Più recenti</button>
                  <button type="button" onClick={() => { setListSort('dueAsc'); setOpenListMenu(null); }}>Scadenza crescente</button>
                  <button type="button" onClick={() => { setListSort('dueDesc'); setOpenListMenu(null); }}>Scadenza decrescente</button>
                  <button type="button" onClick={() => { setListSort('titleAsc'); setOpenListMenu(null); }}>Nome (A-Z)</button>
                </div>
              )}
            </div>
            <div className="mya-toolbar-menu-wrap">
              <button type="button" disabled={activeView !== 'list'} onClick={() => setOpenListMenu((prev) => (prev === 'group' ? null : 'group'))}>Raggruppa</button>
              {activeView === 'list' && openListMenu === 'group' && (
                <div className="mya-toolbar-menu">
                  <button type="button" onClick={() => { setListGroupBy('sections'); setOpenListMenu(null); }}>Per sezione</button>
                  <button type="button" onClick={() => { setListGroupBy('project'); setOpenListMenu(null); }}>Per progetto</button>
                  <button type="button" onClick={() => { setListGroupBy('visibility'); setOpenListMenu(null); }}>Per visibilità</button>
                </div>
              )}
            </div>
            <div className="mya-toolbar-menu-wrap">
              <button type="button" disabled={activeView !== 'list'} onClick={() => setOpenListMenu((prev) => (prev === 'options' ? null : 'options'))}>Opzioni</button>
              {activeView === 'list' && openListMenu === 'options' && (
                <div className="mya-toolbar-menu">
                  <button type="button" onClick={() => setShowEmptyListSections((v) => !v)}>
                    {showEmptyListSections ? 'Nascondi sezioni vuote' : 'Mostra sezioni vuote'}
                  </button>
                  <button type="button" onClick={() => setCollapsedSections(Object.fromEntries(listSections.map((section) => [section.key, false])))}>
                    Espandi sezioni
                  </button>
                  <button type="button" onClick={() => setCollapsedSections(Object.fromEntries(listSections.map((section) => [section.key, true])))}>
                    Comprimi sezioni
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {(activeView === 'board' || activeView === 'list') && showBoardFilters && (
          <div className="mya-filters-panel">
            <div className="mya-filters-head">
              <h3>Filtri</h3>
              <button
                type="button"
                onClick={() => {
                  setFilterOpenActive(true);
                  setFilterOpenDone(false);
                  setFilterDueThisWeek(false);
                  setFilterDueNextWeek(false);
                }}
              >
                Cancella
              </button>
            </div>
            <p>Filtri rapidi</p>
            <div className="mya-filters-chips">
              <button type="button" className={filterOpenActive ? 'active' : ''} onClick={() => setFilterOpenActive((v) => !v)}>
                Attività non completate
              </button>
              <button type="button" className={filterOpenDone ? 'active' : ''} onClick={() => setFilterOpenDone((v) => !v)}>
                Attività completate
              </button>
              <button type="button" className={filterDueThisWeek ? 'active' : ''} onClick={() => setFilterDueThisWeek((v) => !v)}>
                In scadenza questa settimana
              </button>
              <button type="button" className={filterDueNextWeek ? 'active' : ''} onClick={() => setFilterDueNextWeek((v) => !v)}>
                In scadenza la prossima settimana
              </button>
            </div>
            <button type="button" className="mya-add-filter-btn">+ Aggiungi filtro</button>
          </div>
        )}

      </div>

      <div className="mya-scroll-area">
        {activeView === 'list' ? (
          <>
            <div className="mya-columns-head mya-columns-head-sticky" style={{ gridTemplateColumns }}>
              <div>Nome</div>
              <div>Data di scadenza</div>
              <div>Collaboratori</div>
              <div>Progetti</div>
              <div>Visibilità dell'attività</div>
              {customColumns.map((column) => (
                <div key={column.id} className="mya-custom-col-head">
                  <button type="button" onClick={() => renameCustomColumn(column.id)} title="Rinomina colonna">
                    {column.name}
                  </button>
                  <button type="button" onClick={() => removeCustomColumn(column.id)} title="Rimuovi colonna">
                    ×
                  </button>
                </div>
              ))}
              <div>
                <button className="mya-add-col-btn" type="button" onClick={addCustomColumn} title="Aggiungi colonna">
                  +
                </button>
              </div>
            </div>
            {listSections
              .filter((section) => showEmptyListSections || section.tasks.length > 0)
              .map((section) => renderSection(section.key, section.title, section.tasks))}
          </>
        ) : activeView === 'dashboard' ? (
          <section className="mya-dashboard">
            <div className="mya-dash-kpis">
              <article className="mya-dash-kpi">
                <h4>Attività completate</h4>
                <strong>{completedTasks.length}</strong>
                <button type="button" onClick={() => openDashboardPanel('Attività completate', completedTasks.map((task) => task.id))}>Mostra tutto</button>
              </article>
              <article className="mya-dash-kpi">
                <h4>Attività non completate</h4>
                <strong>{tasks.length - completedTasks.length}</strong>
                <button type="button" onClick={() => openDashboardPanel('Attività non completate', tasks.filter((task) => task.status !== 'done').map((task) => task.id))}>Mostra tutto</button>
              </article>
              <article className="mya-dash-kpi">
                <h4>Attività scadute totali</h4>
                <strong>{overdueTasks.length}</strong>
                <button type="button" onClick={() => openDashboardPanel('Attività scadute', overdueTasks.map((task) => task.id))}>Mostra tutto</button>
              </article>
              <article className="mya-dash-kpi">
                <h4>Attività totali</h4>
                <strong>{tasks.length}</strong>
                <button type="button" onClick={() => openDashboardPanel('Tutte le attività', tasks.map((task) => task.id))}>Mostra tutto</button>
              </article>
            </div>

            <div className="mya-dash-grid">
              <article className="mya-dash-card">
                <header>
                  <h4>Attività totali per sezione</h4>
                  <button type="button" onClick={() => openDashboardPanel('Attività per sezione', dashboardSectionBars.flatMap((item) => item.tasks.map((task) => task.id)))}>
                    Mostra tutto
                  </button>
                </header>
                <div className="mya-mini-bars">
                  {dashboardSectionBars.map((item) => (
                    <button key={item.id} type="button" className="mya-mini-bar-col" onClick={() => openDashboardPanel(item.name, item.tasks.map((task) => task.id))}>
                      <span>{item.tasks.length}</span>
                      <div className="mya-mini-bar-track">
                        <div className="mya-mini-bar-fill" style={{ height: `${Math.max(8, item.tasks.length * 16)}px` }} />
                      </div>
                      <small>{item.name}</small>
                    </button>
                  ))}
                </div>
              </article>

              <article className="mya-dash-card">
                <header>
                  <h4>Attività del prossimo mese per stato</h4>
                  <button type="button" onClick={() => openDashboardPanel('Prossimo mese', nextMonthTasks.map((task) => task.id))}>
                    Mostra tutto
                  </button>
                </header>
                <div className="mya-donut-wrap">
                  <div className="mya-donut">
                    <span>{nextMonthTasks.length}</span>
                  </div>
                  <div className="mya-donut-legend">
                    <button type="button" onClick={() => openDashboardPanel('Prossimo mese - Completate', nextMonthTasks.filter((task) => task.status === 'done').map((task) => task.id))}>
                      Completate: {nextMonthTasks.filter((task) => task.status === 'done').length}
                    </button>
                    <button type="button" onClick={() => openDashboardPanel('Prossimo mese - Non completate', nextMonthTasks.filter((task) => task.status !== 'done').map((task) => task.id))}>
                      Non completate: {nextMonthTasks.filter((task) => task.status !== 'done').length}
                    </button>
                  </div>
                </div>
              </article>

              <article className="mya-dash-card">
                <header>
                  <h4>Attività totali per progetto</h4>
                  <button type="button" onClick={() => openDashboardPanel('Attività per progetto', dashboardProjectBars.flatMap((item) => item.taskIds))}>
                    Mostra tutto
                  </button>
                </header>
                <div className="mya-mini-bars">
                  {dashboardProjectBars.length === 0 ? (
                    <p className="text-muted">Nessun progetto.</p>
                  ) : (
                    dashboardProjectBars.map((item) => (
                      <button key={item.id} type="button" className="mya-mini-bar-col" onClick={() => openDashboardPanel(item.name, item.taskIds)}>
                        <span>{item.count}</span>
                        <div className="mya-mini-bar-track">
                          <div className="mya-mini-bar-fill alt" style={{ height: `${Math.max(8, item.count * 18)}px` }} />
                        </div>
                        <small>{item.name}</small>
                      </button>
                    ))
                  )}
                </div>
              </article>

              <article className="mya-dash-card">
                <header>
                  <h4>Completamento attività nel tempo</h4>
                  <button type="button" onClick={() => openDashboardPanel('Completamento nel tempo', tasks.map((task) => task.id))}>
                    Mostra tutto
                  </button>
                </header>
                <div className="mya-line-chart">
                  {dashboardTimeline.map((point) => (
                    <button key={point.key} type="button" className="mya-line-point" onClick={() => openDashboardPanel(`Snapshot ${point.label}`, tasks.filter((task) => new Date(task.updatedAt).getTime() <= new Date(point.key).getTime() + 86400000).map((task) => task.id))}>
                      <div className="mya-line-value">{point.completed}</div>
                      <div className="mya-line-stick" style={{ height: `${Math.max(6, point.completed * 12)}px` }} />
                      <small>{point.label}</small>
                    </button>
                  ))}
                </div>
              </article>
            </div>
          </section>
        ) : activeView === 'file' ? (
          <section className="mya-files-view">
            {fileItems.length === 0 ? (
              <p className="text-muted">Nessun file allegato.</p>
            ) : (
              <div className="mya-files-grid">
                {fileItems.map((item) => (
                  <article key={item.id} className="mya-file-card">
                    <button type="button" className="mya-file-preview" onClick={() => void openAttachment(item)} title={item.filename}>
                      {filePreviews[item.id] ? (
                        <img src={filePreviews[item.id]} alt={item.filename} />
                      ) : (
                        <span>{item.mimeType.startsWith('image/') ? 'IMG' : 'FILE'}</span>
                      )}
                    </button>
                    <button type="button" className="mya-file-name" onClick={() => void openAttachment(item)} title={item.filename}>
                      {item.filename}
                    </button>
                    <div className="mya-file-meta">
                      <span>{item.taskTitle}</span>
                      <span>{formatFileSize(item.size)}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : activeView === 'board' ? (
          <section className="mya-board-columns">
            {boardColumns.map((column) => (
              <div
                key={column.key}
                className={`mya-board-column ${dragTaskId ? 'is-droppable' : ''} ${collapsedBoardGroups[column.key] ? 'collapsed' : ''}`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (!dragTaskId) return;
                  void moveTaskToBucket(dragTaskId, column.key);
                  setDragTaskId(null);
                }}
              >
                <button
                  type="button"
                  className="mya-board-column-head"
                  onClick={() => {
                    if (collapsedBoardGroups[column.key]) toggleBoardGroup(column.key);
                  }}
                >
                  <h3
                    onClick={(event) => {
                      event.stopPropagation();
                      if (column.custom) {
                        renameCustomBoardColumn(column.key);
                      } else {
                        renameSection(column.key as BucketKey);
                      }
                    }}
                  >
                    {column.title}
                  </h3>
                  <span>{column.tasks.length}</span>
                  <div className="mya-board-head-actions" onClick={(event) => event.stopPropagation()}>
                    <button type="button" title="Comprimi gruppo" onClick={() => toggleBoardGroup(column.key)}>⇤</button>
                    <button type="button" title="Aggiungi attività" onClick={() => void createTaskInBucket(column.key)}>+</button>
                    <button type="button" title="Menu" onClick={() => setOpenBoardMenu((prev) => (prev === column.key ? null : column.key))}>•••</button>
                  </div>
                  {openBoardMenu === column.key && (
                    <div className="mya-board-menu">
                      <button type="button" onClick={() => toggleBoardGroup(column.key)}>Comprimi gruppo</button>
                      <button type="button" onClick={() => void createTaskInBucket(column.key)}>Aggiungi attività</button>
                      <button type="button" onClick={() => (column.custom ? renameCustomBoardColumn(column.key) : renameSection(column.key as BucketKey))}>Rinomina sezione</button>
                      {column.custom && <button type="button" onClick={() => removeBoardColumn(column.key)}>Elimina sezione</button>}
                    </div>
                  )}
                </button>
                {!collapsedBoardGroups[column.key] && (
                  <div className="mya-board-column-body">
                    <button className="mya-board-add-task" onClick={() => void createTaskInBucket(column.key)} disabled={creating} type="button">
                      + Aggiungi attività
                    </button>
                    {column.tasks.map((task) => (
                      <article
                        key={task.id}
                        className="mya-board-task-card"
                        draggable
                        onDragStart={() => setDragTaskId(task.id)}
                        onDragEnd={() => setDragTaskId(null)}
                        onClick={() => setActiveTask(task)}
                      >
                        <div className="mya-board-task-title">{task.title}</div>
                        <div className="mya-board-task-meta">
                          {getTaskProjects(task).length > 0 ? (
                            <div className="my-activity-projects">
                              {getTaskProjects(task).map((project) => (
                                <span key={`${task.id}-board-${project.id}`} className="my-activity-project" style={getProjectBadgeStyle(project.id)}>{project.name}</span>
                              ))}
                            </div>
                          ) : <span>-</span>}
                          <span>{formatDueDate(task.dueDate) || '-'}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="mya-board-column mya-board-column-placeholder">
              <button className="mya-board-add-section" type="button" onClick={addBoardColumn}>
                + Aggiungi sezione
              </button>
            </div>
          </section>
        ) : (
          <div className="mya-calendar-wrap">
            <TaskCalendar
              tasks={tasks}
              onEdit={(task) => setActiveTask(task)}
              onMoveTask={async (task, date) => {
                await updateTask(task.id, { dueDate: date });
                await loadData();
              }}
            />
          </div>
        )}
      </div>

      {dashboardPanel && (
        <div className="mya-dash-panel-overlay" onClick={() => setDashboardPanel(null)}>
          <div className="mya-dash-panel" onClick={(event) => event.stopPropagation()}>
            <header>
              <h3>{dashboardPanel.title}</h3>
              <button type="button" onClick={() => setDashboardPanel(null)}>Chiudi</button>
            </header>
            <div className="mya-dash-table-head">
              <div>Nome attività</div>
              <div>Incaricato</div>
              <div>Data di scadenza</div>
              <div>Progetti</div>
            </div>
            <div className="mya-dash-table-body">
              {tasks.filter((task) => dashboardPanel.taskIds.includes(task.id)).map((task) => (
                <button key={task.id} type="button" className="mya-dash-table-row" onClick={() => setActiveTask(task)}>
                  <div>{task.title}</div>
                  <div>{task.assignee || '-'}</div>
                  <div>{formatDueDate(task.dueDate) || '-'}</div>
                  <div>
                    {getTaskProjects(task).length > 0 ? (
                      <div className="my-activity-projects">
                        {getTaskProjects(task).map((project) => (
                          <span key={`${task.id}-panel-${project.id}`} className="my-activity-project" style={getProjectBadgeStyle(project.id)}>{project.name}</span>
                        ))}
                      </div>
                    ) : '-'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTask && (
        <TaskDetailPanel
          task={activeTask}
          currentUserName={currentUserName}
          projects={projects}
          phases={phases}
          teams={teams}
          teamMembers={teamMembers}
          allTasks={tasks}
          onOpenProject={onOpenProject}
          onOpenTask={(taskId) => {
            const target = tasks.find((item) => item.id === taskId);
            if (target) setActiveTask(target);
          }}
          onClose={() => setActiveTask(null)}
          onUpdated={loadData}
        />
      )}
    </div>
  );
}

