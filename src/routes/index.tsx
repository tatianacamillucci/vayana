// src/routes/index.tsx
import React from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

// Auth pages
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';

// App pages
import { Dashboard } from '@/components/Dashboard';
import { MyActivitiesPage } from '@/pages/MyActivitiesPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { ProjectBoardPage } from '@/pages/ProjectBoardPage';
import { TasksPage } from '@/pages/TasksPage';
import { TeamsPage } from '@/pages/TeamsPage';
import { TeamOverviewPage } from '@/pages/TeamOverviewPage';
import { PortfoliosPage } from '@/pages/PortfoliosPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { CalendarPage } from '@/pages/CalendarPage';

// ProjectBoardPage currently expects a projectId prop.
// This wrapper reads the :id param from the URL and passes it as a prop.
// Phase 13 will refactor ProjectBoardPage to use useParams() directly.
function ProjectBoardPageWrapper(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  if (!id) return <Navigate to="/projects" replace />;
  return (
    <ProjectBoardPage
      projectId={id}
      onOpenProject={(projectId: string) => navigate(`/projects/${projectId}`)}
    />
  );
}

export function AppRoutes(): React.ReactElement {
  return (
    <Routes>
      {/* Public routes — no auth required */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard onOpenProject={() => {}} />} />
        <Route path="/activities" element={<MyActivitiesPage onOpenProject={() => {}} />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectBoardPageWrapper />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/teams/:id" element={<TeamOverviewPage />} />
        <Route path="/portfolios" element={<PortfoliosPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        {/* Fallback: unknown paths redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
