import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  Check,
  CalendarDays,
  CalendarPlus,
  Repeat,
  Play,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import CustomDatePicker from './CustomDatePicker';
import RecurrenceEditor from './RecurrenceEditor';
import { getTodayDateString } from '../utils/dateUtils';

// --- Component: Task List Item (for List View) ---
const TaskListItem = ({ task, path, onUpdate, onStartFocus, onAdd, onRequestDelete, selectedDate }) => {
  const isCompleted = task.recurrence
    ? task.completedOccurrences?.includes(selectedDate)
    : task.isCompleted;

  const [isEditing, setIsEditing] = useState(false);
  const [isSchedulePickerOpen, setIsSchedulePickerOpen] = useState(false);
  const [isRecurrenceEditorOpen, setIsRecurrenceEditorOpen] = useState(false);
  const inputRef = useRef(null);
  const schedulePickerRef = useRef(null);
  const recurrenceEditorRef = useRef(null);

  const indentationStyle = {
    // 1rem base padding + 1.5rem for each level of nesting
    paddingLeft: `${1 + path.length * 1.5}rem` 
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

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
      data-task-id={task.id}
      className={`relative flex items-center gap-4 px-4 py-3 rounded-lg transition-colors group ${isCompleted ? 'opacity-50' : ''} hover:bg-slate-800/50`}
      style={indentationStyle}
    >
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
          <input
            ref={inputRef}
            type="text"
            value={task.text}
            onChange={(e) => onUpdate(task.id, { text: e.target.value })}
            onBlur={() => setIsEditing(false)}
            onKeyDown={handleKeyDown}
            className="bg-transparent text-slate-200 font-medium w-full outline-none border-b border-emerald-500/50"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p 
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
            className={`font-medium text-slate-200 truncate cursor-text ${isCompleted ? 'line-through' : ''}`}
          >
            {task.text || "Untitled Task"}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
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
        </div>
      </div>
    </div>
  );
};

export default TaskListItem;