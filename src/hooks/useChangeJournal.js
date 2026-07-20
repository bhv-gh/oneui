import { useState, useEffect, useRef, useCallback } from 'react';
import { saveCache, loadCache, enqueuePendingOp } from '../utils/offlineStorage';
import { createDefaultJournal, normalizeJournal, mergeChangeJournal } from '../utils/changeJournal';
import * as api from '../api/client';

const CACHE_KEY = 'change-journal';
const SAVE_DEBOUNCE_MS = 1000;

// Offline-first store for the Change Journal, mirroring useMemoryData/useTreeData:
// hydrate from localStorage instantly, fetch + merge from Supabase, and push
// changes back with a debounced upsert (queued for replay if the write fails).
export function useChangeJournal() {
  const [journal, setJournal] = useState(() => {
    const cached = loadCache(CACHE_KEY);
    return cached ? normalizeJournal(cached) : createDefaultJournal();
  });
  const saveTimer = useRef(null);

  // Persist to localStorage on every change (skip the very first render).
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    saveCache(CACHE_KEY, journal);
  }, [journal]);

  // Initial fetch — merge remote into local so offline edits are never lost.
  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const row = await api.getChangeJournal();
        if (aborted || !row || !row.data) return;
        setJournal(prev => {
          const merged = mergeChangeJournal(prev, normalizeJournal(row.data));
          saveCache(CACHE_KEY, merged);
          return merged;
        });
      } catch (err) {
        console.error('Failed to init change journal:', err);
        // Supabase unreachable — keep cached data (already loaded).
      }
    })();
    return () => { aborted = true; };
  }, []);

  const persist = useCallback((data) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      api.putChangeJournal(data).catch(err => {
        console.error('putChangeJournal failed:', err);
        enqueuePendingOp({ type: 'putChangeJournal', payload: data });
      });
    }, SAVE_DEBOUNCE_MS);
  }, []);

  // Optimistic update: stamp updatedAt, update state + cache, debounce the write.
  const updateJournal = useCallback((updaterOrValue) => {
    setJournal(prev => {
      const base = typeof updaterOrValue === 'function' ? updaterOrValue(prev) : updaterOrValue;
      const next = { ...base, updatedAt: new Date().toISOString() };
      persist(next);
      return next;
    });
  }, [persist]);

  // Pull remote, merge, and push the reconciled result back.
  const forceSync = useCallback(async () => {
    try {
      const row = await api.getChangeJournal();
      const remote = row && row.data ? normalizeJournal(row.data) : null;
      setJournal(prev => {
        const merged = remote ? mergeChangeJournal(prev, remote) : prev;
        api.putChangeJournal(merged).catch(err => {
          console.error('putChangeJournal (forceSync) failed:', err);
          enqueuePendingOp({ type: 'putChangeJournal', payload: merged });
        });
        saveCache(CACHE_KEY, merged);
        return merged;
      });
    } catch (err) {
      console.error('Change journal force sync failed:', err);
    }
  }, []);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  return { journal, updateJournal, forceSync };
}
