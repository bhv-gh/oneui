import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import CustomDatePicker from './CustomDatePicker';
import RecurrenceEditor from './RecurrenceEditor';
import { getLinkedSegments } from '../utils/linkUtils';

const MobileTaskItem = ({ task, path, onUpdate, onStartFocus, onAdd, onRequestDelete, selectedDate, newlyAddedTaskId, onFocusHandled, onOpenNotes }) => {
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
    <div data-task-id={task.id} style={indentationStyle}>
      {/* Main row */}
      <div className={`flex items-center gap-3 px-3 py-3 min-h-[44px] ${isCompleted ? 'opacity-50' : ''}`}>
        {/* Checkbox — 44px tap target */}
        <button
          onClick={() => onUpdate(task.id, { isCompleted: !isCompleted })}
          className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all ${
            isCompleted
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-slate-500'
          }`}
          style={{ minWidth: 24, minHeight: 24, padding: 8, margin: -8 }}
        >
          {isCompleted && <Check size={14} strokeWidth={3} />}
        </button>

        {/* Task text */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={task.text}
              onChange={(e) => onUpdate(task.id, { text: e.target.value })}
              onBlur={() => setIsEditing(false)}
              onKeyDown={handleKeyDown}
              className="bg-transparent text-slate-200 text-sm w-full outline-none border-b border-emerald-500/50 py-1"
            />
          ) : (
            <p
              onClick={() => setIsEditing(true)}
              className={`text-sm text-slate-200 ${isCompleted ? 'line-through' : ''}`}
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
                        className="text-cyan-400"
                      >
                        {seg.content}
                        <ExternalLink size={10} className="inline ml-0.5 mb-0.5" />
                      </a>
                    ) : (
                      <span key={i}>{seg.content}</span>
                    )
                  );
                }
                return task.text || 'Untitled Task';
              })()}
            </p>
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {task.recurrence && <Repeat size={12} className="text-cyan-500" />}
          {task.notes && <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />}
          {task.scheduledDate && (
            <span className="text-[10px] text-slate-500">{task.scheduledDate.slice(5)}</span>
          )}
        </div>

        {/* More button — 44px tap target */}
        <button
          onClick={() => setActionsOpen(o => !o)}
          className="flex-shrink-0 p-2 -mr-2 text-slate-500 active:text-slate-300"
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
            className="p-2.5 rounded-lg text-slate-400 active:bg-slate-800"
            title="Schedule"
          >
            <CalendarPlus size={18} />
          </button>
          <button
            onClick={() => { setIsRecurrenceEditorOpen(o => !o); }}
            className="p-2.5 rounded-lg text-slate-400 active:bg-slate-800"
            title="Recurrence"
          >
            <Repeat size={18} />
          </button>
          <button
            onClick={() => { onAdd(task.id); setActionsOpen(false); }}
            className="p-2.5 rounded-lg text-slate-400 active:bg-slate-800"
            title="Add Subtask"
          >
            <Plus size={18} />
          </button>
          <button
            onClick={() => { onStartFocus(task.id); setActionsOpen(false); }}
            className="p-2.5 rounded-lg text-slate-400 active:bg-slate-800"
            title="Focus"
          >
            <Play size={18} />
          </button>
          <button
            onClick={() => { if (onOpenNotes) onOpenNotes(task.id); setActionsOpen(false); }}
            className="p-2.5 rounded-lg text-slate-400 active:bg-slate-800"
            title="Notes"
          >
            <StickyNote size={18} />
          </button>
          <button
            onClick={() => { onRequestDelete(task.id); setActionsOpen(false); }}
            className="p-2.5 rounded-lg text-rose-400/70 active:bg-slate-800"
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
        </div>
      )}

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
