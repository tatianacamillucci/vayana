// src/lib/hooks/useTeams.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface TeamMember {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface Team {
  id: string;
  name: string;
  description?: string | null;
  organizationId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  members?: TeamMember[];
}

export interface CreateTeamDto {
  name: string;
  description?: string;
}

export interface UpdateTeamDto {
  name?: string;
  description?: string;
}

// GET /teams
export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Team[]; total: number } | Team[]>('/teams');
      return Array.isArray(data) ? data : (data.data ?? []);
    },
  });
}

// GET /teams/:id
export function useTeam(id: string | undefined) {
  return useQuery({
    queryKey: ['teams', id],
    queryFn: async () => {
      const { data } = await apiClient.get<Team>(`/teams/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

// GET /teams/:teamId/members
export function useTeamMembers(teamId: string | undefined) {
  return useQuery({
    queryKey: ['teams', teamId, 'members'],
    queryFn: async () => {
      const { data } = await apiClient.get<TeamMember[]>(`/teams/${teamId}/members`);
      return data;
    },
    enabled: !!teamId,
  });
}

// POST /teams
export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateTeamDto) => {
      const { data } = await apiClient.post<Team>('/teams', dto);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  });
}

// PATCH /teams/:id
export function useUpdateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateTeamDto }) => {
      const { data } = await apiClient.patch<Team>(`/teams/${id}`, dto);
      return data;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['teams'] });
      qc.invalidateQueries({ queryKey: ['teams', id] });
    },
  });
}

// DELETE /teams/:id
export function useDeleteTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/teams/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  });
}
