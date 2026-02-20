import { useState, useEffect, useRef } from 'react';
import * as api from '../api/client';

const MIGRATED_FLAG = 'flowMigratedToSupabase';

export function useMemoryData() {
  const [memoryData, setMemoryData] = useState({ notes: [], qas: [] });
  const isInitialLoad = useRef(true);

  useEffect(() => {
    const init = async () => {
      try {
        const migrated = localStorage.getItem(MIGRATED_FLAG);

        if (!migrated) {
          // First time: migrate localStorage memory to Supabase
          const localJSON = localStorage.getItem('flowAppMemoryV1');
          const localData = localJSON ? JSON.parse(localJSON) : { notes: [], qas: [] };

          for (const note of (localData.notes || [])) {
            await api.createNote(note).catch(() => {});
          }
          for (const qa of (localData.qas || [])) {
            await api.createQA(qa).catch(() => {});
          }

          setMemoryData(localData);
          localStorage.removeItem('flowAppMemoryV1');
        } else {
          // Already migrated: load from Supabase only
          const [notes, qas] = await Promise.all([api.getNotes(), api.getQAs()]);
          setMemoryData({
            notes: notes || [],
            qas: qas || [],
          });
        }
      } catch (err) {
        console.error('Failed to init memory:', err);
        try {
          const fallback = localStorage.getItem('flowAppMemoryV1');
          if (fallback) setMemoryData(JSON.parse(fallback));
        } catch {}
      } finally {
        isInitialLoad.current = false;
      }
    };
    init();
  }, []);

  // Wrapped setMemoryData that syncs changes to Supabase
  const setMemoryDataWithSync = (updaterOrValue) => {
    setMemoryData(prev => {
      const newData = typeof updaterOrValue === 'function'
        ? updaterOrValue(prev)
        : { ...prev, ...updaterOrValue };

      // Sync notes changes
      if (newData.notes !== undefined) {
        const prevNoteIds = new Set(prev.notes.map(n => n.id));
        const newNoteIds = new Set(newData.notes.map(n => n.id));

        for (const id of prevNoteIds) {
          if (!newNoteIds.has(id)) {
            api.deleteNote(id).catch(console.error);
          }
        }

        for (const note of newData.notes) {
          if (!prevNoteIds.has(note.id)) {
            api.createNote(note).catch(console.error);
          } else {
            const prevNote = prev.notes.find(n => n.id === note.id);
            if (prevNote && prevNote.text !== note.text) {
              api.updateNote(note.id, note.text).catch(console.error);
            }
          }
        }
      }

      // Sync QA changes
      if (newData.qas !== undefined) {
        const prevQAIds = new Set(prev.qas.map(q => q.id));
        const newQAIds = new Set(newData.qas.map(q => q.id));

        for (const id of prevQAIds) {
          if (!newQAIds.has(id)) {
            api.deleteQA(id).catch(console.error);
          }
        }

        for (const qa of newData.qas) {
          if (!prevQAIds.has(qa.id)) {
            api.createQA(qa).catch(console.error);
          } else {
            const prevQA = prev.qas.find(q => q.id === qa.id);
            if (prevQA && (prevQA.question !== qa.question || prevQA.answer !== qa.answer)) {
              api.updateQA(qa.id, { question: qa.question, answer: qa.answer }).catch(console.error);
            }
          }
        }
      }

      return newData;
    });
  };

  const forceSync = async () => {
    try {
      const [notes, qas] = await Promise.all([api.getNotes(), api.getQAs()]);
      // Use raw setter to avoid triggering diff-based sync
      setMemoryData({
        notes: notes || [],
        qas: qas || [],
      });
    } catch (err) {
      console.error('Memory force sync failed:', err);
    }
  };

  return { memoryData, setMemoryData: setMemoryDataWithSync, forceSync };
}
