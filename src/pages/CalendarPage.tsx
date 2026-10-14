import React, { useEffect, useMemo, useState } from 'react';
import { Task, getTasks, updateTask } from '../lib/db/tasks';
import { Phase, getPhases } from '../lib/db/phases';
import { Project, getProjects } from '../lib/db/projects';
import { Team, getTeams } from '../lib/db/teams';
import { TeamMember, getAllTeamMembers } from '../lib/db/teamMembers';
import { TaskDetailPanel } from '../components/TaskDetailPanel';
import { TaskCalendar } from '../components/TaskCalendar';

const PROFILE_STORAGE_KEY = 'vayana_profile_settings_v1';

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

export function CalendarPage(): React.ReactElement {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  const currentUserName = useMemo(() => getCurrentUserName(), []);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksData, phasesData, projectsData, teamsData, membersData] = await Promise.all([
        getTasks(),
        getPhases(),
        getProjects(),
        getTeams(),
        getAllTeamMembers(),
      ]);
      setTasks(tasksData);
      setPhases(phasesData);
      setProjects(projectsData);
      setTeams(teamsData);
      setTeamMembers(membersData);
      if (activeTask) {
        const refreshed = tasksData.find((item) => item.id === activeTask.id) || null;
        setActiveTask(refreshed);
      }
    } catch (err) {
      console.error('Failed to load calendar data', err);
    } finally {
      setLoading(false);
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
    <div className="page-container calendar-page">
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

      {activeTask && (
        <TaskDetailPanel
          task={activeTask}
          currentUserName={currentUserName}
          projects={projects}
          phases={phases}
          teams={teams}
          teamMembers={teamMembers}
          allTasks={tasks}
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
