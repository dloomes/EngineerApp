// HTTP wrapper around the Azure Function proxy.
// When VITE_USE_MOCK=true, the per-resource modules (jobs.ts, sites.ts, etc.)
// short-circuit to fixtures and never reach apiFetch.

import { getAccessToken } from '@/auth/getToken';

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`API error ${status}: ${body}`);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!BASE_URL) {
    throw new Error(
      'VITE_API_BASE_URL is not set. Set it in apps/installation/.env.local or enable VITE_USE_MOCK=true.',
    );
  }

  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach the signed-in user's access token (no-op when auth is disabled).
  const token = await getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    throw new ApiError(res.status, await res.text());
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
