import { useState, useEffect } from 'react';
import { generateId } from '../utils/idGenerator';

export function useLogs() {
  const [logs, setLogs] = useState(() => {
    try {
      const savedLogsJSON = localStorage.getItem('flowAppLogsV1');
      if (savedLogsJSON) {
        const parsedLogs = JSON.parse(savedLogsJSON);
        return parsedLogs.map(log => ({
          ...log,
          startTime: new Date(log.startTime),
          endTime: new Date(log.endTime)
        }));
      }
    } catch (e) {
      console.error("Failed to load logs from localStorage:", e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('flowAppLogsV1', JSON.stringify(logs));
    } catch (e) {
      console.error("Failed to save logs to localStorage:", e);
    }
  }, [logs]);

  const handleSaveLog = (logData) => {
    if (logData.id) {
      setLogs(prevLogs => prevLogs.map(log => log.id === logData.id ? { ...log, taskText: logData.text } : log));
    } else {
      const newLog = {
        id: generateId(),
        taskId: null,
        taskText: logData.text,
        startTime: logData.startTime,
        endTime: logData.endTime,
      };
      setLogs(prevLogs => [...prevLogs, newLog].sort((a, b) => a.startTime - b.startTime));
    }
  };

  const handleDeleteLog = (logId) => {
    setLogs(prevLogs => prevLogs.filter(log => log.id !== logId));
  };

  const handleUpdateLogTime = (logId, newStartTime, newEndTime) => {
    setLogs(prevLogs => prevLogs.map(log => log.id === logId ? { ...log, startTime: newStartTime, endTime: newEndTime } : log).sort((a, b) => a.startTime - b.startTime));
  };

  const addLog = (log) => {
    setLogs(prevLogs => [...prevLogs, log]);
  }

  return { logs, handleSaveLog, handleDeleteLog, handleUpdateLogTime, addLog };
}
