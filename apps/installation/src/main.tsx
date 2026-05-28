import React from 'react';
import ReactDOM from 'react-dom/client';
import { MsalProvider } from '@azure/msal-react';
import { App } from './App';
import { authEnabled, msalInstance } from './auth/msalConfig';
import { flushQueue } from './lib/offlineQueue';
import './index.css';

async function bootstrap(): Promise<void> {
  // Initialise MSAL before render and pick up any redirect sign-in result.
  if (authEnabled && msalInstance) {
    await msalInstance.initialize();
    const result = await msalInstance.handleRedirectPromise();
    if (result?.account) {
      msalInstance.setActiveAccount(result.account);
    } else {
      const [first] = msalInstance.getAllAccounts();
      if (first) msalInstance.setActiveAccount(first);
    }
  }

  const tree =
    authEnabled && msalInstance ? (
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    ) : (
      <App />
    );

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>{tree}</React.StrictMode>,
  );
}

void bootstrap();

// Service worker registration (app-shell caching — see public/sw.js).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Service worker registration failed:', err);
    });
  });
}

// Warm the lazily-loaded scanner chunk (the ~400KB barcode library) so the
// camera scanner works offline. Best-effort: online it downloads + the SW
// caches it; offline it loads from the SW cache if already fetched. Either way
// the module lands in memory so AssetDetails' lazy import resolves instantly.
// We wait for the SW to be active so the fetch actually goes through the cache.
function warmScannerChunk(): void {
  void import('@involve/ui/scanner').catch(() => {
    // Offline with no cached copy — the scanner just won't open; not fatal.
  });
}
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(warmScannerChunk).catch(warmScannerChunk);
} else {
  warmScannerChunk();
}

// Replay any asset saves queued while offline — on reconnect and on app start.
// (iOS Safari has no Background Sync API, so we drain the queue in-app.)
window.addEventListener('online', () => {
  void flushQueue();
});
if (navigator.onLine) {
  void flushQueue();
}
