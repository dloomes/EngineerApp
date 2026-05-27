// IndexedDB-backed queue for asset saves made while offline (SPEC §13).
//
// When a save can't reach the proxy (no signal), the CreateAssetInput is parked
// here and replayed via createAsset() when connectivity returns — on the
// `online` event and on app start (see main.tsx). We don't use the Background
// Sync API because iOS Safari doesn't support it; replaying in-app while the
// PWA is open covers the field use case.

import { type CreateAssetInput, createAsset } from '@/api/assets';
import { ApiError } from '@/api/client';

const DB_NAME = 'engineering-offline';
const STORE = 'asset-queue';
const DB_VERSION = 1;

interface QueuedAsset {
  id: string;
  input: CreateAssetInput;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// --- change notification so the UI can reflect the pending count live --------
const listeners = new Set<() => void>();

export function subscribeQueue(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function notify(): void {
  for (const fn of listeners) fn();
}

// --- CRUD --------------------------------------------------------------------
export async function enqueueAsset(input: CreateAssetInput): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add({
      id: crypto.randomUUID(),
      input,
      createdAt: Date.now(),
    } satisfies QueuedAsset);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  notify();
  // If we happen to be online (e.g. a one-off failed request, not a full
  // outage), try to drain immediately.
  if (navigator.onLine) void flushQueue();
}

export async function getQueuedCount(): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAll(): Promise<QueuedAsset[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedAsset[]);
    req.onerror = () => reject(req.error);
  });
}

async function remove(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- replay ------------------------------------------------------------------
let flushing = false;

// Replays queued saves oldest-first. Stops on the first network error (still
// offline) so the remaining items wait for the next attempt. A server-side
// rejection (ApiError) can't be fixed by retrying, so that item is dropped to
// avoid blocking the queue forever.
export async function flushQueue(): Promise<void> {
  if (flushing || !navigator.onLine) return;
  flushing = true;
  try {
    const items = (await getAll()).sort((a, b) => a.createdAt - b.createdAt);
    for (const item of items) {
      try {
        await createAsset(item.input);
        await remove(item.id);
        notify();
      } catch (err) {
        if (err instanceof ApiError) {
          await remove(item.id);
          notify();
        } else {
          break; // network error — leave the rest queued for next time
        }
      }
    }
  } finally {
    flushing = false;
  }
}
