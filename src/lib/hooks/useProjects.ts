// src/lib/hooks/useProjects.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  status: string;
  organizationId: string;
  teamId?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectDto {
  name: string;
  description?: string;
  color?: string;
  teamId?: string;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  color?: string;
  status?: string;
}

// GET /projects
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Project[]; total: number }>('/projects');
      return data.data ?? data;
    },
  });
}

// GET /projects/:id
export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const { data } = await apiClient.get<Project>(`/projects/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

// POST /projects
export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateProjectDto) => {
      const { data } = await apiClient.post<Project>('/projects', dto);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

// PATCH /projects/:id
export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateProjectDto }) => {
      const { data } = await apiClient.patch<Project>(`/projects/${id}`, dto);
      return data;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['projects', id] });
    },
  });
}

// DELETE /projects/:id
export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/projects/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}
