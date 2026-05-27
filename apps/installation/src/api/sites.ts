import type { DynamicsAccountSite } from '@involve/shared';
import { ApiError, USE_MOCK, apiFetch } from './client';
import { cacheGet, cacheSet } from '@/lib/apiCache';
import { mockSites } from './mock/sites';

export async function getSites(accountId: string): Promise<DynamicsAccountSite[]> {
  if (USE_MOCK) {
    return mockSites
      .filter((s) => s._involve_associatedaccount_value === accountId)
      .slice()
      .sort((a, b) => a.involve_name.localeCompare(b.involve_name));
  }
  // Cache-through with offline fallback so the location step works without
  // signal once the sites have loaded at least once.
  const cacheKey = `sites:${accountId}`;
  try {
    const data = await apiFetch<DynamicsAccountSite[]>(
      `/accounts/${encodeURIComponent(accountId)}/sites`,
    );
    cacheSet(cacheKey, data);
    return data;
  } catch (err) {
    // A network failure (offline) isn't an ApiError — serve the cached copy.
    // A genuine server error (ApiError) should surface, not be masked by stale data.
    if (!(err instanceof ApiError)) {
      const cached = cacheGet<DynamicsAccountSite[]>(cacheKey);
      if (cached) return cached;
    }
    throw err;
  }
}

export async function createSite(
  accountId: string,
  name: string,
): Promise<DynamicsAccountSite> {
  if (USE_MOCK) {
    const created: DynamicsAccountSite = {
      involve_accountsiteid: crypto.randomUUID(),
      involve_name: name,
      _involve_associatedaccount_value: accountId,
    };
    mockSites.push(created);
    return created;
  }
  return apiFetch<DynamicsAccountSite>('/sites', {
    method: 'POST',
    body: JSON.stringify({ accountId, name }),
  });
}

export async function updateSite(siteId: string, name: string): Promise<void> {
  if (USE_MOCK) {
    const site = mockSites.find((s) => s.involve_accountsiteid === siteId);
    if (site) site.involve_name = name;
    return;
  }
  await apiFetch<void>(`/sites/${encodeURIComponent(siteId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}
