// Local persistence for focus-camera timelapse clips.
//
// Video blobs are far too large for localStorage, so clips are kept in
// IndexedDB. Each record stores the webm blob plus lightweight metadata. Clips
// never leave the device; "export" is just a download of the stored blob.

const DB_NAME = 'oneui-focus-clips';
const STORE = 'clips';
const DB_VERSION = 1;

let dbPromise = null;

// Tiny pub/sub so every mounted useClips() stays in sync when clips are
// added or removed from anywhere in the app.
const listeners = new Set();
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore listener errors */
    }
  });
}

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'id' });
        os.createIndex('createdAt', 'createdAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(mode) {
  return openDB().then((db) => db.transaction(STORE, mode).objectStore(STORE));
}

// Save a clip. `meta` = { blob, frames, secs, bytes }. Returns the full record.
export async function saveClip(meta) {
  const id =
    (window.crypto && window.crypto.randomUUID && window.crypto.randomUUID()) ||
    `clip-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const record = {
    id,
    createdAt: Date.now(),
    blob: meta.blob,
    frames: meta.frames,
    secs: meta.secs,
    bytes: meta.bytes,
    taskText: meta.taskText || null,
    focusPct: meta.focusPct ?? null,
    durationMs: meta.durationMs ?? null,
  };
  const store = await tx('readwrite');
  await new Promise((res, rej) => {
    const r = store.put(record);
    r.onsuccess = res;
    r.onerror = () => rej(r.error);
  });
  notify();
  return record;
}

// List all clips, newest first (includes the stored blobs).
export async function listClips() {
  const store = await tx('readonly');
  return new Promise((res, rej) => {
    const r = store.getAll();
    r.onsuccess = () => {
      const rows = r.result || [];
      rows.sort((a, b) => b.createdAt - a.createdAt);
      res(rows);
    };
    r.onerror = () => rej(r.error);
  });
}

export async function deleteClip(id) {
  const store = await tx('readwrite');
  await new Promise((res, rej) => {
    const r = store.delete(id);
    r.onsuccess = res;
    r.onerror = () => rej(r.error);
  });
  notify();
}
