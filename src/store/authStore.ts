// src/store/authStore.ts
// The backend uses HTTP-only cookies for auth — no token storage needed on the frontend.
// These functions are kept as no-ops for API compatibility.
// The browser manages the access_token and refresh_token cookies automatically.

export function getAccessToken(): string | null {
  return null; // Token is in HTTP-only cookie, not accessible from JS
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function setAccessToken(_token: string | null): void {
  // No-op: token is managed by HTTP-only cookie
}

export function clearAccessToken(): void {
  // No-op: cookie is cleared by POST /auth/logout
}
