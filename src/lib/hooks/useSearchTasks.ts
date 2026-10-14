// src/lib/hooks/useSearchTasks.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { Task, TaskStatus, TaskPriority } from './useTasks';

export interface SearchTasksParams {
  search?: string;
  statuses?: TaskStatus[];
  priorities?: TaskPriority[];
  dueFrom?: string;
  dueTo?: string;
  assigneeId?: string;
  assignedToMe?: boolean;
}

export function useSearchTasks(params: SearchTasksParams) {
  return useQuery({
    queryKey: ['tasks', 'search', params],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Task[]; total: number } | Task[]>(
        '/tasks/search/advanced',
        {
          params: {
            ...(params.search ? { search: params.search } : {}),
            ...(params.statuses?.length ? { statuses: params.statuses.join(',') } : {}),
            ...(params.priorities?.length ? { priorities: params.priorities.join(',') } : {}),
            ...(params.dueFrom ? { dueFrom: params.dueFrom } : {}),
            ...(params.dueTo ? { dueTo: params.dueTo } : {}),
            ...(params.assigneeId ? { assigneeId: params.assigneeId } : {}),
            ...(params.assignedToMe ? { assignedToMe: true } : {}),
            limit: 100,
          },
        },
      );
      return Array.isArray(data) ? data : (data.data ?? []);
    },
    staleTime: 15_000,
  });
}
