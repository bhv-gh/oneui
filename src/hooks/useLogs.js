import { useState, useEffect, useRef } from 'react';
import { generateId } from '../utils/idGenerator';
import * as api from '../api/client';

export function useLogs() {
  const [logs, setLogs] = useState([]);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    const init = async () => {
      try {
        const data = await api.getLogs();
        if (data) {
          setLogs(data.map(log => ({
            ...log,
            startTime: new Date(log.startTime),
            endTime: new Date(log.endTime),
          })));
        }
      } catch (err) {
        console.error('Failed to init logs:', err);
      } finally {
        isInitialLoad.current = false;
      }
    };
    init();
  }, []);

  const handleSaveLog = (logData) => {
    if (logData.id) {
      setLogs(prevLogs => prevLogs.map(log => log.id === logData.id ? { ...log, taskText: logData.text } : log));
      api.updateLog(logData.id, { taskText: logData.text }).catch(console.error);
    } else {
      const newLog = {
        id: generateId(),
        taskId: null,
        taskText: logData.text,
        startTime: logData.startTime,
        endTime: logData.endTime,
      };
      setLogs(prevLogs => [...prevLogs, newLog].sort((a, b) => a.startTime - b.startTime));
      api.createLog(newLog).catch(console.error);
    }
  };

  const handleDeleteLog = (logId) => {
    setLogs(prevLogs => prevLogs.filter(log => log.id !== logId));
    api.deleteLog(logId).catch(console.error);
  };

  const handleUpdateLogTime = (logId, newStartTime, newEndTime) => {
    setLogs(prevLogs => prevLogs.map(log => log.id === logId ? { ...log, startTime: newStartTime, endTime: newEndTime } : log).sort((a, b) => a.startTime - b.startTime));
    api.updateLog(logId, { startTime: newStartTime, endTime: newEndTime }).catch(console.error);
  };

  const addLog = (log) => {
    setLogs(prevLogs => [...prevLogs, log]);
    api.createLog(log).catch(console.error);
  }

  const forceSync = async () => {
    try {
      const data = await api.getLogs();
      if (data) {
        setLogs(data.map(log => ({
          ...log,
          startTime: new Date(log.startTime),
          endTime: new Date(log.endTime),
        })));
      }
    } catch (err) {
      console.error('Logs force sync failed:', err);
    }
  };

  return { logs, setLogs, handleSaveLog, handleDeleteLog, handleUpdateLogTime, addLog, forceSync };
}
