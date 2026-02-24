import { useState, useEffect, useRef } from 'react';
import { saveCache, loadCache, enqueuePendingOp } from '../utils/offlineStorage';
import * as api from '../api/client';

const CACHE_KEY = 'memory';

export function useMemoryData() {
  const [memoryData, setMemoryData] = useState(() => {
    const cached = loadCache(CACHE_KEY);
    if (cached && typeof cached === 'object') {
      return {
        notes: Array.isArray(cached.notes) ? cached.notes : [],
        qas: Array.isArray(cached.qas) ? cached.qas : [],
      };
    }
    return { notes: [], qas: [] };
  });
  const isInitialLoad = useRef(true);

  // Persist to localStorage on every memoryData change (except initial)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    saveCache(CACHE_KEY, memoryData);
  }, [memoryData]);

  useEffect(() => {
    const init = async () => {
      try {
        const [notes, qas] = await Promise.all([api.getNotes(), api.getQAs()]);
        const fresh = {
          notes: notes || [],
          qas: qas || [],
        };
        setMemoryData(fresh);
        saveCache(CACHE_KEY, fresh);
      } catch (err) {
        console.error('Failed to init memory:', err);
        // Supabase unreachable — keep cached data (already loaded)
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
            api.deleteNote(id).catch(err => {
              console.error('deleteNote failed:', err);
              enqueuePendingOp({ type: 'deleteNote', payload: { id } });
            });
          }
        }

        for (const note of newData.notes) {
          if (!prevNoteIds.has(note.id)) {
            api.createNote(note).catch(err => {
              console.error('createNote failed:', err);
              enqueuePendingOp({ type: 'createNote', payload: note });
            });
          } else {
            const prevNote = prev.notes.find(n => n.id === note.id);
            if (prevNote && prevNote.text !== note.text) {
              api.updateNote(note.id, note.text).catch(err => {
                console.error('updateNote failed:', err);
                enqueuePendingOp({ type: 'updateNote', payload: { id: note.id, text: note.text } });
              });
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
            api.deleteQA(id).catch(err => {
              console.error('deleteQA failed:', err);
              enqueuePendingOp({ type: 'deleteQA', payload: { id } });
            });
          }
        }

        for (const qa of newData.qas) {
          if (!prevQAIds.has(qa.id)) {
            api.createQA(qa).catch(err => {
              console.error('createQA failed:', err);
              enqueuePendingOp({ type: 'createQA', payload: qa });
            });
          } else {
            const prevQA = prev.qas.find(q => q.id === qa.id);
            if (prevQA && (prevQA.question !== qa.question || prevQA.answer !== qa.answer || prevQA.taskId !== qa.taskId || prevQA.taskLabel !== qa.taskLabel)) {
              const updates = { question: qa.question, answer: qa.answer, taskId: qa.taskId, taskLabel: qa.taskLabel };
              api.updateQA(qa.id, updates).catch(err => {
                console.error('updateQA failed:', err);
                enqueuePendingOp({ type: 'updateQA', payload: { id: qa.id, updates } });
              });
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
      const fresh = {
        notes: notes || [],
        qas: qas || [],
      };
      // Use raw setter to avoid triggering diff-based sync
      setMemoryData(fresh);
      saveCache(CACHE_KEY, fresh);
    } catch (err) {
      console.error('Memory force sync failed:', err);
    }
  };

  return { memoryData, setMemoryData: setMemoryDataWithSync, forceSync };
}
