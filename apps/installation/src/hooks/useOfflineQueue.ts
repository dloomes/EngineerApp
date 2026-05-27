import { useEffect, useState } from 'react';
import { flushQueue, getQueuedCount, subscribeQueue } from '@/lib/offlineQueue';

interface OfflineQueueState {
  // Number of asset saves waiting to sync.
  pendingCount: number;
  // Force a replay attempt (e.g. a "Sync now" button).
  flush: () => Promise<void>;
}

// Exposes the live count of queued asset saves and a manual flush trigger.
// Re-renders whenever the queue changes (enqueue or successful sync).
export function useOfflineQueue(): OfflineQueueState {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let active = true;
    const refresh = (): void => {
      void getQueuedCount().then((n) => {
        if (active) setPendingCount(n);
      });
    };
    refresh();
    const unsubscribe = subscribeQueue(refresh);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return { pendingCount, flush: flushQueue };
}
