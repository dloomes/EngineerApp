import type { DynamicsFunctionalLocation } from '@involve/shared';
import { ApiError, USE_MOCK, apiFetch } from './client';
import { cacheGet, cacheSet } from '@/lib/apiCache';
import { mockRooms } from './mock/rooms';

export async function getRooms(
  siteId: string,
): Promise<DynamicsFunctionalLocation[]> {
  if (USE_MOCK) {
    return mockRooms
      .filter((r) => r._new_associatedsite_value === siteId)
      .slice()
      .sort((a, b) => a.msdyn_name.localeCompare(b.msdyn_name));
  }
  // Cache-through with offline fallback (see getSites for the rationale).
  const cacheKey = `rooms:${siteId}`;
  try {
    const data = await apiFetch<DynamicsFunctionalLocation[]>(
      `/sites/${encodeURIComponent(siteId)}/rooms`,
    );
    cacheSet(cacheKey, data);
    return data;
  } catch (err) {
    if (!(err instanceof ApiError)) {
      const cached = cacheGet<DynamicsFunctionalLocation[]>(cacheKey);
      if (cached) return cached;
    }
    throw err;
  }
}

export async function createRoom(
  siteId: string,
  name: string,
  accountId: string,
): Promise<DynamicsFunctionalLocation> {
  if (USE_MOCK) {
    const created: DynamicsFunctionalLocation = {
      msdyn_functionallocationid: crypto.randomUUID(),
      msdyn_name: name,
      _new_associatedsite_value: siteId,
    };
    mockRooms.push(created);
    return created;
  }
  return apiFetch<DynamicsFunctionalLocation>('/rooms', {
    method: 'POST',
    body: JSON.stringify({ siteId, name, accountId }),
  });
}

export async function updateRoom(roomId: string, name: string): Promise<void> {
  if (USE_MOCK) {
    const room = mockRooms.find((r) => r.msdyn_functionallocationid === roomId);
    if (room) room.msdyn_name = name;
    return;
  }
  await apiFetch<void>(`/rooms/${encodeURIComponent(roomId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}
