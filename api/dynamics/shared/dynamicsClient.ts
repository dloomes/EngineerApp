import { getEnv } from './env';

interface TokenCache {
  token: string;
  expiresAt: number;
}

let cachedToken: TokenCache | null = null;

// Refresh 60s before expiry so in-flight requests never carry an expired token.
const REFRESH_BUFFER_MS = 60_000;

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

async function fetchToken(): Promise<TokenCache> {
  const env = getEnv();
  const url = `https://login.microsoftonline.com/${env.TENANT_ID}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env.CLIENT_ID,
    client_secret: env.CLIENT_SECRET,
    scope: `${env.DYNAMICS_URL}/.default`,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token fetch failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as TokenResponse;
  return {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
}

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - REFRESH_BUFFER_MS) {
    return cachedToken.token;
  }
  cachedToken = await fetchToken();
  return cachedToken.token;
}

// Test-only — clears the in-memory token cache between unit tests.
export function __resetTokenCacheForTests(): void {
  cachedToken = null;
}

export class DynamicsError extends Error {
  constructor(
    public readonly status: number,
    public readonly details: string,
  ) {
    super(`Dynamics API ${status}: ${details}`);
    this.name = 'DynamicsError';
  }
}

export interface DynamicsRequestInit {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  // POST/PATCH return 204 by default. Set true to receive the created/updated entity back.
  preferRepresentation?: boolean;
}

export async function dynamicsFetch<T = unknown>(
  path: string,
  init: DynamicsRequestInit = {},
): Promise<T> {
  const env = getEnv();
  const token = await getToken();
  const url = `${env.DYNAMICS_URL}/api/data/v9.2/${path.replace(/^\//, '')}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0',
  };

  if (init.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (init.preferRepresentation) {
    headers['Prefer'] = 'return=representation';
  }

  const res = await fetch(url, {
    method: init.method ?? 'GET',
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new DynamicsError(res.status, text);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

// OData escapes single quotes by doubling them.
export function odataEscape(value: string): string {
  return value.replace(/'/g, "''");
}
