import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { flushQueue } from './lib/offlineQueue';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Service worker registration (app-shell caching — see public/sw.js).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Service worker registration failed:', err);
    });
  });
}

// Replay any asset saves queued while offline — on reconnect and on app start.
// (iOS Safari has no Background Sync API, so we drain the queue in-app.)
window.addEventListener('online', () => {
  void flushQueue();
});
if (navigator.onLine) {
  void flushQueue();
}
