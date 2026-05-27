// Last-10 recent jobs, persisted to localStorage. SPEC §7 Screen 1.
// Stored value: opportunity name (we don't have the customer name without an
// extra Dynamics fetch — see step 5 notes for the upgrade path).

const STORAGE_KEY = 'installation:recentJobs';
const MAX_RECENT = 10;

export interface RecentJob {
  reference: string;
  name: string;
  viewedAt: number;
}

function isRecentJob(v: unknown): v is RecentJob {
  if (typeof v !== 'object' || v === null) return false;
  const j = v as Record<string, unknown>;
  return (
    typeof j.reference === 'string' &&
    typeof j.name === 'string' &&
    typeof j.viewedAt === 'number'
  );
}

export function getRecentJobs(): RecentJob[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentJob);
  } catch {
    return [];
  }
}

export function recordRecentJob(reference: string, name: string): RecentJob[] {
  const next: RecentJob[] = [
    { reference, name, viewedAt: Date.now() },
    ...getRecentJobs().filter((j) => j.reference !== reference),
  ].slice(0, MAX_RECENT);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or unavailable — the recent list is a nicety, not core.
  }
  return next;
}
