import { getRooms } from '@/api/rooms';
import { getSites } from '@/api/sites';

// Warm the offline cache for a job's location data while we still have signal.
// Called right after a job is looked up so that, by the time the engineer is
// inside the building (likely offline), the site + room lists are already
// cached and the location step works without a connection.
//
// Fire-and-forget and best-effort: getSites/getRooms write through to the
// cache on success, and any failure here is swallowed.
export async function prefetchLocationData(accountId: string): Promise<void> {
  if (!navigator.onLine) return;
  try {
    const sites = await getSites(accountId);
    // Rooms per site — small lists, handful of sites per account.
    await Promise.all(
      sites.map((s) =>
        getRooms(s.involve_accountsiteid).catch(() => undefined),
      ),
    );
  } catch {
    // best-effort cache warming
  }
}
