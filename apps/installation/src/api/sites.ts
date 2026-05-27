import type { DynamicsAccountSite } from '@involve/shared';
import { USE_MOCK, apiFetch } from './client';
import { mockSites } from './mock/sites';

export async function getSites(accountId: string): Promise<DynamicsAccountSite[]> {
  if (USE_MOCK) {
    return mockSites
      .filter((s) => s._involve_associatedaccount_value === accountId)
      .slice()
      .sort((a, b) => a.involve_name.localeCompare(b.involve_name));
  }
  return apiFetch<DynamicsAccountSite[]>(
    `/accounts/${encodeURIComponent(accountId)}/sites`,
  );
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
