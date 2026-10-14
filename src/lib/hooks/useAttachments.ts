// src/lib/hooks/useAttachments.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface Attachment {
  id: string;
  taskId: string;
  filename: string;
  originalName?: string;
  mimeType: string;
  size: number;
  uploadedById?: string;
  organizationId?: string;
  createdAt: string;
}

function getApiBaseUrl(): string {
  const base = apiClient.defaults.baseURL ?? '';
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

export function getAttachmentDownloadUrl(taskId: string, attachmentId: string): string {
  const base = getApiBaseUrl();
  return `${base}/tasks/${taskId}/attachments/${attachmentId}/download`;
}

export function useTaskAttachments(taskId: string | undefined) {
  return useQuery({
    queryKey: ['attachments', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data } = await apiClient.get<Attachment[]>(`/tasks/${taskId}/attachments`);
      return data;
    },
    enabled: !!taskId,
  });
}

export function useUploadAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, file }: { taskId: string; file: File }) => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await apiClient.post<Attachment>(`/tasks/${taskId}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (_attachment, variables) => {
      qc.invalidateQueries({ queryKey: ['attachments', variables.taskId] });
    },
  });
}

export function useDeleteAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, attachmentId }: { taskId: string; attachmentId: string }) => {
      await apiClient.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['attachments', variables.taskId] });
    },
  });
}
