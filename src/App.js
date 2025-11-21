import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import 'react-quill/dist/quill.snow.css';
import 'react-day-picker/dist/style.css';

import { useTreeData } from './hooks/useTreeData';
import { useLogs } from './hooks/useLogs';
import { useMemoryData } from './hooks/useMemoryData';
import TreeDataContext from './contexts/TreeDataContext';
import LogsContext from './contexts/LogsContext';
import MemoryContext from './contexts/MemoryContext';
import { findNodeRecursive } from './utils/treeUtils';
import { generateId } from './utils/idGenerator';

import FocusView from './components/FocusView';
import MainPage from './pages/MainPage';

const POMODORO_TIME = 25 * 60;
const SHORT_BREAK_TIME = 5 * 60;
const LONG_BREAK_TIME = 15 * 60;

export default function TaskTreeApp() {
  const treeDataHook = useTreeData();
  const logsHook = useLogs();
  const memoryDataHook = useMemoryData();
  
  const { treeData, handleUpdate, handleUpdateField, handleAddField } = treeDataHook;

  const [focusedTaskId, setFocusedTaskId] = useState(null);
  const [timerMode, setTimerMode] = useState('pomodoro');
  const [timeRemaining, setTimeRemaining] = useState(POMODORO_TIME);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [activeSession, setActiveSession] = useState(null);

  const focusedTask = useMemo(() => {
    if (!focusedTaskId) return null;
    return findNodeRecursive(treeData, focusedTaskId);
  }, [treeData, focusedTaskId]);

  useEffect(() => {
    if (!focusedTask) return;

    let interval = null;
    if (isTimerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(time => time - 1);
      }, 1000);
    } else if (isTimerActive && timeRemaining === 0) {
      setIsTimerActive(false);
      if (timerMode === 'pomodoro') {
        const newCount = pomodoroCount + 1;
        setPomodoroCount(newCount);
        const pomodorosField = focusedTask.fields?.find(f => f.label === 'Pomodoros');
        const currentPoms = pomodorosField ? parseInt(pomodorosField.value, 10) : 0;
        const newPomsValue = isNaN(currentPoms) ? 1 : currentPoms + 1;

        if (pomodorosField) {
          handleUpdateField(focusedTask.id, pomodorosField.id, 'value', String(newPomsValue));
        } else {
          handleAddField(focusedTask.id, { label: 'Pomodoros', value: '1' });
        }

        setTimerMode(newCount % 4 === 0 ? 'longBreak' : 'shortBreak');
      } else {
        setTimerMode('pomodoro');
      }
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timeRemaining, timerMode, pomodoroCount, focusedTask, handleUpdateField, handleAddField]);

  useEffect(() => {
    const timeMap = { pomodoro: POMODORO_TIME, shortBreak: SHORT_BREAK_TIME, longBreak: LONG_BREAK_TIME };
    setTimeRemaining(timeMap[timerMode]);
  }, [timerMode]);

  const handleTimerStartPause = () => {
    const newIsTimerActive = !isTimerActive;

    if (newIsTimerActive && focusedTask) {
      setActiveSession({ taskId: focusedTask.id, startTime: new Date() });
    } else if (!newIsTimerActive && activeSession) {
      const endTime = new Date();
      const newLog = {
        id: generateId(),
        taskId: activeSession.taskId,
        taskText: findNodeRecursive(treeData, activeSession.taskId)?.text || 'Untitled Task',
        startTime: activeSession.startTime,
        endTime: endTime,
      };
      if (endTime.getTime() - activeSession.startTime.getTime() > 5 * 60 * 1000) {
        logsHook.addLog(newLog);
      }
      setActiveSession(null);
      handleUpdate(focusedTask.id, { timeRemaining, timerMode, isTimerActive: false });
    }
    setIsTimerActive(newIsTimerActive);
  };

  const handleTimerReset = () => {
    if (!focusedTask) return;
    setIsTimerActive(false);
    const timeMap = { pomodoro: POMODORO_TIME, shortBreak: SHORT_BREAK_TIME, longBreak: LONG_BREAK_TIME };
    setTimeRemaining(timeMap[timerMode]);
    if (focusedTask) {
      handleUpdate(focusedTask.id, { timeRemaining: timeMap[timerMode], timerMode, isTimerActive: false });
    }
  };


  const handleStartFocus = (taskId) => {
    setFocusedTaskId(taskId);
    const task = findNodeRecursive(treeData, taskId);
    if (task) {
      setTimerMode(task.timerMode || 'pomodoro');
      setTimeRemaining(task.timeRemaining !== undefined ? task.timeRemaining : POMODORO_TIME);
      setIsTimerActive(false); 
    } else {
      setTimerMode('pomodoro');
      setTimeRemaining(POMODORO_TIME);
      setIsTimerActive(false);
    }
  };

  const handleExitFocus = () => {
    if (focusedTask) {
      if (isTimerActive && activeSession) {
        const endTime = new Date();
        const newLog = {
          id: generateId(),
          taskId: activeSession.taskId,
          taskText: findNodeRecursive(treeData, activeSession.taskId)?.text || 'Untitled Task',
          startTime: activeSession.startTime,
          endTime: endTime,
        };
        if (endTime.getTime() - activeSession.startTime.getTime() > 5 * 60 * 1000) {
          logsHook.addLog(newLog);
        }
        setActiveSession(null);
        handleUpdate(focusedTask.id, { timeRemaining, timerMode, isTimerActive: false });
      }
    }
    setFocusedTaskId(null);
  };
  
  const timerProps = {
    timeRemaining,
    isTimerActive,
    timerMode,
    onStartPause: handleTimerStartPause,
    onReset: handleTimerReset,
    onSetMode: setTimerMode
  };

  const handleExport = () => {
    try {
      const stateToExport = {
        treeData: treeData,
        logs: logsHook.logs,
        memoryData: memoryDataHook.memoryData,
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stateToExport, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `flow-backup-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data.");
    }
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm("Are you sure you want to import? This will override all your current tasks and logs.")) {
      e.target.value = null;
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedState = JSON.parse(event.target.result);
        if (importedState.memoryData) {
          memoryDataHook.setMemoryData(importedState.memoryData);
        }
        if (importedState.treeData && Array.isArray(importedState.logs)) {
          treeDataHook.setTreeData(importedState.treeData);
          const revivedLogs = importedState.logs.map(log => ({
            ...log,
            startTime: new Date(log.startTime),
            endTime: new Date(log.endTime)
          }));
          logsHook.setLogs(revivedLogs);
          alert("Data imported successfully!");
        } else {
          alert("Import failed: Invalid file format.");
        }
      } catch (error) {
        console.error("Import failed:", error);
        alert("Import failed: Could not parse the file.");
      } finally {
        e.target.value = null;
      }
    };
    reader.readAsText(file);
  };

  let appState = 'idle';
  if (focusedTask) {
    if (isTimerActive) {
      appState = timerMode === 'pomodoro' ? 'focusing' : 'break';
    } else {
      appState = 'paused';
    }
  }

  const scrollbarHideStyle = `
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `;

  const quillStyle = `
    .rich-text-editor .ql-toolbar {
      border-radius: 8px 8px 0 0;
      border-color: #334155;
    }
    .rich-text-editor .ql-container {
      border-radius: 0 0 8px 8px;
      border-color: #334155;
      color: #cbd5e1;
      min-height: 150px;
    }
    .rich-text-editor .ql-editor {
      font-size: 14px;
    }
    .rich-text-editor .ql-snow .ql-stroke {
      stroke: #94a3b8;
    }
    .rich-text-editor .ql-snow .ql-picker-label {
      color: #94a3b8;
    }
  `;

  return (
    <TreeDataContext.Provider value={treeDataHook}>
      <LogsContext.Provider value={logsHook}>
        <MemoryContext.Provider value={memoryDataHook}>
          <style>{scrollbarHideStyle}</style>
          <style>{quillStyle}</style>
          {focusedTask ? (
            <FocusView
              task={focusedTask}
              timerProps={timerProps}
              onExit={handleExitFocus}
              appState={appState}
            />
          ) : (
            <MainPage
              focusedTask={focusedTask}
              handleStartFocus={handleStartFocus}
              appState={appState}
              handleExport={handleExport}
              handleImport={handleImport}
            />
          )}
        </MemoryContext.Provider>
      </LogsContext.Provider>
    </TreeDataContext.Provider>
  );
}
