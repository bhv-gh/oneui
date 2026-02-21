import React, { useState, useEffect, useMemo, useContext, useCallback, useRef } from 'react';
import { Plus, CalendarDays, Settings2, Mic, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, pointerWithin } from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';

import TreeDataContext from '../contexts/TreeDataContext';
import LogsContext from '../contexts/LogsContext';
import MemoryContext from '../contexts/MemoryContext';
import CustomDatePicker from '../components/CustomDatePicker';
import MobileTaskItem from '../components/MobileTaskItem';
import SettingsModal from '../components/SettingsModal';
import DeleteModal from '../components/DeleteModal';
import TaskNotesPanel from '../components/TaskNotesPanel';
import RambleModal, { isSpeechSupported } from '../components/RambleModal';
import QuickAddModal from '../components/QuickAddModal';

import { getTodayDateString } from '../utils/dateUtils';
import { filterTreeByCompletionDate, filterTreeByScheduledDate, filterForTodayView } from '../utils/treeFilters';
import { findNodeRecursive } from '../utils/treeUtils';

// Root drop zone for mobile view
function MobileRootDropZone({ activeDragId }) {
  const { setNodeRef, isOver } = useDroppable({ id: '__root__' });
  if (!activeDragId) return null;
  return (
    <div
      ref={setNodeRef}
      className={`mx-4 my-2 py-4 text-sm text-center rounded-lg border-2 border-dashed transition-all ${
        isOver
          ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400'
          : 'border-slate-700 text-slate-500'
      }`}
    >
      Drop here for root level
    </div>
  );
}

export default function MobileView({ handleStartFocus, handleExport, handleImport, onLogout }) {
  const {
    treeData,
    handleUpdate,
    handleAddSubtask,
    handleDelete,
    handleAddRoot,
    handleAddTree,
    handleMoveNode,
    syncStatus,
    forceSync: forceSyncTree,
  } = useContext(TreeDataContext);
  const { forceSync: forceSyncLogs } = useContext(LogsContext);
  const { forceSync: forceSyncMemory } = useContext(MemoryContext);

  const [simulatedToday, setSimulatedToday] = useState(getTodayDateString);
  const [selectedDate, setSelectedDate] = useState(simulatedToday);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRambleOpen, setIsRambleOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [newlyAddedTaskId, setNewlyAddedTaskId] = useState(null);
  const [notesTaskId, setNotesTaskId] = useState(null);
  const [activeDragId, setActiveDragId] = useState(null);
  const datePickerRef = useRef(null);
  const lastTodayRef = useRef(getTodayDateString());

  // DnD sensors and handlers
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } });
  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } });
  const dndSensors = useSensors(touchSensor, pointerSensor);

  const handleDragStart = useCallback((event) => {
    setActiveDragId(event.active.id);
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      handleMoveNode(active.id, over.id === '__root__' ? null : over.id);
    }
    setActiveDragId(null);
  }, [handleMoveNode]);

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
  }, []);

  // Day-change detection
  useEffect(() => {
    const checkForDayChange = () => {
      const currentToday = getTodayDateString();
      if (currentToday !== lastTodayRef.current) {
        if (selectedDate === lastTodayRef.current) {
          setSelectedDate(currentToday);
        }
        if (simulatedToday === lastTodayRef.current) {
          setSimulatedToday(currentToday);
        }
        lastTodayRef.current = currentToday;
      }
    };
    window.addEventListener('focus', checkForDayChange);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForDayChange();
    });
    const interval = setInterval(checkForDayChange, 60000);
    return () => {
      window.removeEventListener('focus', checkForDayChange);
      document.removeEventListener('visibilitychange', checkForDayChange);
      clearInterval(interval);
    };
  }, [selectedDate, simulatedToday]);

  const displayedTreeData = useMemo(() => {
    const today = simulatedToday;
    if (selectedDate < today) return filterTreeByCompletionDate(treeData, selectedDate);
    if (selectedDate > today) return filterTreeByScheduledDate(treeData, selectedDate);
    return filterForTodayView(treeData, today);
  }, [treeData, selectedDate, simulatedToday]);

  // Flatten tree for rendering
  const flattenedTasks = useMemo(() => {
    const flatten = (nodes, path = [], parentHideCompleted = false) => {
      let list = [];
      for (const node of nodes) {
        const nodeIsCompleted = node.recurrence
          ? node.completedOccurrences?.includes(selectedDate)
          : node.isCompleted;
        if (parentHideCompleted && nodeIsCompleted) continue;
        list.push({ task: node, path });
        if (node.children) {
          list = list.concat(flatten(node.children, [...path, node.text || 'Untitled'], node.hideCompleted));
        }
      }
      return list;
    };
    return flatten(displayedTreeData);
  }, [displayedTreeData, selectedDate]);

  const handleAddTaskAndFocus = (addFn) => {
    const newId = addFn();
    if (newId) setNewlyAddedTaskId(newId);
  };

  const handleOpenNotes = useCallback((taskId) => setNotesTaskId(taskId), []);
  const handleCloseNotes = useCallback(() => setNotesTaskId(null), []);

  const handleRambleAdd = useCallback((tasks) => {
    handleAddTree(tasks, selectedDate);
  }, [handleAddTree, selectedDate]);

  const handleSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await Promise.all([forceSyncTree(), forceSyncLogs(), forceSyncMemory()]);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, forceSyncTree, forceSyncLogs, forceSyncMemory]);

  const confirmDelete = () => {
    if (deleteTargetId) {
      handleDelete(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  const isPastDate = selectedDate < simulatedToday;

  return (
    <div className="h-screen w-screen bg-slate-900 text-slate-200 flex flex-col overflow-hidden">
      {/* Sticky header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 safe-area-top">
        <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          Flow
        </h1>

        <div className="flex items-center gap-1">
          {/* Sync status + button */}
          {syncStatus !== 'idle' && !isSyncing && (
            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md ${
              syncStatus === 'saving' ? 'text-slate-400' :
              syncStatus === 'saved' ? 'text-emerald-400' :
              syncStatus === 'error' ? 'text-rose-400' : ''
            }`}>
              {syncStatus === 'saving' && <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />}
              {syncStatus === 'saved' && (
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              )}
              {syncStatus === 'error' && <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />}
            </div>
          )}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="p-2 rounded-lg text-slate-400 active:bg-slate-800 disabled:opacity-50"
            title="Sync"
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
          </button>

          {/* Date selector */}
          <button
            onClick={() => setIsDatePickerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-400 active:bg-slate-800"
          >
            <CalendarDays size={16} />
            <span>{selectedDate === simulatedToday ? 'Today' : selectedDate.slice(5)}</span>
          </button>

          {/* Ramble mic */}
          {isSpeechSupported && (
            <button
              onClick={() => setIsRambleOpen(true)}
              className="p-2 rounded-lg text-slate-400 active:bg-slate-800"
              title="Ramble"
            >
              <Mic size={18} />
            </button>
          )}

          {/* Settings */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-lg text-slate-400 active:bg-slate-800"
          >
            <Settings2 size={18} />
          </button>
        </div>
      </div>

      {/* Scrollable task list */}
      <DndContext sensors={dndSensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
      <div className="flex-1 overflow-y-auto overscroll-y-contain no-scrollbar">
        {flattenedTasks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center h-full">
            {isPastDate ? (
              <p className="text-slate-600 text-sm">No tasks were completed on this day.</p>
            ) : (
              <button
                onClick={() => setIsQuickAddOpen(true)}
                className="flex flex-col items-center gap-2 text-slate-500 active:text-emerald-400 p-8"
              >
                <Plus size={28} />
                <span className="text-sm font-medium">Add a Task</span>
              </button>
            )}
          </div>
        ) : (
          <div className="pb-24">
            {flattenedTasks.map(({ task, path }) => (
              <MobileTaskItem
                key={task.id}
                task={task}
                path={path}
                onUpdate={(id, updates) => handleUpdate(id, updates, selectedDate)}
                onStartFocus={handleStartFocus}
                onAdd={(parentId) => handleAddTaskAndFocus(() => handleAddSubtask(parentId, selectedDate))}
                onRequestDelete={setDeleteTargetId}
                selectedDate={selectedDate}
                newlyAddedTaskId={newlyAddedTaskId}
                onFocusHandled={() => setNewlyAddedTaskId(null)}
                onOpenNotes={handleOpenNotes}
                activeDragId={activeDragId}
              />
            ))}
            <MobileRootDropZone activeDragId={activeDragId} />
          </div>
        )}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeDragId ? (() => {
          const dragNode = findNodeRecursive(treeData, activeDragId);
          return dragNode ? (
            <div className="px-4 py-2 bg-slate-800 border border-cyan-400 rounded-lg shadow-lg text-sm text-slate-200 max-w-[200px] truncate">
              {dragNode.text || 'Untitled Task'}
            </div>
          ) : null;
        })() : null}
      </DragOverlay>
      </DndContext>

      {/* FAB — quick add */}
      {!isPastDate && (
        <button
          onClick={() => setIsQuickAddOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-emerald-600 active:bg-emerald-700 text-white shadow-lg shadow-emerald-900/40 flex items-center justify-center z-30"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Date picker overlay */}
      {isDatePickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setIsDatePickerOpen(false); }}
        >
          <div ref={datePickerRef} className="mb-4 animate-in slide-in-from-bottom duration-200">
            <CustomDatePicker
              selected={selectedDate ? parseISO(selectedDate) : undefined}
              onSelect={(date) => {
                if (date) setSelectedDate(format(date, 'yyyy-MM-dd'));
                setIsDatePickerOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <DeleteModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDelete}
      />

      {/* Task notes panel */}
      {notesTaskId && (() => {
        const notesTask = findNodeRecursive(treeData, notesTaskId);
        if (!notesTask) return null;
        return (
          <TaskNotesPanel
            taskId={notesTaskId}
            taskTitle={notesTask.text}
            initialNotes={notesTask.notes || ''}
            onUpdate={handleUpdate}
            onClose={handleCloseNotes}
          />
        );
      })()}

      {/* Settings modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onExport={handleExport}
        onImport={handleImport}
        simulatedToday={simulatedToday}
        setSimulatedToday={setSimulatedToday}
        onLogout={onLogout}
      />

      {/* Ramble modal */}
      <RambleModal
        isOpen={isRambleOpen}
        onClose={() => setIsRambleOpen(false)}
        onAddTasks={handleRambleAdd}
      />

      {/* Quick add modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        treeData={treeData}
        onAddSubtask={handleAddSubtask}
        onAddRoot={handleAddRoot}
        onUpdate={handleUpdate}
        selectedDate={selectedDate}
      />
    </div>
  );
}
