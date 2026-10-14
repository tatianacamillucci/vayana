// src/lib/hooks/useNotifications.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { toast } from '@/lib/toast';

export interface Notification {
  id: string;
  type: 'TASK_ASSIGNED';
  title: string;
  body?: string | null;
  taskId?: string | null;
  projectId?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  data: Notification[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// GET /notifications — paginated list
export function useNotifications(params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}) {
  return useQuery({
    queryKey: ['notifications', params ?? {}],
    queryFn: async () => {
      const { data } = await apiClient.get<NotificationsResponse>('/notifications', { params });
      return data;
    },
    refetchInterval: 30_000,
  });
}

// GET /notifications/unread-count — lightweight, polled every 30s
export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ unread: number }>('/notifications/unread-count');
      return data.unread;
    },
    refetchInterval: 30_000,
  });
}

// PATCH /notifications/:id/read
export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// POST /notifications/read-all
export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/notifications/read-all');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Tutte le notifiche segnate come lette');
    },
    onError: () => toast.error('Errore nel segnare le notifiche'),
  });
}
