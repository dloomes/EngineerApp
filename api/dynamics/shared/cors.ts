import { getEnv } from './env';

let cachedAllowlist: string[] | null = null;

function getAllowedOrigins(): string[] {
  if (cachedAllowlist) return cachedAllowlist;
  cachedAllowlist = getEnv()
    .ALLOWED_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return cachedAllowlist;
}

export function buildCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };

  if (origin && getAllowedOrigins().includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

export function __resetCorsCacheForTests(): void {
  cachedAllowlist = null;
}
