import { WarningBanner } from '@involve/ui';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

// App-wide connectivity strip. Hidden when online with nothing queued.
// Surfaces two states an engineer cares about in the field:
//   - offline: saves will be queued
//   - back online with a backlog: saves are syncing
export function OfflineBanner(): JSX.Element | null {
  const online = useOnlineStatus();
  const { pendingCount } = useOfflineQueue();

  if (online && pendingCount === 0) return null;

  const assets = `${pendingCount} ${pendingCount === 1 ? 'asset' : 'assets'}`;

  return (
    <WarningBanner>
      {!online ? (
        pendingCount > 0 ? (
          <>
            You're offline — {assets} saved here will sync automatically when
            you reconnect.
          </>
        ) : (
          <>
            You're offline. You can keep saving assets; they'll queue and sync
            when you're back online.
          </>
        )
      ) : (
        <>Back online — syncing {assets}…</>
      )}
    </WarningBanner>
  );
}
