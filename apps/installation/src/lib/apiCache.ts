// Small localStorage cache for read-only lookups (sites, rooms) so the
// location step keeps working offline once the data has been fetched at least
// once online. Payloads are tiny JSON arrays, so localStorage is plenty.
//
// Pair with withCache() in the api modules: it writes through on success and
// falls back to the cached copy on a network failure (offline).

const PREFIX = 'engineering:cache:';

export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function cacheSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Quota/private-mode — fine, we just won't have an offline copy.
  }
}
