// src/lib/hooks/useTasks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { toast } from '@/lib/toast';

// Status enum aligned with backend (uppercase 5 states)
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TaskAssignee {
  id: string;
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  progress?: number;
  phaseId?: string | null;
  projectId?: string | null;
  organizationId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  assignees?: TaskAssignee[];
  calculatedProgress?: number;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  phaseId?: string;
  projectId?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  progress?: number;
  phaseId?: string | null;
}

// GET /tasks/search/advanced?assignedToMe=true — tasks assigned to current user, cross-project
export function useMyTasks() {
  return useQuery({
    queryKey: ['tasks', 'myTasks'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Task[] } | Task[]>('/tasks/search/advanced', {
        params: { assignedToMe: true, limit: 100 },
      });
      return Array.isArray(data) ? data : (data.data ?? []);
    },
    enabled: true,
  });
}

// GET /tasks?projectId=...
export function useTasks(projectId?: string) {
  return useQuery({
    queryKey: ['tasks', { projectId }],
    queryFn: async () => {
      const params = projectId ? { projectId } : {};
      const { data } = await apiClient.get<{ data: Task[]; total: number } | Task[]>('/tasks', { params });
      return Array.isArray(data) ? data : (data.data ?? []);
    },
    enabled: true,
  });
}

// GET /tasks/:id
export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: async () => {
      const { data } = await apiClient.get<Task>(`/tasks/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

// POST /tasks
export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateTaskDto) => {
      const { data } = await apiClient.post<Task>('/tasks', dto);
      return data;
    },
    onSuccess: (task) => {
      if (task.projectId) {
        qc.invalidateQueries({ queryKey: ['tasks', { projectId: task.projectId }] });
      }
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['tasks', 'myTasks'] });
      toast.success('Task creato');
    },
    onError: () => toast.error('Errore nella creazione del task'),
  });
}

// PATCH /tasks/:id
export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateTaskDto }) => {
      const { data } = await apiClient.patch<Task>(`/tasks/${id}`, dto);
      return data;
    },
    onSuccess: (task) => {
      qc.invalidateQueries({ queryKey: ['tasks', task.id] });
      if (task.projectId) {
        qc.invalidateQueries({ queryKey: ['tasks', { projectId: task.projectId }] });
      }
      qc.invalidateQueries({ queryKey: ['tasks', 'myTasks'] });
      toast.success('Task aggiornato');
    },
    onError: () => toast.error('Errore nel salvataggio'),
  });
}

// DELETE /tasks/:id
export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/tasks/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task eliminato');
    },
    onError: () => toast.error('Errore nell\'eliminazione'),
  });
}

// POST /tasks/:id/assign
export function useAssignTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, userIds }: { taskId: string; userIds: string[] }) => {
      const { data } = await apiClient.post<Task>(`/tasks/${taskId}/assign`, { userIds });
      return data;
    },
    onSuccess: (task) => {
      qc.invalidateQueries({ queryKey: ['tasks', task.id] });
    },
  });
}

// POST /tasks/:id/move
export function useMoveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, phaseId, status }: { taskId: string; phaseId?: string; status?: TaskStatus }) => {
      const { data } = await apiClient.post<Task>(`/tasks/${taskId}/move`, { phaseId, status });
      return data;
    },
    onSuccess: (task) => {
      if (task.projectId) {
        qc.invalidateQueries({ queryKey: ['tasks', { projectId: task.projectId }] });
      }
    },
  });
}
