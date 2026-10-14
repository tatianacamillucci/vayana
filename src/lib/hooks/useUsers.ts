// src/lib/hooks/useUsers.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { AuthUser } from '@/lib/api/auth';

export interface UserSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

// GET /users/me
export function useCurrentUser() {
  return useQuery({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      const { data } = await apiClient.get<AuthUser>('/users/me');
      return data;
    },
  });
}

// GET /users/search?q=...
export function useUserSearch(query: string) {
  return useQuery({
    queryKey: ['users', 'search', query],
    queryFn: async () => {
      const { data } = await apiClient.get<UserSearchResult[]>('/users/search', {
        params: { q: query },
      });
      return data;
    },
    enabled: query.length >= 2,
  });
}
