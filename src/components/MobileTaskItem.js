import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Check,
  CalendarPlus,
  Repeat,
  Play,
  MoreVertical,
  ExternalLink,
  StickyNote,
  GripVertical,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import CustomDatePicker from './CustomDatePicker';
import RecurrenceEditor from './RecurrenceEditor';
import { getLinkedSegments } from '../utils/linkUtils';

const MobileTaskItem = ({ task, path, onUpdate, onStartFocus, onAdd, onRequestDelete, onDeleteEmpty, selectedDate, newlyAddedTaskId, onFocusHandled, onOpenNotes, activeDragId, isPastDate, onPrepareKeyboard }) => {
  const isCompleted = task.recurrence
    ? task.completedOccurrences?.includes(selectedDate)
    : task.isCompleted;

  const [isEditing, setIsEditing] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [isSchedulePickerOpen, setIsSchedulePickerOpen] = useState(false);
  const [isRecurrenceEditorOpen, setIsRecurrenceEditorOpen] = useState(false);
  const inputRef = useRef(null);
  const schedulePickerRef = useRef(null);
  const recurrenceEditorRef = useRef(null);

  // Swipe-to-add-subtask state
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartRef = useRef(null);
  const swipeActiveRef = useRef(false);
  const isNewlyCreatedRef = useRef(false);

  const handleTouchStart = useCallback((e) => {
    if (isPastDate) return;
    if (e.target.closest('[data-drag-handle]')) return;
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    swipeActiveRef.current = false;
  }, [isPastDate]);

  const handleTouchMove = useCallback((e) => {
    if (!touchStartRef.current) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;

    if (!swipeActiveRef.current) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        swipeActiveRef.current = true;
      } else if (Math.abs(dy) > 10) {
        touchStartRef.current = null;
        return;
      }
    }

    if (swipeActiveRef.current && dx > 0) {
      e.preventDefault();
      setSwipeOffset(Math.min(dx, 120));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (swipeOffset >= 80) {
      if (onPrepareKeyboard) onPrepareKeyboard();
      onAdd(task.id);
    }
    setSwipeOffset(0);
    touchStartRef.current = null;
    swipeActiveRef.current = false;
  }, [swipeOffset, onAdd, task.id, onPrepareKeyboard]);

  // DnD hooks
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id: task.id });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: task.id });
  const isDropTarget = isOver && activeDragId && activeDragId !== task.id;

  const indentationStyle = {
    paddingLeft: `${0.75 + path.length * 1}rem`,
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (newlyAddedTaskId === task.id) {
      setIsEditing(true);
      isNewlyCreatedRef.current = true;
      if (onFocusHandled) onFocusHandled();
    }
  }, [newlyAddedTaskId, task.id, onFocusHandled]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (schedulePickerRef.current && !schedulePickerRef.current.contains(event.target)) {
        setIsSchedulePickerOpen(false);
      }
      if (recurrenceEditorRef.current && !recurrenceEditorRef.current.contains(event.target)) {
        setIsRecurrenceEditorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (isNewlyCreatedRef.current && !task.text.trim()) {
      onDeleteEmpty(task.id);
    }
    isNewlyCreatedRef.current = false;
  }, [task.text, task.id, onDeleteEmpty]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') setIsEditing(false);
  };

  const handleScheduleSelect = (date) => {
    const newScheduledDate = date ? format(date, 'yyyy-MM-dd') : null;
    onUpdate(task.id, { scheduledDate: newScheduledDate });
    setIsSchedulePickerOpen(false);
  };

  const handleRecurrenceSave = (newRecurrence) => {
    onUpdate(task.id, { recurrence: newRecurrence });
    setIsRecurrenceEditorOpen(false);
  };

  return (
    <div
      ref={setDropRef}
      data-task-id={task.id}
      style={indentationStyle}
      className={`relative overflow-hidden ${isDragging ? 'opacity-40' : ''} ${isDropTarget ? 'border-l-2 border-accent-secondary' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe reveal zone */}
      {swipeOffset > 0 && (
        <div
          className="absolute inset-y-0 left-0 flex items-center pl-4 bg-accent-bold rounded-r-lg"
          style={{ width: swipeOffset }}
        >
          <Plus size={20} className="text-content-inverse" />
        </div>
      )}

      {/* Sliding task content */}
      <div style={{ transform: `translateX(${swipeOffset}px)`, transition: swipeOffset === 0 ? 'transform 0.2s ease-out' : 'none', backgroundColor: 'inherit' }}>
      {/* Main row */}
      <div className={`flex items-center gap-3 px-3 py-3 min-h-[44px] ${isCompleted ? 'opacity-50' : ''}`}>
        {/* Drag Handle */}
        <div
          ref={setDragRef}
          {...listeners}
          {...attributes}
          data-drag-handle
          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-content-disabled -ml-1"
          style={{ touchAction: 'none' }}
        >
          <GripVertical size={16} />
        </div>
        {/* Checkbox — visual 24px circle, 44px tap target via wrapper */}
        <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 -ml-2.5">
          <button
            onClick={() => onUpdate(task.id, { isCompleted: !isCompleted })}
            className={`flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all ${
              isCompleted
                ? 'bg-accent-bold border-accent-bold text-content-inverse'
                : 'border-edge-primary'
            }`}
          >
            {isCompleted && <Check size={14} strokeWidth={3} />}
          </button>
        </div>

        {/* Task text */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={task.text}
              onChange={(e) => onUpdate(task.id, { text: e.target.value })}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="bg-transparent text-content-primary text-base w-full outline-none border-b border-edge-focus py-1"
            />
          ) : (
            <p
              onClick={() => setIsEditing(true)}
              className={`text-sm text-content-primary ${isCompleted ? 'line-through' : ''}`}
            >
              {(() => {
                const segments = getLinkedSegments(task.text, task.links);
                if (segments) {
                  return segments.map((seg, i) =>
                    seg.type === 'link' ? (
                      <a
                        key={i}
                        href={seg.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-accent-secondary"
                      >
                        {seg.content}
                        <ExternalLink size={10} className="inline ml-0.5 mb-0.5" />
                      </a>
                    ) : (
                      <span key={i}>{seg.content}</span>
                    )
                  );
                }
                return task.text || <span className="text-content-disabled italic">Untitled Task</span>;
              })()}
            </p>
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {task.recurrence && <Repeat size={12} className="text-accent-secondary-bold" />}
          {task.notes && <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />}
          {task.scheduledDate && (
            <span className="text-[10px] text-content-muted">{task.scheduledDate.slice(5)}</span>
          )}
        </div>

        {/* More button — 44px tap target */}
        <button
          onClick={() => setActionsOpen(o => !o)}
          className="flex-shrink-0 p-2 -mr-2 text-content-muted active:text-content-secondary"
          style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <MoreVertical size={18} />
        </button>
      </div>

      {/* Inline action row */}
      {actionsOpen && (
        <div className="flex items-center gap-1 px-3 pb-2 ml-9 animate-in fade-in slide-in-from-top-1 duration-150">
          <button
            onClick={() => { setIsSchedulePickerOpen(o => !o); }}
            className="p-2.5 rounded-lg text-content-tertiary active:bg-surface-secondary"
            title="Schedule"
          >
            <CalendarPlus size={18} />
          </button>
          <button
            onClick={() => { setIsRecurrenceEditorOpen(o => !o); }}
            className="p-2.5 rounded-lg text-content-tertiary active:bg-surface-secondary"
            title="Recurrence"
          >
            <Repeat size={18} />
          </button>
          <button
            onClick={() => { onAdd(task.id); setActionsOpen(false); }}
            className="p-2.5 rounded-lg text-content-tertiary active:bg-surface-secondary"
            title="Add Subtask"
          >
            <Plus size={18} />
          </button>
          <button
            onClick={() => { onStartFocus(task.id); setActionsOpen(false); }}
            className="p-2.5 rounded-lg text-content-tertiary active:bg-surface-secondary"
            title="Focus"
          >
            <Play size={18} />
          </button>
          <button
            onClick={() => { if (onOpenNotes) onOpenNotes(task.id); setActionsOpen(false); }}
            className="p-2.5 rounded-lg text-content-tertiary active:bg-surface-secondary"
            title="Notes"
          >
            <StickyNote size={18} />
          </button>
          <button
            onClick={() => { onRequestDelete(task.id); setActionsOpen(false); }}
            className="p-2.5 rounded-lg text-danger active:bg-surface-secondary"
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
        </div>
      )}

      </div>{/* end sliding task content */}

      {/* Schedule picker overlay */}
      {isSchedulePickerOpen && (
        <div ref={schedulePickerRef} className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) setIsSchedulePickerOpen(false); }}>
          <div className="mb-4 animate-in slide-in-from-bottom duration-200">
            <CustomDatePicker
              selected={task.scheduledDate ? parseISO(task.scheduledDate) : undefined}
              onSelect={handleScheduleSelect}
            />
          </div>
        </div>
      )}

      {/* Recurrence editor overlay */}
      {isRecurrenceEditorOpen && (
        <div ref={recurrenceEditorRef} className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) setIsRecurrenceEditorOpen(false); }}>
          <div className="mb-4 animate-in slide-in-from-bottom duration-200">
            <RecurrenceEditor
              recurrence={task.recurrence}
              onSave={handleRecurrenceSave}
              onClose={() => setIsRecurrenceEditorOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileTaskItem;
