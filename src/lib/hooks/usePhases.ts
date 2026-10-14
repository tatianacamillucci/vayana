// src/lib/hooks/usePhases.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface Phase {
  id: string;
  name: string;
  description?: string | null;
  position: number;
  projectId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreatePhaseDto {
  name: string;
  description?: string;
}

export interface UpdatePhaseDto {
  name?: string;
  description?: string;
}

// GET /projects/:projectId/phases
export function usePhases(projectId: string | undefined) {
  return useQuery({
    queryKey: ['phases', { projectId }],
    queryFn: async () => {
      const { data } = await apiClient.get<Phase[]>(`/projects/${projectId}/phases`);
      return data;
    },
    enabled: !!projectId,
  });
}

// POST /projects/:projectId/phases
export function useCreatePhase(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreatePhaseDto) => {
      const { data } = await apiClient.post<Phase>(`/projects/${projectId}/phases`, dto);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['phases', { projectId }] }),
  });
}

// PATCH /phases/:id
export function useUpdatePhase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId, dto }: { id: string; projectId: string; dto: UpdatePhaseDto }) => {
      const { data } = await apiClient.patch<Phase>(`/phases/${id}`, dto);
      return { data, projectId };
    },
    onSuccess: ({ projectId }) => qc.invalidateQueries({ queryKey: ['phases', { projectId }] }),
  });
}

// DELETE /phases/:id
export function useDeletePhase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      await apiClient.delete(`/phases/${id}`);
      return { projectId };
    },
    onSuccess: ({ projectId }) => qc.invalidateQueries({ queryKey: ['phases', { projectId }] }),
  });
}
