// src/lib/api/client.ts
import axios from 'axios';
import { applyInterceptors } from './interceptors';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // Required: sends HTTP-only refresh_token cookie on every request
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Wire up auth token attachment + 401→refresh retry logic
applyInterceptors(apiClient);
