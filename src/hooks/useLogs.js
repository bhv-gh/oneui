import { useState, useEffect, useRef } from 'react';
import { generateId } from '../utils/idGenerator';
import { saveCache, loadCache, enqueuePendingOp } from '../utils/offlineStorage';
import * as api from '../api/client';

const CACHE_KEY = 'logs';

export function useLogs() {
  const [logs, setLogs] = useState(() => {
    const cached = loadCache(CACHE_KEY);
    if (Array.isArray(cached)) {
      return cached.map(log => ({
        ...log,
        startTime: new Date(log.startTime),
        endTime: new Date(log.endTime),
      }));
    }
    return [];
  });
  const isInitialLoad = useRef(true);

  // Persist to localStorage on every logs change (except initial)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    saveCache(CACHE_KEY, logs);
  }, [logs]);

  useEffect(() => {
    const init = async () => {
      try {
        const data = await api.getLogs();
        if (data) {
          const parsed = data.map(log => ({
            ...log,
            startTime: new Date(log.startTime),
            endTime: new Date(log.endTime),
          }));
          setLogs(parsed);
          saveCache(CACHE_KEY, parsed);
        }
      } catch (err) {
        console.error('Failed to init logs:', err);
        // Supabase unreachable — keep cached data (already loaded)
      } finally {
        isInitialLoad.current = false;
      }
    };
    init();
  }, []);

  const handleSaveLog = (logData) => {
    if (logData.id) {
      setLogs(prevLogs => prevLogs.map(log => log.id === logData.id ? { ...log, taskText: logData.text } : log));
      api.updateLog(logData.id, { taskText: logData.text }).catch(err => {
        console.error('updateLog failed:', err);
        enqueuePendingOp({ type: 'updateLog', payload: { id: logData.id, updates: { taskText: logData.text } } });
      });
    } else {
      const newLog = {
        id: generateId(),
        taskId: null,
        taskText: logData.text,
        startTime: logData.startTime,
        endTime: logData.endTime,
      };
      setLogs(prevLogs => [...prevLogs, newLog].sort((a, b) => a.startTime - b.startTime));
      api.createLog(newLog).catch(err => {
        console.error('createLog failed:', err);
        enqueuePendingOp({ type: 'createLog', payload: newLog });
      });
    }
  };

  const handleDeleteLog = (logId) => {
    setLogs(prevLogs => prevLogs.filter(log => log.id !== logId));
    api.deleteLog(logId).catch(err => {
      console.error('deleteLog failed:', err);
      enqueuePendingOp({ type: 'deleteLog', payload: { id: logId } });
    });
  };

  const handleUpdateLogTime = (logId, newStartTime, newEndTime) => {
    setLogs(prevLogs => prevLogs.map(log => log.id === logId ? { ...log, startTime: newStartTime, endTime: newEndTime } : log).sort((a, b) => a.startTime - b.startTime));
    api.updateLog(logId, { startTime: newStartTime, endTime: newEndTime }).catch(err => {
      console.error('updateLog failed:', err);
      enqueuePendingOp({ type: 'updateLog', payload: { id: logId, updates: { startTime: newStartTime, endTime: newEndTime } } });
    });
  };

  const addLog = (log) => {
    setLogs(prevLogs => [...prevLogs, log]);
    api.createLog(log).catch(err => {
      console.error('createLog failed:', err);
      enqueuePendingOp({ type: 'createLog', payload: log });
    });
  }

  const forceSync = async () => {
    try {
      const data = await api.getLogs();
      if (data) {
        const parsed = data.map(log => ({
          ...log,
          startTime: new Date(log.startTime),
          endTime: new Date(log.endTime),
        }));
        setLogs(parsed);
        saveCache(CACHE_KEY, parsed);
      }
    } catch (err) {
      console.error('Logs force sync failed:', err);
    }
  };

  return { logs, setLogs, handleSaveLog, handleDeleteLog, handleUpdateLogTime, addLog, forceSync };
}
