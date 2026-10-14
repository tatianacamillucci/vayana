// src/lib/hooks/useSearch.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { Task } from './useTasks';
import type { Project } from './useProjects';
import type { UserSearchResult } from './useUsers';

export function useSearchTasks(q: string, enabled: boolean) {
  return useQuery({
    queryKey: ['search', 'tasks', q],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Task[]; total: number }>('/tasks/search/advanced', {
        params: { search: q, limit: 8, includeSubtasks: true },
      });
      return data.data ?? [];
    },
    enabled: enabled && q.length >= 2,
    staleTime: 10_000,
  });
}

export function useSearchProjects(q: string, enabled: boolean) {
  const lq = q.toLowerCase();
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Project[]; total: number } | Project[]>('/projects');
      return Array.isArray(data) ? data : (data.data ?? []);
    },
    select: (data) =>
      data.filter(
        (p) =>
          p.name.toLowerCase().includes(lq) ||
          (p.description ?? '').toLowerCase().includes(lq),
      ),
    enabled: enabled && q.length >= 2,
  });
}

export function useSearchUsers(q: string, enabled: boolean) {
  return useQuery({
    queryKey: ['search', 'users', q],
    queryFn: async () => {
      const { data } = await apiClient.get<UserSearchResult[]>('/users/search', {
        params: { q },
      });
      return data;
    },
    enabled: enabled && q.length >= 2,
    staleTime: 10_000,
  });
}
