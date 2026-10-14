// src/lib/api/auth.ts
// NOTE: The backend uses HTTP-only cookies exclusively — no tokens in response body.
// login/register/refresh set cookies server-side; the browser sends them automatically
// on every request thanks to withCredentials: true on the axios client.
import { apiClient } from './client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId?: string;
}

export interface MessageResponse {
  message: string;
}

// POST /auth/login — backend sets HTTP-only cookies on success
export async function login(payload: LoginPayload): Promise<MessageResponse> {
  const { data } = await apiClient.post<MessageResponse>('/auth/login', payload);
  return data;
}

// POST /auth/register — creates user + organization, sets cookies
export async function register(payload: RegisterPayload): Promise<MessageResponse> {
  const { data } = await apiClient.post<MessageResponse>('/auth/register', payload);
  return data;
}

// POST /auth/refresh — rotates refresh token cookie; interceptor calls this automatically on 401
export async function refreshToken(): Promise<MessageResponse> {
  const { data } = await apiClient.post<MessageResponse>('/auth/refresh');
  return data;
}

// POST /auth/logout — clears HTTP-only cookies server-side
export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

// GET /users/me — returns currently authenticated user profile
export async function getMe(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>('/users/me');
  return data;
}
