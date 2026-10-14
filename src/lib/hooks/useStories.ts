// src/lib/hooks/useStories.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface Story {
  id: string;
  type: 'comment' | 'activity';
  content: string;
  taskId: string;
  authorId: string;
  author?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateStoryDto {
  content: string;
  type?: 'comment' | 'activity';
}

// GET /tasks/:taskId/stories
export function useStories(taskId: string | undefined) {
  return useQuery({
    queryKey: ['stories', { taskId }],
    queryFn: async () => {
      const { data } = await apiClient.get<Story[]>(`/tasks/${taskId}/stories`);
      return data;
    },
    enabled: !!taskId,
  });
}

// POST /tasks/:taskId/stories
export function useCreateStory(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateStoryDto) => {
      const { data } = await apiClient.post<Story>(`/tasks/${taskId}/stories`, dto);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stories', { taskId }] }),
  });
}

// PATCH /stories/:id
export function useUpdateStory(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { data } = await apiClient.patch<Story>(`/stories/${id}`, { content });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stories', { taskId }] }),
  });
}

// DELETE /stories/:id
export function useDeleteStory(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/stories/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stories', { taskId }] }),
  });
}
