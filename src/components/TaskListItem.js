import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  Check,
  CalendarDays,
  CalendarPlus,
  Repeat,
  Play,
  Sparkles,
  ExternalLink,
  X,
  StickyNote,
  GripVertical,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import CustomDatePicker from './CustomDatePicker';
import RecurrenceEditor from './RecurrenceEditor';
import { getTodayDateString } from '../utils/dateUtils';
import { isUrl, fetchPageTitle, getLinkedSegments } from '../utils/linkUtils';

// --- Component: Task List Item (for List View) ---
const TaskListItem = ({ task, path, onUpdate, onStartFocus, onAdd, onRequestDelete, selectedDate, newlyAddedTaskId, onFocusHandled, onOpenNotes, activeDragId }) => {
  const isCompleted = task.recurrence
    ? task.completedOccurrences?.includes(selectedDate)
    : task.isCompleted;

  const [isEditing, setIsEditing] = useState(false);
  const [isSchedulePickerOpen, setIsSchedulePickerOpen] = useState(false);
  const [isRecurrenceEditorOpen, setIsRecurrenceEditorOpen] = useState(false);
  const inputRef = useRef(null);
  const taskRef = useRef(task);
  taskRef.current = task;
  const schedulePickerRef = useRef(null);
  const recurrenceEditorRef = useRef(null);

  // DnD hooks
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id: task.id });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: task.id });
  const isDropTarget = isOver && activeDragId && activeDragId !== task.id;

  const indentationStyle = {
    // 1rem base padding + 1.5rem for each level of nesting
    paddingLeft: `${1 + path.length * 1.5}rem` 
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    if (newlyAddedTaskId === task.id) {
      setIsEditing(true);
      if (onFocusHandled) {
        onFocusHandled();
      }
    }
  }, [newlyAddedTaskId, task.id, onFocusHandled]);

  // Close popovers on outside click
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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').trim();
    if (isUrl(pasted)) {
      const alreadyTracked = (task.links || []).some(l => l.url === pasted);
      if (!alreadyTracked) {
        const newLinks = [...(task.links || []), { url: pasted, title: pasted }];
        onUpdate(task.id, { links: newLinks });
      }
      fetchPageTitle(pasted).then(title => {
        const latest = taskRef.current;
        const updatedLinks = (latest.links || []).map(l =>
          l.url === pasted ? { ...l, title } : l
        );
        onUpdate(task.id, { links: updatedLinks });
      });
    }
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
      className={`relative flex items-center gap-4 px-4 py-3 rounded-lg transition-colors group ${isCompleted ? 'opacity-50' : ''} ${isDragging ? '!opacity-40' : ''} ${isDropTarget ? 'border-l-2 border-cyan-400 bg-cyan-400/5' : ''} hover:bg-slate-800/50`}
      style={indentationStyle}
    >
      {/* Drag Handle */}
      <div
        ref={setDragRef}
        {...listeners}
        {...attributes}
        data-drag-handle
        className="flex-shrink-0 cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical size={16} />
      </div>
      {/* Schedule Picker Popover */}
      {isSchedulePickerOpen && (
        <div ref={schedulePickerRef} className="absolute top-full right-4 mt-2 z-30 animate-in fade-in duration-100">
          <CustomDatePicker
            selected={task.scheduledDate ? parseISO(task.scheduledDate) : undefined}
            onSelect={handleScheduleSelect}
          />
        </div>
      )}
      {/* Recurrence Editor Popover */}
      {isRecurrenceEditorOpen && (
        <div ref={recurrenceEditorRef} className="absolute top-full right-4 mt-2 z-30 animate-in fade-in duration-100">
          <RecurrenceEditor
            recurrence={task.recurrence}
            onSave={handleRecurrenceSave}
            onClose={() => setIsRecurrenceEditorOpen(false)}
          />
        </div>
      )}

      {/* Checkbox */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onUpdate(task.id, { isCompleted: !isCompleted });
        }}
        className={`flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full border transition-all duration-300 ${
          isCompleted 
            ? 'bg-emerald-500 border-emerald-500 text-white' 
            : 'border-slate-500 text-transparent group-hover:border-emerald-400'
        }`}
      >
        <Check size={12} strokeWidth={4} />
      </button>

      {/* Task Info */}
      <div className="flex-1 min-w-0">
        {path.length > 0 && (
          <div className="text-xs text-slate-500 truncate">
            {path.join(' / ')}
          </div>
        )}
        {isEditing ? (
          <div>
            <input
              ref={inputRef}
              type="text"
              value={task.text}
              onChange={(e) => onUpdate(task.id, { text: e.target.value })}
              onBlur={() => setIsEditing(false)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              className="bg-transparent text-slate-200 font-medium w-full outline-none border-b border-emerald-500/50"
              onClick={(e) => e.stopPropagation()}
            />
            {task.links && task.links.length > 0 && (
              <div className="flex flex-col gap-0.5 mt-1">
                {task.links.map((l, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <ExternalLink size={10} className="text-cyan-500 flex-shrink-0" />
                    <span className="text-[10px] text-cyan-500/70 truncate flex-1">{l.title !== l.url ? `${l.title} — ${l.url}` : l.url}</span>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const updated = task.links.filter((_, j) => j !== i);
                        onUpdate(task.id, { links: updated.length ? updated : null });
                      }}
                      className="text-slate-600 hover:text-rose-400 transition-colors flex-shrink-0"
                      title="Remove link"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p
            onClick={(e) => {
              if (e.target.tagName === 'A') return;
              e.stopPropagation();
              setIsEditing(true);
            }}
            className={`font-medium text-slate-200 cursor-text ${isCompleted ? 'line-through' : ''}`}
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
                      className="text-cyan-400 hover:text-cyan-300 hover:underline"
                    >
                      {seg.content}
                      <ExternalLink size={10} className="inline ml-0.5 mb-0.5" />
                    </a>
                  ) : (
                    <span key={i}>{seg.content}</span>
                  )
                );
              }
              return task.text || "Untitled Task";
            })()}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {isCompleted && (
          <button
            onClick={(e) => { e.stopPropagation(); onRequestDelete(task.id); }}
            className="p-2 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Clean up completed task"
          >
            <Sparkles size={16} />
          </button>
        )}
        {task.recurrence && <div className="flex items-center gap-1 text-cyan-500" title="Recurring"><Repeat size={14} /></div>}
        {task.scheduledDate && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded-md">
            <CalendarDays size={14} />
            <span>{task.scheduledDate}</span>
          </div>
        )}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={(e) => { e.stopPropagation(); setIsSchedulePickerOpen(o => !o); }}
            className="p-2 rounded-md text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
            title="Schedule Task"
          >
            <CalendarPlus size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIsRecurrenceEditorOpen(o => !o); }}
            className="p-2 rounded-md text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
            title="Set Recurrence"
          >
            <Repeat size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onAdd(task.id); }}
            className="p-2 rounded-md text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            title="Add Subtask"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRequestDelete(task.id); }}
            className="p-2 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Delete Task"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onStartFocus(task.id); }}
            className="p-2 rounded-md text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            title="Focus on this task"
          >
            <Play size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); if (onOpenNotes) onOpenNotes(task.id); }}
            className="relative p-2 rounded-md text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
            title="Notes"
          >
            <StickyNote size={16} />
            {task.notes && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskListItem;