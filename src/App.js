import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { playNotificationSound, getNotificationSound } from './utils/notificationSounds';
import { getTimerDurations, getNudgeMinutes } from './utils/timerSettings';

import FocusView from './components/FocusView';
import TriageModal from './components/TriageModal';
import MainPage from './pages/MainPage';
import { getTodayDateString } from './utils/dateUtils';

export default function TaskTreeApp() {
  const treeDataHook = useTreeData();
  const logsHook = useLogs();
  const memoryDataHook = useMemoryData();
  
  const { treeData, handleUpdate, handleUpdateField, handleAddField } = treeDataHook;

  const [focusedTaskId, setFocusedTaskId] = useState(null);
  const [timerMode, setTimerMode] = useState('pomodoro');
  const [timeRemaining, setTimeRemaining] = useState(() => getTimerDurations().pomodoro);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [activeSession, setActiveSession] = useState(null);
  const [capturedTasks, setCapturedTasks] = useState([]);
  const [showTriageModal, setShowTriageModal] = useState(false);

  // Refs for notification action handlers
  const swRegistrationRef = useRef(null);
  const handleUpdateRef = useRef(handleUpdate);
  const focusedTaskIdRef = useRef(focusedTaskId);
  const nudgeTimeoutRef = useRef(null);
  handleUpdateRef.current = handleUpdate;
  focusedTaskIdRef.current = focusedTaskId;

  const focusedTask = useMemo(() => {
    if (!focusedTaskId) return null;
    return findNodeRecursive(treeData, focusedTaskId);
  }, [treeData, focusedTaskId]);

  // Register service worker for notification actions
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register(`${process.env.PUBLIC_URL}/notification-sw.js`)
      .then(reg => { swRegistrationRef.current = reg; })
      .catch(err => console.error('Notification SW registration failed:', err));

    const handleMessage = (event) => {
      if (event.data?.type === 'NOTIFICATION_ACTION') {
        const { action, taskId } = event.data;
        window.focus();

        if (action === 'newPomodoro') {
          const tid = taskId || focusedTaskIdRef.current;
          if (tid) {
            setFocusedTaskId(tid);
            setTimerMode('pomodoro');
            setTimeRemaining(getTimerDurations().pomodoro);
            setIsTimerActive(true);
            setActiveSession({ taskId: tid, startTime: new Date() });
          }
        } else if (action === 'markFinished') {
          const tid = taskId || focusedTaskIdRef.current;
          if (tid) {
            handleUpdateRef.current(tid, { isCompleted: true });
          }
          setIsTimerActive(false);
          setActiveSession(null);
          setFocusedTaskId(null);
        } else if (action === 'snooze') {
          // Snooze nudge for 10 minutes
          clearTimeout(nudgeTimeoutRef.current);
          nudgeTimeoutRef.current = setTimeout(() => {
            showNotification(
              'Knock Knock!',
              "You haven't started this in a while.",
              [{ action: 'snooze', title: 'Remind in 10 min' }],
              null,
              'pomodoro-nudge'
            );
            playNotificationSound(getNotificationSound());
          }, 10 * 60 * 1000);
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, []);

  const showNotification = (title, body, actions = [], taskId = null, tag = 'pomodoro-timer') => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const reg = swRegistrationRef.current;
    if (reg) {
      reg.showNotification(title, {
        body,
        icon: '/logo192.png',
        actions,
        data: { taskId },
        requireInteraction: actions.length > 0,
        tag,
      });
    }
  };

  useEffect(() => {
    if (!focusedTask) return;

    let interval = null;
    if (isTimerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(time => time - 1);
      }, 1000);
    } else if (isTimerActive && timeRemaining === 0) {
      setIsTimerActive(false);
      playNotificationSound(getNotificationSound());
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

        showNotification(
          'Pomodoro Complete!',
          focusedTask.text || 'Untitled Task',
          [
            { action: 'newPomodoro', title: 'New Pomodoro' },
            { action: 'markFinished', title: 'Mark Finished' },
          ],
          focusedTask.id
        );

        setTimerMode(newCount % 4 === 0 ? 'longBreak' : 'shortBreak');
      } else {
        showNotification(
          'Break Over!',
          `Ready to focus on: ${focusedTask.text || 'Untitled Task'}`,
          [
            { action: 'newPomodoro', title: 'Start Focus' },
            { action: 'markFinished', title: 'Mark Finished' },
          ],
          focusedTask.id
        );
        setTimerMode('pomodoro');
      }
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timeRemaining, timerMode, pomodoroCount, focusedTask, handleUpdateField, handleAddField]);

  useEffect(() => {
    const durations = getTimerDurations();
    const timeMap = { pomodoro: durations.pomodoro, shortBreak: durations.shortBreak, longBreak: durations.longBreak };
    setTimeRemaining(timeMap[timerMode]);
  }, [timerMode]);

  const handleTimerStartPause = () => {
    const newIsTimerActive = !isTimerActive;

    if (newIsTimerActive && focusedTask) {
      setActiveSession({ taskId: focusedTask.id, startTime: new Date() });
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      const modeLabel = timerMode === 'pomodoro' ? 'Focus' : timerMode === 'shortBreak' ? 'Short Break' : 'Long Break';
      showNotification(`${modeLabel} Started`, focusedTask.text || 'Untitled Task', [], focusedTask.id);
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
    const durations = getTimerDurations();
    const timeMap = { pomodoro: durations.pomodoro, shortBreak: durations.shortBreak, longBreak: durations.longBreak };
    setTimeRemaining(timeMap[timerMode]);
    if (focusedTask) {
      handleUpdate(focusedTask.id, { timeRemaining: timeMap[timerMode], timerMode, isTimerActive: false });
    }
  };


  const handleStartFocus = (taskId) => {
    setFocusedTaskId(taskId);
    const task = findNodeRecursive(treeData, taskId);
    const defaultPomodoro = getTimerDurations().pomodoro;
    if (task) {
      setTimerMode(task.timerMode || 'pomodoro');
      setTimeRemaining(task.timeRemaining !== undefined ? task.timeRemaining : defaultPomodoro);
      setIsTimerActive(false);
    } else {
      setTimerMode('pomodoro');
      setTimeRemaining(defaultPomodoro);
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
    if (capturedTasks.length > 0) {
      setShowTriageModal(true);
    }
    setFocusedTaskId(null);
  };

  const handleCaptureTask = (text) => {
    setCapturedTasks(prev => [...prev, { id: generateId(), text }]);
  };

  const handleAddCapturedAsRoot = (text) => {
    const newId = treeDataHook.handleAddRoot(getTodayDateString());
    handleUpdate(newId, { text });
  };

  const handleAddCapturedUnderParent = (text, parentId) => {
    const newId = treeDataHook.handleAddSubtask(parentId, getTodayDateString());
    handleUpdate(newId, { text });
  };

  const handleTriageComplete = () => {
    setCapturedTasks([]);
    setShowTriageModal(false);
  };

  // Idle nudge: notify when no pomodoro is running for a configured period
  useEffect(() => {
    clearTimeout(nudgeTimeoutRef.current);
    // Only nudge when completely idle (not in focus mode, timer not active)
    if (focusedTaskId || isTimerActive) return;

    const nudgeMinutes = getNudgeMinutes();
    if (nudgeMinutes <= 0) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    nudgeTimeoutRef.current = setTimeout(() => {
      showNotification(
        'Knock Knock!',
        "You haven't started this in a while.",
        [{ action: 'snooze', title: 'Remind in 10 min' }],
        null,
        'pomodoro-nudge'
      );
      playNotificationSound(getNotificationSound());
    }, nudgeMinutes * 60 * 1000);

    return () => clearTimeout(nudgeTimeoutRef.current);
  }, [focusedTaskId, isTimerActive]);

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
    .rich-text-editor .ql-editor.ql-blank::before {
      color: #64748b; /* slate-500 */
      font-style: italic;
      left: 1rem; /* Corresponds to ql-editor's padding */
      pointer-events: none;
    }
  `;

  return (
    <TreeDataContext.Provider value={treeDataHook}>
      <LogsContext.Provider value={logsHook}>
        <MemoryContext.Provider value={memoryDataHook}>
          <style>{scrollbarHideStyle}</style>
          <style>{quillStyle}</style>
          {showTriageModal ? (
            <TriageModal
              capturedTasks={capturedTasks}
              treeData={treeData}
              onAddAsRoot={handleAddCapturedAsRoot}
              onAddUnderParent={handleAddCapturedUnderParent}
              onDiscard={() => {}}
              onComplete={handleTriageComplete}
            />
          ) : focusedTask ? (
            <FocusView
              task={focusedTask}
              timerProps={timerProps}
              onExit={handleExitFocus}
              appState={appState}
              capturedTasks={capturedTasks}
              onCaptureTask={handleCaptureTask}
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
