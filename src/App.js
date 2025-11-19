import React, { useState, useEffect, useRef, useMemo } from 'react';
import './App.css';
import { 
  Plus, 
  Trash2, 
  Check, 
  ChevronDown, 
  ChevronUp,
  Maximize,
  Minimize,
  AlertTriangle,
  X,
  Settings2,
  ListPlus
} from 'lucide-react';
import { Play, Pause, TimerReset, BrainCircuit, Coffee, XCircle, CalendarDays, CalendarPlus, Save, Trash, Pencil, UploadCloud, DownloadCloud, Repeat, GitMerge, LayoutGrid } from 'lucide-react';
import Fuse from 'fuse.js';
import { DayPicker } from 'react-day-picker';
import { format, parseISO, isToday, addDays, addWeeks, addMonths, differenceInDays, differenceInCalendarWeeks, differenceInMonths } from 'date-fns';
import 'react-day-picker/dist/style.css'; // It's good practice to keep this for base styles

const POMODORO_TIME = 25 * 60;
const SHORT_BREAK_TIME = 5 * 60;
const LONG_BREAK_TIME = 15 * 60;

// --- Utility: ID Generator ---
const generateId = () => Math.random().toString(36).substr(2, 9);

// --- Component: Custom Styled Datalist Input ---
const CustomDatalistInput = ({ value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(value.toLowerCase())
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div className="relative w-1/3" ref={wrapperRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="w-full bg-slate-950/50 text-xs text-slate-400 border border-slate-800 rounded px-2 py-1 focus:border-emerald-500/50 focus:outline-none transition-colors"
      />
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-20 bg-slate-900 border border-slate-700 rounded-lg shadow-lg max-h-40 overflow-y-auto animate-in fade-in duration-100">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(option => (
              <button
                key={option}
                onClick={() => handleSelect(option)}
                className="w-full text-left text-xs px-3 py-1.5 text-slate-300 hover:bg-emerald-500/10"
              >
                {option}
              </button>
            ))
          ) : (
            <div className="text-xs text-slate-500 px-3 py-1.5 italic">
              No matching keys.
            </div>
          )}
           {/* Allow creating a new key if the input value is not in the options */}
           {value && !options.includes(value) && (
             <button
                onClick={() => handleSelect(value)}
                className="w-full text-left text-xs px-3 py-1.5 text-emerald-400 hover:bg-emerald-500/10 border-t border-slate-800"
              >
                Create new key: "{value}"
              </button>
           )}
        </div>
      )}
    </div>
  );
};

// --- Component: Pomodoro Timer ---
const PomodoroTimer = ({ 
  timeRemaining, 
  isTimerActive, 
  timerMode,
  onStartPause, 
  onReset,
  onSetMode
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const modeConfig = {
    pomodoro: { icon: BrainCircuit, label: 'Focus', time: POMODORO_TIME },
    shortBreak: { icon: Coffee, label: 'Short Break', time: SHORT_BREAK_TIME },
    longBreak: { icon: Coffee, label: 'Long Break', time: LONG_BREAK_TIME },
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-mono text-slate-400 hover:bg-white/10 rounded-lg"
      >
        <BrainCircuit size={16} className={isTimerActive && timerMode === 'pomodoro' ? 'text-emerald-400 animate-pulse' : ''} />
        {formatTime(timeRemaining)}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-60 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl p-4 animate-in fade-in duration-100">
          <div className="flex justify-around mb-4">
            {Object.entries(modeConfig).map(([mode, config]) => (
              <button 
                key={mode}
                onClick={() => onSetMode(mode)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${timerMode === mode ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:bg-slate-800'}`}
                title={config.label}
              >
                <config.icon size={20} />
                <span className="text-xs">{config.label}</span>
              </button>
            ))}
          </div>

          <div className="text-center mb-4">
            <p className="text-5xl font-mono font-bold text-slate-100">{formatTime(timeRemaining)}</p>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button 
              onClick={onReset}
              className="p-3 rounded-full text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              title="Reset Timer"
            >
              <TimerReset size={20} />
            </button>
            <button 
              onClick={onStartPause}
              className="w-24 h-12 flex items-center justify-center gap-2 rounded-full bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
            >
              {isTimerActive ? (
                <>
                  <Pause size={18} />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play size={18} />
                  <span>Start</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Component: Custom Date Picker ---
const CustomDatePicker = ({ selected, onSelect }) => {
  const today = new Date();
  const isTodaySelected = selected ? isToday(selected) : false;

  const handleSelectToday = () => {
    onSelect(today);
  };

  // Custom components for navigation arrows
  const CustomIconLeft = (props) => <ChevronDown {...props} className="h-4 w-4 rotate-90" />;
  const CustomIconRight = (props) => <ChevronDown {...props} className="h-4 w-4 -rotate-90" />;

  // Custom caption for month/year display
  const CustomCaption = (props) => {
    const { displayMonth } = props;
    return (
      <div className="text-sm font-medium text-slate-200">{displayMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
    );
  };

  return (
    <DayPicker
      mode="single" 
      selected={selected}
      onSelect={onSelect}
      showOutsideDays
      classNames={{
        root: 'bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl p-3 flex flex-col', // Added flex-col
        caption: 'flex justify-center items-center relative mb-2',
        caption_label: 'text-sm font-medium text-slate-200',
        nav: 'flex items-center',
        nav_button: 'h-7 w-7 flex items-center justify-center rounded-md hover:bg-slate-800 transition-colors',
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        table: 'w-full border-collapse',
        head_row: 'flex font-medium text-slate-400 text-xs',
        head_cell: 'w-8 h-8 flex items-center justify-center',
        row: 'flex w-full mt-2',
        cell: 'w-8 h-8 flex items-center justify-center',
        day: 'w-full h-full rounded-md text-sm text-slate-300 hover:bg-slate-800 transition-colors',
        // Apply a ring to today's date for visibility. It won't conflict with the selected background.
        day_today: 'ring-1 ring-emerald-500/50',
        // Ensure selected day style has high specificity
        day_selected: 'bg-emerald-500 text-white hover:bg-emerald-600',
        day_outside: 'text-slate-600 opacity-50',
        day_disabled: 'text-slate-700 opacity-50',
      }}
      components={{
        IconLeft: CustomIconLeft,
        IconRight: CustomIconRight,
        Caption: CustomCaption,
      }}
      footer={
        <div className="flex justify-center mt-3 pt-3 border-t border-slate-800">
          <button
            disabled={isTodaySelected}
            onClick={handleSelectToday}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              isTodaySelected 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >Jump to Today</button>
        </div>
      }
    />
  );
};

// --- Component: Search Overlay ---
const SearchOverlay = ({ query, resultCount, currentIndex }) => {
  if (!query) return null;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl px-4 py-2 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <span className="text-slate-400 text-sm">Search:</span>
      <span className="text-white font-medium">{query}</span>
      {resultCount > 0 && (
        <span className="text-xs bg-slate-700 text-slate-300 rounded-full px-2 py-0.5">{currentIndex + 1} of {resultCount}</span>
      )}
      {resultCount === 0 && <span className="text-xs text-slate-500">No results</span>}
    </div>
  );
};

// --- Component: Recurrence Editor ---
const RecurrenceEditor = ({ recurrence, onSave, onClose }) => {
  const [freq, setFreq] = useState(recurrence?.frequency || 'weekly');
  const [interval, setInterval] = useState(recurrence?.interval || 1);
  const [daysOfWeek, setDaysOfWeek] = useState(recurrence?.daysOfWeek || []);

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const handleDayToggle = (dayIndex) => {
    setDaysOfWeek(prev => 
      prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]
    );
  };

  const handleSave = () => {
    onSave({
      frequency: freq,
      interval: Math.max(1, interval), // Ensure interval is at least 1
      daysOfWeek: freq === 'weekly' ? daysOfWeek : undefined,
    });
    onClose();
  };

  const handleRemove = () => {
    onSave(null); // Pass null to remove recurrence
    onClose();
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-64 p-4 space-y-4">
      <div>
        <label className="text-xs text-slate-400">Frequency</label>
        <div className="flex bg-slate-800 rounded-md p-1 mt-1">
          {['daily', 'weekly', 'monthly'].map(f => (
            <button key={f} onClick={() => setFreq(f)} className={`flex-1 text-xs capitalize py-1 rounded ${freq === f ? 'bg-slate-600 text-white' : 'text-slate-300'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-400">Repeat Every</label>
        <div className="flex items-center gap-2 mt-1">
          <input 
            type="number"
            value={interval}
            onChange={(e) => setInterval(parseInt(e.target.value, 10))}
            className="w-16 bg-slate-800 rounded-md p-2 text-center text-sm"
            min="1"
          />
          <span className="text-sm text-slate-300">{freq === 'daily' ? 'day(s)' : freq === 'weekly' ? 'week(s)' : 'month(s)'}</span>
        </div>
      </div>

      {freq === 'weekly' && (
        <div>
          <label className="text-xs text-slate-400">Repeat On</label>
          <div className="flex justify-between gap-1 mt-2">
            {weekDays.map((day, index) => (
              <button 
                key={index}
                onClick={() => handleDayToggle(index)}
                className={`w-7 h-7 text-xs rounded-full transition-colors ${daysOfWeek.includes(index) ? 'bg-emerald-500 text-white' : 'bg-slate-800 hover:bg-slate-700'}`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-3 border-t border-slate-800">
        <button onClick={handleSave} className="w-full bg-emerald-600 text-white rounded-md py-2 text-sm font-semibold hover:bg-emerald-700">
          Save
        </button>
        {recurrence && (
          <button onClick={handleRemove} className="w-full text-slate-400 text-xs hover:text-rose-400">
            Remove Recurrence
          </button>
        )}
      </div>
    </div>
  );
};


// --- Component: Task Card (The actual node content) ---
const TaskCard = ({ node, onUpdate, onAdd, onRequestDelete, allFieldKeys, onStartFocus, focusedTaskId, isTimerActive, isSearching, isHighlighted, highlightedRef }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showFields, setShowFields] = useState(false);
  const inputRef = useRef(null);
  const [isSchedulePickerOpen, setIsSchedulePickerOpen] = useState(false);
  const [isRecurrenceEditorOpen, setIsRecurrenceEditorOpen] = useState(false);
  const schedulePickerRef = useRef(null);
  const recurrenceEditorRef = useRef(null);

  // Focus when created empty
  useEffect(() => {
    if (node.text === "" && isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [node.text, isEditing]);

  // Close schedule picker on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (schedulePickerRef.current && !schedulePickerRef.current.contains(event.target)) {
        setIsSchedulePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (recurrenceEditorRef.current && !recurrenceEditorRef.current.contains(event.target)) {
        setIsRecurrenceEditorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') setIsEditing(false);
  };

  // --- Field Handlers ---
  const handleAddField = () => {
    const newField = { id: generateId(), label: '', value: '' };
    const updatedFields = [...(node.fields || []), newField];
    onUpdate(node.id, { fields: updatedFields });
  };

  const handleUpdateField = (fieldId, key, newValue) => {
    const updatedFields = (node.fields || []).map(f => 
      f.id === fieldId ? { ...f, [key]: newValue } : f
    );
    onUpdate(node.id, { fields: updatedFields });
  };

  const handleDeleteField = (fieldId) => {
    const updatedFields = (node.fields || []).filter(f => f.id !== fieldId);
    onUpdate(node.id, { fields: updatedFields });
  };

  // Stats
  const totalChildren = node.children.length;
  const completedChildren = node.children.filter(c => c.isCompleted).length;
  const progress = totalChildren === 0 ? 0 : (completedChildren / totalChildren) * 100;
  const fieldsCount = node.fields ? node.fields.length : 0;

  const isCurrentlyRunningInFocus = focusedTaskId === node.id && isTimerActive;

  const hasPausedTimer = 
    node.timeRemaining !== undefined && 
    node.timeRemaining > 0 && 
    node.timeRemaining < (
      node.timerMode === 'shortBreak' ? SHORT_BREAK_TIME : node.timerMode === 'longBreak' ? LONG_BREAK_TIME : POMODORO_TIME
    );

  return (
    <div 
      ref={isHighlighted ? highlightedRef : null}
      data-task-id={node.id}
      className={`
        relative flex flex-col items-center w-72 transition-all duration-300 group z-10
        ${isSearching && !isHighlighted ? 'opacity-20 scale-95' : 'opacity-100 scale-100'}
        ${isHighlighted ? 'opacity-100' : ''}
        ${node.isCompleted && !isHighlighted ? 'opacity-70' : ''}

      `}
    >
      {/* The Card Box */}
      <div 
        className={`
          relative w-full bg-slate-900/90 backdrop-blur-md border rounded-2xl p-3 shadow-xl transition-all duration-300
          ${isHighlighted 
            ? 'border-cyan-400 shadow-[0_0_25px_rgba(56,189,248,0.4)]' 
            : hasPausedTimer && !isCurrentlyRunningInFocus 
              ? 'border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-border-pulse' 
              : (node.isCompleted ? 'border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-slate-700 hover:border-slate-500 hover:shadow-2xl hover:shadow-emerald-500/5')}
        `}
      >
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(node.id, { isCompleted: !node.isCompleted });
            }}
            className={`
              mt-1 flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full border transition-all duration-300
              ${node.isCompleted 
                ? 'bg-emerald-500 border-emerald-500 text-white' 
                : 'border-slate-500 text-transparent hover:border-emerald-400'}
            `}
          >
            <Check size={12} strokeWidth={4} />
          </button>

          {/* Indicator for currently running timer */}
          {isCurrentlyRunningInFocus && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
          )}

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={node.text}
                onChange={(e) => onUpdate(node.id, { text: e.target.value })}
                onBlur={() => setIsEditing(false)}
                onKeyDown={handleKeyDown}
                className="bg-transparent text-slate-200 text-sm w-full outline-none border-b border-emerald-500/50 pb-1"
                placeholder="Task name..."
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className={`
                  cursor-text text-sm font-medium break-words pb-1 min-h-[1.5rem]
                  ${node.text ? 'text-slate-200' : 'text-slate-500 italic'}
                  ${node.isCompleted ? 'line-through text-slate-500' : ''}
                `}
              >
                {node.text || "New Task"}
              </div>
            )}
          </div>
          
          {/* Fields Toggle */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowFields(!showFields);
            }}
            className={`
              p-1 rounded-md transition-colors flex-shrink-0
              ${showFields ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-600 hover:text-slate-300 hover:bg-slate-800'}
            `}
            title="Custom Fields"
          >
            <Settings2 size={14} />
          </button>
        </div>

        {/* Custom Fields Section */}
        {showFields && (
          <div className="mt-3 pt-3 border-t border-slate-800/60 space-y-2 animate-in slide-in-from-top-2 duration-200">
            <div className="space-y-1.5">
              {(node.fields || []).map((field) => (
                <div key={field.id} className="flex items-center gap-2 group/field">
                  <CustomDatalistInput
                    value={field.label}
                    onChange={(newValue) => handleUpdateField(field.id, 'label', newValue)}
                    options={allFieldKeys}
                    placeholder="Label"
                  />
                  <span className="text-slate-600 text-xs">:</span>
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => handleUpdateField(field.id, 'value', e.target.value)}
                    placeholder="Value"
                    className="flex-1 bg-slate-950/50 text-xs text-slate-200 border border-slate-800 rounded px-2 py-1 focus:border-emerald-500/50 focus:outline-none transition-colors"
                  />
                  <button
                    onClick={() => handleDeleteField(field.id)}
                    className="opacity-0 group-hover/field:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={handleAddField}
              className="w-full py-1 text-xs text-slate-500 hover:text-emerald-400 border border-dashed border-slate-800 hover:border-emerald-500/30 rounded flex items-center justify-center gap-1 transition-colors"
            >
              <ListPlus size={12} />
              <span>Add Field</span>
            </button>
          </div>
        )}
        
        {/* Collapsed Fields Preview (Only show when collapsed and fields exist) */}
        {!showFields && fieldsCount > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {node.fields.slice(0, 3).map(field => (
               <span key={field.id} className="text-[10px] px-1.5 py-0.5 bg-slate-800/50 text-slate-400 rounded border border-slate-800 truncate max-w-[100px]">
                 {field.label || 'Key'}: {field.value || 'Value'}
               </span>
            ))}
            {fieldsCount > 3 && <span className="text-[10px] text-slate-600">+{fieldsCount - 3}</span>}
          </div>
        )}

        {/* Scheduled Date Display */}
        {node.scheduledDate && (
          <div className="mt-2 text-xs flex items-center gap-1.5 text-slate-500"><CalendarDays size={12} /><span>{node.scheduledDate}</span></div>
        )}

        {/* Recurrence Info Display */}
        {node.recurrence && (
          <div className="mt-1 text-xs flex items-center gap-1.5 text-cyan-500"><Repeat size={12} /><span>Recurring</span></div>
        )}

        {/* Footer Actions & Info */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800">
          {/* Collapse Toggle */}
          {node.children.length > 0 && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(node.id, { isExpanded: !node.isExpanded });
              }}
              className="text-xs flex items-center gap-1 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 px-2 py-1 rounded-md transition-colors"
            >
              {node.isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              <span>{node.children.length}</span>
            </button>
          )}
          
          {/* Progress Bar (if no children, empty space) */}
          {node.children.length > 0 ? (
             <div className="flex-1 mx-3 h-1 bg-slate-800 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-emerald-500 transition-all duration-500" 
                 style={{ width: `${progress}%` }}
               />
             </div>
          ) : <div className="flex-1" />}

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdd(node.id);
              }}
              className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-colors"
              title="Add Subtask"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRequestDelete(node.id);
              }}
              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-md transition-colors"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
            <div className="relative" ref={schedulePickerRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setIsSchedulePickerOpen(!isSchedulePickerOpen); }}
                className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-md transition-colors"
                title="Schedule Task"
              >
                <CalendarPlus size={14} />
              </button>
              {isSchedulePickerOpen && (
                <div className="absolute bottom-full right-0 mb-2 z-30 animate-in fade-in duration-100">
                  <CustomDatePicker
                    selected={node.scheduledDate ? new Date(node.scheduledDate) : undefined}
                    onSelect={(date) => {
                      const newScheduledDate = date ? date.toISOString().split('T')[0] : null;
                      onUpdate(node.id, { scheduledDate: newScheduledDate });
                      setIsSchedulePickerOpen(false);
                    }}
                  />
                </div>
              )}
            </div>
            <div className="relative" ref={recurrenceEditorRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setIsRecurrenceEditorOpen(!isRecurrenceEditorOpen); }}
                className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-md transition-colors"
                title="Set Recurrence"
              >
                <Repeat size={14} />
              </button>
              {isRecurrenceEditorOpen && (
                <div className="absolute bottom-full right-0 mb-2 z-30 animate-in fade-in duration-100">
                  <RecurrenceEditor
                    recurrence={node.recurrence}
                    onSave={(newRecurrence) => onUpdate(node.id, { recurrence: newRecurrence })}
                    onClose={() => setIsRecurrenceEditorOpen(false)}
                  />
                </div>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartFocus(node.id);
              }}
              className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-colors"
              title="Focus on this task"
            >
              <Play size={14} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Vertical Connector from Card to Children Line */}
      {node.isExpanded && node.children.length > 0 && (
        <div className="w-px h-8 bg-slate-700"></div>
      )}
    </div>
  );
};

// --- Component: Recursive Tree Node ---
const TreeNode = ({ node, onUpdate, onAdd, onRequestDelete, allFieldKeys, onStartFocus, focusedTaskId, isTimerActive, isSearching, highlightedTaskId, highlightedRef }) => {
  const hasChildren = node.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      <TaskCard 
        node={node} 
        onUpdate={onUpdate} 
        onAdd={onAdd} 
        onRequestDelete={onRequestDelete}
        allFieldKeys={allFieldKeys}
        onStartFocus={onStartFocus}
        focusedTaskId={focusedTaskId}
        isTimerActive={isTimerActive}
        isSearching={isSearching}
        isHighlighted={node.id === highlightedTaskId}
        highlightedRef={highlightedRef}
      />
      
      {/* Children Container */}
      {node.isExpanded && hasChildren && (
        <div className="flex items-start pt-0 relative">
          {/* Horizontal Connector Line */}
          {node.children.length > 1 && (
            <div className="absolute top-0 left-0 right-0 h-px bg-slate-700 translate-y-0"></div>
          )}

          {node.children.map((child, index) => (
            <div key={child.id} className="flex flex-col items-center relative px-4">
              {/* 1. Vertical line going UP from child to the horizontal bar */}
              <div className="w-px h-8 bg-slate-700 mb-0"></div>
              
              {/* 2. Horizontal Connectors (The "Arms") */}
              {node.children.length > 1 && (
                <>
                  {/* Right arm (for all except last child) */}
                  {index !== node.children.length - 1 && (
                    <div className="absolute top-0 right-0 w-1/2 h-px bg-slate-700"></div>
                  )}
                  {/* Left arm (for all except first child) */}
                  {index !== 0 && (
                    <div className="absolute top-0 left-0 w-1/2 h-px bg-slate-700"></div>
                  )}
                </>
              )}

              <TreeNode 
                node={child} 
                onUpdate={onUpdate} 
                onAdd={onAdd} 
                onRequestDelete={onRequestDelete}
                allFieldKeys={allFieldKeys}
                onStartFocus={onStartFocus}
                focusedTaskId={focusedTaskId}
                isTimerActive={isTimerActive}
                isSearching={isSearching}
                highlightedTaskId={highlightedTaskId}
                highlightedRef={highlightedRef}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Component: Full Screen Focus View ---
const FocusView = ({ task, timerProps, onExit, appState }) => {
  if (!task) return null;

  const { 
    timeRemaining, 
    isTimerActive, 
    timerMode,
    onStartPause, 
    onReset,
    onSetMode
  } = timerProps;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const modeConfig = {
    pomodoro: { icon: BrainCircuit, label: 'Focus' },
    shortBreak: { icon: Coffee, label: 'Short Break' },
    longBreak: { icon: Coffee, label: 'Long Break' },
  };

  const backgroundClasses = {
    focusing: 'bg-slate-950', 
    break: 'bg-sky-950',      // Dark blue for break
    paused: 'bg-emerald-950',   
    idle: 'bg-emerald-950',     
  };

  return (
    <div className={`fixed inset-0 z-[200] flex flex-col items-center justify-center p-8 animate-in fade-in duration-300 transition-colors duration-1000 ${backgroundClasses[appState]}`}>
      <button onClick={onExit} className="absolute top-6 right-6 text-slate-600 hover:text-slate-300 transition-colors">
        <XCircle size={32} />
      </button>

      <div className="text-center">
        <p className="text-slate-500 text-lg mb-2">Focusing on:</p>
        <h1 className="text-4xl font-bold text-slate-100 mb-12 truncate max-w-2xl">{task.text || "Untitled Task"}</h1>

        <div className="flex justify-center gap-4 mb-8">
          {Object.entries(modeConfig).map(([mode, config]) => (
            <button 
              key={mode}
              onClick={() => onSetMode(mode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${timerMode === mode ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              {config.label}
            </button>
          ))}
        </div>

        <p className="text-9xl font-mono font-bold text-slate-100 mb-12">{formatTime(timeRemaining)}</p>

        <div className="flex items-center justify-center gap-6">
          <button onClick={onReset} className="p-4 rounded-full text-slate-400 hover:bg-slate-800 hover:text-white transition-colors" title="Reset Timer">
            <TimerReset size={24} />
          </button>
          <button 
            onClick={onStartPause}
            className="w-40 h-16 flex items-center justify-center gap-3 rounded-full bg-emerald-500 text-white text-xl font-semibold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
          >
            {isTimerActive ? <Pause size={24} /> : <Play size={24} />}
            <span>{isTimerActive ? 'Pause' : 'Start'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};


// --- Component: Delete Modal ---
const DeleteModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex items-center gap-3 text-rose-400 mb-4">
            <div className="bg-rose-400/10 p-3 rounded-full">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-semibold text-slate-100">Delete Task?</h3>
          </div>
          <p className="text-slate-400 mb-6">
            Are you sure you want to delete this task? This will also delete all subtasks in this branch.
          </p>
          <div className="flex gap-3 justify-end">
            <button 
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors font-medium"
            >
              Cancel
            </button>
            <button 
              onClick={onConfirm}
              className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20 transition-all font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Component: Settings Modal ---
const SettingsModal = ({ isOpen, onClose, onExport, onImport }) => {
  const importFileRef = useRef(null);

  if (!isOpen) return null;

  const handleImportClick = () => {
    importFileRef.current.click();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-slate-100">Settings</h3>
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-white rounded-full">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <button
            onClick={onExport}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            <DownloadCloud size={18} />
            <span>Export Data</span>
          </button>
          <button
            onClick={handleImportClick}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            <UploadCloud size={18} />
            <span>Import Data</span>
          </button>
          <input
            type="file"
            ref={importFileRef}
            className="hidden"
            accept=".json"
            onChange={onImport}
          />
        </div>
      </div>
    </div>
  );
};

// --- Component: Logs View ---
const LogsView = ({ logs, selectedDate, onAddManualLog, onEditLog, onDeleteLog, onUpdateLogTime, onInteractionChange }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i); // 0 to 23

  const snapTo15Minutes = (time) => {
    const msIn15Minutes = 15 * 60 * 1000;
    const msSinceEpoch = time.getTime();
    const roundedMs = Math.round(msSinceEpoch / msIn15Minutes) * msIn15Minutes;
    return new Date(roundedMs);
  };

  const dateForLogs = parseISO(selectedDate);
  const timelineRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [currentTimeTop, setCurrentTimeTop] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [interaction, setInteraction] = useState(null); // { type: 'move' | 'resize-top' | 'resize-bottom', logId: string, initialY: number, initialStartTime: Date, initialEndTime: Date }

  // This state will hold a temporary version of the log being dragged/resized for smooth UI feedback
  const [tempLog, setTempLog] = useState(null);

  const [dragStartTime, setDragStartTime] = useState(null);
  const [dragCurrentY, setDragCurrentY] = useState(null);
  const [processedLogs, setProcessedLogs] = useState([]);

  // Ensure dateForLogs is a valid Date object, falling back to today if invalid
  const validDateForLogs = isNaN(dateForLogs.getTime()) ? new Date() : dateForLogs;

  // Effect to calculate and update the current time indicator's position
  useEffect(() => {
    const calculateTop = () => {
      const now = new Date();
      const startOfDay = new Date(now).setHours(0, 0, 0, 0);
      const totalDayMilliseconds = 24 * 60 * 60 * 1000;
      const elapsedMilliseconds = now.getTime() - startOfDay;
      return (elapsedMilliseconds / totalDayMilliseconds) * 100;
    };

    setCurrentTimeTop(calculateTop());

    const interval = setInterval(() => {
      setCurrentTimeTop(calculateTop());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Effect to scroll the timeline to the current time on initial render
  useEffect(() => {
    if (scrollContainerRef.current && selectedDate === getTodayDateString()) {
      const container = scrollContainerRef.current;
      const scrollPosition = (currentTimeTop / 100) * container.scrollHeight;
      // Scroll to center the current time line in the viewport
      container.scrollTop = scrollPosition - (container.clientHeight / 2);
    }
  }, [currentTimeTop, selectedDate]); // Run when component mounts or date changes to today

  const getPositionAndHeight = (startTime, endTime) => {
    const startOfDay = new Date(startTime).setHours(0, 0, 0, 0);
    const totalDayMilliseconds = 24 * 60 * 60 * 1000;

    const startMilliseconds = startTime.getTime() - startOfDay;
    const endMilliseconds = endTime.getTime() - startOfDay;

    const top = (startMilliseconds / totalDayMilliseconds) * 100;
    const height = ((endMilliseconds - startMilliseconds) / totalDayMilliseconds) * 100;

    return { top: `${top}%`, height: `${height}%` };
  };

  // Helper to convert Y-coordinate to a Date object for the selected day
  const getTimeFromY = (yClient, timelineRect) => {
    const yRelative = yClient - timelineRect.top;
    const fractionOfDay = yRelative / timelineRect.height;
    const totalMillisecondsInDay = 24 * 60 * 60 * 1000;
    const timeMilliseconds = fractionOfDay * totalMillisecondsInDay;
    
    // Ensure dateForLogs is a valid date before using it.
    // Fallback to today if it's not, which prevents the error.
    const baseDate = (dateForLogs instanceof Date && !isNaN(dateForLogs)) ? dateForLogs : new Date();

    const finalDate = new Date(baseDate);
    finalDate.setHours(0, 0, 0, 0); // Start of the selected day
    finalDate.setTime(finalDate.getTime() + timeMilliseconds);
    return snapTo15Minutes(finalDate);
  };

  const handleTimelineMouseDown = (e) => {
    if (e.button !== 0 || !timelineRef.current) return; // Only left click
    const timelineRect = timelineRef.current.getBoundingClientRect();
    const time = getTimeFromY(e.clientY, timelineRect);
    setDragStartTime(time);
    setDragCurrentY(e.clientY);
    setIsDragging(true);
  };

  const handleTimelineMouseMove = (e) => {
    if (!isDragging) return;
    setDragCurrentY(e.clientY);
  };

  const handleTimelineMouseUp = (e) => {
    if (!isDragging || !timelineRef.current || !dragStartTime) return;
    setIsDragging(false);
    const timelineRect = timelineRef.current.getBoundingClientRect();
    const dragEndTime = getTimeFromY(e.clientY, timelineRect);

    // Ensure start time is before end time
    const finalStartTime = dragStartTime < dragEndTime ? dragStartTime : dragEndTime;
    const finalEndTime = dragStartTime < dragEndTime ? dragEndTime : dragStartTime;

    const durationMs = finalEndTime.getTime() - finalStartTime.getTime();

    if (durationMs > 5 * 60 * 1000) { // Only create log if duration > 5 mins
      onAddManualLog({ startTime: finalStartTime, endTime: finalEndTime });
    }
    setDragStartTime(null);
    setDragCurrentY(null);
  };

  // This effect will manage the user-select style during timeline interactions
  useEffect(() => {
    const isInteracting = isDragging || !!interaction;
    onInteractionChange(isInteracting);
    // The return function is a cleanup that runs when the component unmounts
    // or before the effect runs again.
    return () => {
      // Ensure we clean up the style if the component unmounts mid-drag
      onInteractionChange(false);
    };
  }, [isDragging, interaction, onInteractionChange]);

  // --- Interaction Handlers for Moving/Resizing Logs ---
  useEffect(() => {
    const handleInteractionMove = (e) => {
      if (!interaction || !timelineRef.current) return;

      const timelineRect = timelineRef.current.getBoundingClientRect();
      const deltaY = e.clientY - interaction.initialY;
      const totalDayMilliseconds = 24 * 60 * 60 * 1000;
      const timeDelta = (deltaY / timelineRect.height) * totalDayMilliseconds;

      let newStartTime = new Date(interaction.initialStartTime);
      let newEndTime = new Date(interaction.initialEndTime);

      if (interaction.type === 'move') {
        newStartTime.setTime(interaction.initialStartTime.getTime() + timeDelta);
        newEndTime.setTime(interaction.initialEndTime.getTime() + timeDelta);
      } else if (interaction.type === 'resize-top') {
        newStartTime.setTime(interaction.initialStartTime.getTime() + timeDelta);
        if (newStartTime >= newEndTime) newStartTime = new Date(newEndTime.getTime() - 1); // Prevent inverting
      } else if (interaction.type === 'resize-bottom') {
        newEndTime.setTime(interaction.initialEndTime.getTime() + timeDelta);
        if (newEndTime <= newStartTime) newEndTime = new Date(newStartTime.getTime() + 1); // Prevent inverting
      }

      // Snap the times during the drag for immediate visual feedback
      setTempLog({ ...tempLog, startTime: snapTo15Minutes(newStartTime), endTime: snapTo15Minutes(newEndTime) });
    };

    const handleInteractionEnd = () => {
      if (interaction && tempLog) {
        onUpdateLogTime(tempLog.id, tempLog.startTime, tempLog.endTime);
      }
      setInteraction(null);
      setTempLog(null);
    };

    if (interaction) {
      window.addEventListener('mousemove', handleInteractionMove);
      window.addEventListener('mouseup', handleInteractionEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleInteractionMove);
      window.removeEventListener('mouseup', handleInteractionEnd);
    };
  }, [interaction, tempLog, onUpdateLogTime]);

  const startInteraction = (e, log, type) => {
    e.stopPropagation(); // Prevent timeline drag from firing
    setInteraction({
      type,
      logId: log.id,
      initialY: e.clientY,
      initialStartTime: log.startTime,
      initialEndTime: log.endTime,
    });
    setTempLog(log); // Set the initial log for temporary updates
  };

  // This effect recalculates the layout of logs whenever the logs themselves or the selected date change.
  useEffect(() => {
    const dailyLogs = logs.filter(log => {
      const isValidLog = log.startTime instanceof Date && !isNaN(log.startTime) && log.endTime instanceof Date && !isNaN(log.endTime);
      if (!isValidLog) return false;
      return format(log.startTime, 'yyyy-MM-dd') === selectedDate;
    }).sort((a, b) => a.startTime - b.startTime);

    if (dailyLogs.length === 0) {
      setProcessedLogs([]);
      return;
    }

    // This algorithm determines how to stack overlapping logs side-by-side.
    const columns = [];
    const logsWithColumnData = [];

    dailyLogs.forEach(log => {
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        if (log.startTime >= columns[i]) {
          logsWithColumnData.push({ ...log, col: i });
          columns[i] = log.endTime;
          placed = true;
          break;
        }
      }
      if (!placed) {
        logsWithColumnData.push({ ...log, col: columns.length });
        columns.push(log.endTime);
      }
    });

    const finalProcessedLogs = logsWithColumnData.map(log => {
      const overlapping = logsWithColumnData.filter(otherLog =>
        log.id !== otherLog.id &&
        log.startTime < otherLog.endTime &&
        log.endTime > otherLog.startTime
      );

      const concurrentCols = overlapping.reduce((max, ol) => Math.max(max, ol.col), log.col) + 1;

      return {
        ...log,
        display: {
          width: `${100 / concurrentCols}%`,
          left: `${(log.col / concurrentCols) * 100}%`,
        }
      };
    });

    setProcessedLogs(finalProcessedLogs);
  }, [logs, selectedDate]);

  return (
    <div 
      ref={scrollContainerRef} // This ref is for scrolling to current time
      className="flex-1 h-0 px-8 md:px-12 pb-8 overflow-y-auto animate-in fade-in duration-300"
    >
      <h2 className="text-2xl font-bold text-slate-200 mb-6">
        Activity Log for {format(validDateForLogs, 'MMMM d, yyyy')}
      </h2>
      <div className="flex gap-4">
        {/* Timeline Axis */}
        <div className="flex flex-col text-xs text-slate-500">
          {hours.map(hour => (
            <div key={hour} className="h-24 flex-shrink-0 -translate-y-2">
              {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
            </div>
          ))}
        </div>

        {/* Timeline Grid */}
        <div 
          ref={timelineRef}
          className="relative flex-1 bg-slate-900/50 rounded-2xl"
          onMouseDown={handleTimelineMouseDown}
          onMouseMove={handleTimelineMouseMove}
          onMouseUp={handleTimelineMouseUp}
        >
          {/* Hour lines */}
          {hours.map(hour => (
            <div key={hour} className="h-24 border-t border-slate-800/80"></div>
          ))}

          {/* Current Time Indicator */}
          {selectedDate === getTodayDateString() && (
            <div 
              className="absolute w-full h-px bg-rose-400 z-10"
              style={{ top: `${currentTimeTop}%` }}
            >
              <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-rose-400 rounded-full border-2 border-slate-900"></div>
            </div>
          )}

          {/* Log Entries */}
          {processedLogs.map(log => {
            const currentLog = tempLog && tempLog.id === log.id ? tempLog : log;
            const { top, height } = getPositionAndHeight(currentLog.startTime, currentLog.endTime);
            const { width, left } = log.display;
            return (
              <div
                key={log.id}
                className="absolute px-1 transition-all duration-100"
                style={{ top, height, width, left }}
              >
                <div 
                  onMouseDown={(e) => startInteraction(e, log, 'move')}
                  className={`group relative h-full border-l-2 rounded-lg p-2 flex flex-col justify-center cursor-move ${log.taskId ? 'bg-emerald-500/10 border-emerald-400' : 'bg-blue-500/10 border-blue-400'}`}
                >
                  {/* Resize Handles */}
                  <div onMouseDown={(e) => startInteraction(e, log, 'resize-top')} className="absolute -top-1 left-0 w-full h-2 cursor-row-resize" />
                  <div onMouseDown={(e) => startInteraction(e, log, 'resize-bottom')} className="absolute -bottom-1 left-0 w-full h-2 cursor-row-resize" />

                  <p className={`text-sm font-medium truncate ${log.taskId ? 'text-emerald-300' : 'text-blue-300'}`}>{log.taskText}</p>
                  <p className={`text-xs ${log.taskId ? 'text-emerald-500' : 'text-blue-500'}`}>
                    {format(currentLog.startTime, 'h:mm a')} - {format(currentLog.endTime, 'h:mm a')}
                  </p>
                  {/* Hover controls for Edit/Delete */}
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onEditLog(log)} 
                      className="p-1 rounded bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white"
                      title="Edit Log"
                    >
                      <Pencil size={12} />
                    </button>
                    <button 
                      onClick={() => onDeleteLog(log.id)} 
                      className="p-1 rounded bg-slate-800/50 text-rose-400/70 hover:bg-rose-500/50 hover:text-white"
                      title="Delete Log"
                    >
                      <Trash size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Manual Selection Box */}
          {isDragging && dragStartTime && dragCurrentY !== null && (() => {
            const timelineRect = timelineRef.current.getBoundingClientRect();
            const currentDragTime = getTimeFromY(dragCurrentY, timelineRect);
            const start = dragStartTime < currentDragTime ? dragStartTime : currentDragTime;
            const end = dragStartTime < currentDragTime ? currentDragTime : dragStartTime;
            const { top, height } = getPositionAndHeight(start, end);
            return (
              <div 
                className="absolute w-full bg-blue-500/30 rounded-r-lg pointer-events-none" 
                style={{ top, height }}
              ></div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

// --- Component: Task List Item (for List View) ---
const TaskListItem = ({ task, path, onUpdate, onStartFocus, onAdd }) => {
  const isCompleted = task.isCompleted && !task.recurrence;
  const indentationStyle = {
    // 1rem base padding + 1.5rem for each level of nesting
    paddingLeft: `${1 + path.length * 1.5}rem` 
  };

  return (
    <div 
      className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-colors group ${isCompleted ? 'opacity-50' : ''} hover:bg-slate-800/50`}
      style={indentationStyle}
    >
      {/* Checkbox */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onUpdate(task.id, { isCompleted: !task.isCompleted });
        }}
        className={`flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full border transition-all duration-300 ${
          task.isCompleted 
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
        <p className={`font-medium text-slate-200 truncate ${isCompleted ? 'line-through' : ''}`}>
          {task.text || "Untitled Task"}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {task.recurrence && <Repeat size={14} className="text-cyan-500" />}
        {task.scheduledDate && <CalendarDays size={14} className="text-slate-500" />}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onAdd(task.id); }}
            className="p-2 rounded-md text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            title="Add Subtask"
          >
            <Plus size={16} />
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

// --- Component: List View ---
const ListView = ({ tasks, onUpdate, onStartFocus, onAdd }) => {
  const flattenedTasks = useMemo(() => {
    const flatten = (nodes, path = []) => {
      let list = [];
      for (const node of nodes) {
        // We only want to display leaf nodes or tasks that are relevant themselves
        // For simplicity in list view, let's show all nodes.
        list.push({ task: node, path });
        if (node.children) {
          list = list.concat(flatten(node.children, [...path, node.text || "Untitled"]));
        }
      }
      return list;
    };
    return flatten(tasks);
  }, [tasks]);

  if (flattenedTasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-600">
        No tasks for this view.
      </div>
    );
  }

  return (
    <div className="p-8 animate-in fade-in duration-300">
      <div className="max-w-4xl mx-auto space-y-1">
        {flattenedTasks.map(({ task, path }) => (
          <TaskListItem 
            key={task.id}
            task={task}
            path={path}
            onUpdate={onUpdate}
            onStartFocus={onStartFocus}
            onAdd={onAdd}
          />
        ))}
      </div>
    </div>
  );
};


const getTodayDateString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0]; // YYYY-MM-DD format
};

const isDateAnOccurrence = (task, targetDateStr) => {
  if (!task.recurrence || !task.scheduledDate) return false;

  const { frequency, interval, daysOfWeek } = task.recurrence;
  const startDate = parseISO(task.scheduledDate);
  const targetDate = parseISO(targetDateStr);

  if (targetDate < startDate) return false;

  switch (frequency) {
    case 'daily': {
      const diff = differenceInDays(targetDate, startDate);
      return diff >= 0 && diff % interval === 0;
    }
    case 'weekly': {
      if (!daysOfWeek || !daysOfWeek.includes(targetDate.getDay())) {
        return false;
      }
      // Check if the week difference is a multiple of the interval
      const diffWeeks = differenceInCalendarWeeks(targetDate, startDate, { weekStartsOn: 1 }); // Assuming Monday start
      return diffWeeks >= 0 && diffWeeks % interval === 0;
    }
    case 'monthly': {
      if (targetDate.getDate() !== startDate.getDate()) {
        return false; // Must be same day of the month
      }
      const diffMonths = differenceInMonths(targetDate, startDate);
      return diffMonths >= 0 && diffMonths % interval === 0;
    }
    default:
      return false;
  }
};

const calculateNextOccurrence = (task) => {
  if (!task.recurrence || !task.scheduledDate) return null;

  const { frequency, interval, daysOfWeek } = task.recurrence;
  const currentScheduledDate = parseISO(task.scheduledDate);

  switch (frequency) {
    case 'daily':
      return addDays(currentScheduledDate, interval);
    case 'weekly': {
      if (!daysOfWeek || daysOfWeek.length === 0) return addWeeks(currentScheduledDate, interval);
      
      let nextDate = new Date(currentScheduledDate);
      const sortedDays = [...daysOfWeek].sort();
      
      // Find the next valid day in the current week
      for (let i = 0; i < 7; i++) {
        nextDate = addDays(currentScheduledDate, i + 1);
        if (sortedDays.includes(nextDate.getDay())) {
          return nextDate;
        }
      }
      // If no valid day in the current week, jump to the first valid day of the next interval week
      nextDate = addWeeks(currentScheduledDate, interval);
      while (!sortedDays.includes(nextDate.getDay())) {
        nextDate = addDays(nextDate, 1);
      }
      return nextDate;
    }
    case 'monthly':
      return addMonths(currentScheduledDate, interval);
    default:
      return null;
  }
};

// --- Main App Component ---
export default function TaskTreeApp() {
  const initialData = [
    {
      id: 'root-welcome',
      text: 'Welcome to Flow!',
      isCompleted: false,
      isExpanded: true,
      fields: [],
      children: [
        {
          id: 'sub-1',
          text: 'Click on me to edit',
          isCompleted: false,
          isExpanded: false,
          children: []
        },
      ]
    }
  ];

  const [treeData, setTreeData] = useState(() => {
    try {
      const savedJSON = localStorage.getItem('taskTreeGraphDataV2');
      if (!savedJSON) {
        // No saved data, return the fresh initial data.
        return initialData;
      }

      const savedData = JSON.parse(savedJSON);

      // Create a set of existing root IDs from saved data for quick lookup.
      const savedRootIds = new Set(savedData.map(node => node.id));

      // Find which root nodes from initialData are new to the user.
      const newNodesToAdd = initialData.filter(node => !savedRootIds.has(node.id));

      // Return the user's saved data merged with any new template nodes.
      return [...savedData, ...newNodesToAdd];
    } catch (e) {
      console.error("Failed to load or merge data from localStorage:", e);
      return initialData;
    }
  });

  const [scale, setScale] = useState(1);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString);
  const [activeTab, setActiveTab] = useState('today'); // 'today' or 'logs'
  // Global timer state is removed
  const [focusedTaskId, setFocusedTaskId] = useState(null);
  const [timerMode, setTimerMode] = useState('pomodoro'); // 'pomodoro', 'shortBreak', 'longBreak'
  const [timeRemaining, setTimeRemaining] = useState(POMODORO_TIME);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [logs, setLogs] = useState(() => {
    try {
      const savedLogsJSON = localStorage.getItem('flowAppLogsV1');
      if (savedLogsJSON) {
        const parsedLogs = JSON.parse(savedLogsJSON);
        // Revive Date objects from ISO strings stored in JSON
        return parsedLogs.map(log => ({
          ...log,
          startTime: new Date(log.startTime),
          endTime: new Date(log.endTime)
        }));
      }
    } catch (e) {
      console.error("Failed to load logs from localStorage:", e);
    }
    return []; // Return empty array if nothing is saved or an error occurs
  });
  const [activeSession, setActiveSession] = useState(null); // { taskId: string, startTime: Date }
  const [manualLogModal, setManualLogModal] = useState(null); // { startTime, endTime } or { logToEdit }

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTimelineInteracting, setIsTimelineInteracting] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [highlightedTaskId, setHighlightedTaskId] = useState(null);
  const [searchIndex, setSearchIndex] = useState(0);

  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('flowAppViewMode') || 'tree';
  });

  const highlightedNodeRef = useRef(null);
  const datePickerRef = useRef(null);

  const findNodeRecursive = (nodes, id) => {
    if (!nodes) return null;
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeRecursive(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };
  
  // Logic helpers
  const updateNodeRecursive = (nodes, id, updates) => {
    return nodes.map(node => {
      if (node.id === id) return { ...node, ...updates };
      if (node.children.length > 0) return { ...node, children: updateNodeRecursive(node.children, id, updates) };
      return node;
    });
  };

  const addNodeRecursive = (nodes, parentId) => {
    return nodes.map(node => {
      if (node.id === parentId) { // Found the parent node
        const newNode = {
          id: generateId(),
          text: '',
          isCompleted: false,
          isExpanded: true,
          fields: [],
          children: [],
          // Inherit scheduled date from parent if it exists
          scheduledDate: node.scheduledDate || null 
        };
        // If we are on a future date view, ensure the new subtask is also scheduled for that day
        if (selectedDate > getTodayDateString() && !newNode.scheduledDate) {
          newNode.scheduledDate = selectedDate;
        }
        return { ...node, isExpanded: true, children: [...node.children, newNode] };
      }
      if (node.children.length > 0) return { ...node, children: addNodeRecursive(node.children, parentId) };
      return node;
    });
  };

  const deleteNodeRecursive = (nodes, id) => {
    return nodes
      .filter(node => node.id !== id)
      .map(node => ({ ...node, children: deleteNodeRecursive(node.children, id) }));
  };

  // Core actions
  const handleUpdate = (id, updates) => {
    let newUpdates = { ...updates };
    if (newUpdates.isCompleted === true) {
      const task = findNodeRecursive(treeData, id);
      if (task?.recurrence) {
        const nextDate = calculateNextOccurrence(task);
        newUpdates = { ...newUpdates, isCompleted: false, scheduledDate: nextDate ? format(nextDate, 'yyyy-MM-dd') : null };
        // Optionally, you could create a separate, completed instance here for logging.
        // For now, we just advance the date.
      }
      newUpdates.completionDate = getTodayDateString();
    }
    setTreeData(prev => updateNodeRecursive(prev, id, newUpdates));
  };
  const handleAddSubtask = (parentId) => setTreeData(prev => addNodeRecursive(prev, parentId));

  const handleUpdateField = (nodeId, fieldId, key, newValue) => {
    setTreeData(prevTreeData => {
      const targetNode = findNodeRecursive(prevTreeData, nodeId);
      if (!targetNode) return prevTreeData; // If node not found, return previous state
      const updatedFields = (targetNode.fields || []).map(f => f.id === fieldId ? { ...f, [key]: newValue } : f);
      // Use updateNodeRecursive to apply changes to the correct node in the tree
      return updateNodeRecursive(prevTreeData, nodeId, { fields: updatedFields });
    });
  };

  const handleAddField = (nodeId, newFieldData) => {
    setTreeData(prevTreeData => {
      const newField = { id: generateId(), ...newFieldData };
      const targetNode = findNodeRecursive(prevTreeData, nodeId);
      if (!targetNode) return prevTreeData; // If node not found, return previous state
      const updatedFields = [...(targetNode.fields || []), newField];
      // Use updateNodeRecursive to apply changes to the correct node in the tree
      return updateNodeRecursive(prevTreeData, nodeId, { fields: updatedFields });
    });
  };

  const filterTreeByCompletionDate = (nodes, date) => {
    return nodes.map(node => {
      const children = node.children ? filterTreeByCompletionDate(node.children, date) : [];
      const hasCompletedChildren = children.some(c => c !== null);

      if (node.completionDate === date || hasCompletedChildren) {
        return { ...node, children, isExpanded: hasCompletedChildren };
      }
      return null;
    }).filter(node => node !== null);
  };

  const filterTreeByScheduledDate = (nodes, date) => {
    return nodes.map(node => {
      const children = node.children ? filterTreeByScheduledDate(node.children, date) : [];
      const hasScheduledChildren = children.some(c => c !== null);

      if ((node.scheduledDate === date || isDateAnOccurrence(node, date)) || hasScheduledChildren) {
        return { ...node, children, isExpanded: hasScheduledChildren };
      }
      return null;
    }).filter(node => node !== null);
  };

  const filterForTodayView = (nodes, today) => {
    return nodes.map(node => {
      // For recurring tasks, if they are completed, we treat them as not completed for display purposes
      // because they will just advance to the next date.
      const isVisiblyCompleted = node.isCompleted && !node.recurrence;

      const visibleChildren = node.children ? filterForTodayView(node.children, today) : [];

      // A task is relevant for today if it's not completed AND its scheduled date is not in the future.
      const isTaskRelevant = !node.isCompleted && (!node.scheduledDate || node.scheduledDate <= today);

      // Keep the node if it's relevant itself, or if it's a parent to any relevant children.
      if (isTaskRelevant || visibleChildren.length > 0) {
        if (isVisiblyCompleted) return null; // Hide tasks that are truly completed.
        return { ...node, children: visibleChildren, isExpanded: isTaskRelevant ? node.isExpanded : true };
      }

      return null;
    }).filter(node => node !== null);
  };

  const displayedTreeData = useMemo(() => {
    const today = getTodayDateString();
    if (selectedDate < today) return filterTreeByCompletionDate(treeData, selectedDate);
    if (selectedDate > today) return filterTreeByScheduledDate(treeData, selectedDate);
    // For today, show relevant tasks (not completed and not scheduled for the future).
    return filterForTodayView(treeData, today);
  }, [treeData, selectedDate]);

  const focusedTask = useMemo(() => {
    if (!focusedTaskId) return null;
    return findNodeRecursive(treeData, focusedTaskId);
  }, [treeData, focusedTaskId]);

  const allFieldKeys = useMemo(() => {
    const keys = new Set();
    const collectKeys = (nodes) => {
      for (const node of nodes) {
        if (node.fields) {
          for (const field of node.fields) {
            if (field.label) {
              keys.add(field.label);
            }
          }
        }
        if (node.children && node.children.length > 0) {
          collectKeys(node.children);
        }
      }
    };
    collectKeys(treeData);
    return Array.from(keys);
  }, [treeData]);

  useEffect(() => {
    localStorage.setItem('taskTreeGraphDataV2', JSON.stringify(treeData));
  }, [treeData]);

  useEffect(() => {
    try {
      localStorage.setItem('flowAppLogsV1', JSON.stringify(logs));
    } catch (e) {
      console.error("Failed to save logs to localStorage:", e);
    }
  }, [logs]);

  // Close date picker on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // SINGLE, CENTRALIZED effect to disable text selection during ANY drag operation.
  useEffect(() => {
    // isDragging is for canvas pan, isTimelineInteracting is for any drag on the Logs tab.
    const isAnyDragActive = isDragging || isTimelineInteracting;
    if (isAnyDragActive) {
      document.body.classList.add('user-select-none');
    } else {
      document.body.classList.remove('user-select-none');
    }
    return () => {
      document.body.classList.remove('user-select-none');
    };
  }, [isDragging, isTimelineInteracting]);

  // --- Import/Export Logic ---
  const handleExport = () => {
    try {
      const stateToExport = {
        treeData: treeData,
        logs: logs,
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stateToExport, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `flow-backup-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode); // required for firefox
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
      e.target.value = null; // Reset file input
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedState = JSON.parse(event.target.result);
        if (importedState.treeData && Array.isArray(importedState.logs)) {
          setTreeData(importedState.treeData);
          // Revive date objects from strings
          const revivedLogs = importedState.logs.map(log => ({
            ...log,
            startTime: new Date(log.startTime),
            endTime: new Date(log.endTime)
          }));
          setLogs(revivedLogs);
          alert("Data imported successfully!");
        } else {
          alert("Import failed: Invalid file format.");
        }
      } catch (error) {
        console.error("Import failed:", error);
        alert("Import failed: Could not parse the file.");
      } finally {
        e.target.value = null; // Reset file input
      }
    };
    reader.readAsText(file);
  };

  // --- Search Logic ---
  const flattenedTree = useMemo(() => {
    const list = [];
    const traverse = (nodes) => {
      nodes.forEach(node => {
        list.push({ id: node.id, text: node.text });
        if (node.children) traverse(node.children);
      });
    };
    traverse(displayedTreeData); // Search only within the VISIBLE tasks
    return list;
  }, [displayedTreeData]);

  const fuse = useMemo(() => new Fuse(flattenedTree, {
    keys: ['text'],
    includeScore: true,
    threshold: 0.4,
  }), [flattenedTree]); // Re-create fuse instance when visible tasks change

  // This effect runs when the query changes to update the search results.
  useEffect(() => {
    if (searchQuery) {
      const results = fuse.search(searchQuery);
      setSearchResults(results);
      setSearchIndex(0); // Reset to the first result whenever the query changes
    } else {
      setSearchResults([]);
      setHighlightedTaskId(null);
    }
  }, [searchQuery, fuse]);

  // This effect runs when the highlighted node is rendered to the DOM, and it handles centering.
  useEffect(() => {
    if (highlightedNodeRef.current) {
      const canvas = document.querySelector('[data-canvas-area]');
      const nodeElement = highlightedNodeRef.current;
      const canvasRect = canvas.getBoundingClientRect();
      const nodeRect = nodeElement.getBoundingClientRect();
      
      const targetX = (canvasRect.width / 2) - (nodeRect.width / 2) - (nodeRect.left - canvasRect.left);
      const targetY = (canvasRect.height / 2) - (nodeRect.height / 2) - (nodeRect.top - canvasRect.top);

      setPan(prevPan => ({
        x: prevPan.x + targetX / scale,
        y: prevPan.y + targetY / scale,
      }));
    }
  }, [highlightedTaskId, scale]); // Run only when the highlighted task ID changes

  useEffect(() => {
    setHighlightedTaskId(searchResults.length > 0 ? searchResults[searchIndex]?.item.id : null);
  }, [searchIndex, searchResults]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't interfere with text inputs
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

      // Handle cycling through search results
      if (searchResults.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSearchIndex(prevIndex => (prevIndex + 1) % searchResults.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSearchIndex(prevIndex => (prevIndex - 1 + searchResults.length) % searchResults.length);
          return;
        }
      }

      // Handle search query modifications
      if (e.key === 'Backspace') setSearchQuery(q => q.slice(0, -1));
      else if (e.key === 'Escape') setSearchQuery('');
      else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) setSearchQuery(q => q + e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // Dependencies are needed so the handler has the latest searchResults and searchIndex
  }, [searchResults, searchIndex]);

  // --- Timer Logic ---
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
  }, [isTimerActive, timeRemaining, timerMode, pomodoroCount, focusedTask]);

  useEffect(() => {
    // This effect runs when timerMode changes (e.g., user clicks Short Break button)
    // It should reset the time for that mode, but not affect the active state.
    const timeMap = { pomodoro: POMODORO_TIME, shortBreak: SHORT_BREAK_TIME, longBreak: LONG_BREAK_TIME };
    setTimeRemaining(timeMap[timerMode]);
    // We explicitly do NOT set setIsTimerActive(false) here.
    // The active state is controlled by user interaction with Start/Pause.
  }, [timerMode]);



  const handleTimerStartPause = () => {
    const newIsTimerActive = !isTimerActive;

    if (newIsTimerActive && focusedTask) {
      // STARTING a session
      setActiveSession({ taskId: focusedTask.id, startTime: new Date() });
    } else if (!newIsTimerActive && activeSession) {
      // PAUSING a session, create a log
      const endTime = new Date();
      const newLog = {
        id: generateId(),
        taskId: activeSession.taskId,
        taskText: findNodeRecursive(treeData, activeSession.taskId)?.text || 'Untitled Task',
        startTime: activeSession.startTime,
        endTime: endTime,
      };
      // Only create log if it's longer than 5 minutes
      if (endTime.getTime() - activeSession.startTime.getTime() > 5 * 60 * 1000) {
        setLogs(prevLogs => [...prevLogs, newLog]);
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
    // Also save the reset state to the task
    if (focusedTask) {
      handleUpdate(focusedTask.id, { timeRemaining: timeMap[timerMode], timerMode, isTimerActive: false });
    }
  };


  const handleStartFocus = (taskId) => {
    setFocusedTaskId(taskId);
    const task = findNodeRecursive(treeData, taskId);
    // When focusing, load the task's saved timer state
    if (task) {
      setTimerMode(task.timerMode || 'pomodoro');
      setTimeRemaining(task.timeRemaining !== undefined ? task.timeRemaining : POMODORO_TIME);
      // Always start in a paused state when focusing, regardless of previous active state
      setIsTimerActive(false); 
    } else {
      // If task not found or new, initialize default timer state
      setTimerMode('pomodoro');
      setTimeRemaining(POMODORO_TIME);
      setIsTimerActive(false);
    }
  };

  const handleExitFocus = () => {
    if (focusedTask) {
      // If a session was active when exiting, log it and save the task state as paused.
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
          setLogs(prevLogs => [...prevLogs, newLog]);
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

  const handleRequestDelete = (id) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = () => {
    if (deleteTargetId) {
      setTreeData(prev => deleteNodeRecursive(prev, deleteTargetId));
      setDeleteTargetId(null);
    }
  };

  const handleAddRoot = () => {
    const newRootTask = {
      id: generateId(),
      text: 'New Project',
      isCompleted: false,
      isExpanded: true,
      fields: [],
      children: []
    };
    // If viewing a future date, schedule the new task for that day
    if (selectedDate > getTodayDateString()) {
      newRootTask.scheduledDate = selectedDate;
    }
    setTreeData(prev => [...prev, newRootTask]);
  };

  const handleSaveLog = (logData) => {
    if (logData.id) {
      // Editing an existing log
      setLogs(prevLogs => prevLogs.map(log => log.id === logData.id ? { ...log, taskText: logData.text } : log));
    } else {
      // Creating a new manual log
      const newLog = {
        id: generateId(),
        taskId: null, // Manual logs don't have a task ID
        taskText: logData.text,
        startTime: logData.startTime,
        endTime: logData.endTime,
      };
      setLogs(prevLogs => [...prevLogs, newLog].sort((a, b) => a.startTime - b.startTime));
    }
    setManualLogModal(null);
  };

  const handleDeleteLog = (logId) => {
    setLogs(prevLogs => prevLogs.filter(log => log.id !== logId));
  };


  const handleUpdateLogTime = (logId, newStartTime, newEndTime) => {
    setLogs(prevLogs => prevLogs.map(log => log.id === logId ? { ...log, startTime: newStartTime, endTime: newEndTime } : log).sort((a, b) => a.startTime - b.startTime));
  };


  // --- Panning Handlers ---
  const handleMouseDown = (e) => {
    // Prevent dragging on interactive elements
    if (e.target.closest('button, input, .cursor-text')) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx / scale,
      y: dragStartRef.current.panY + dy / scale,
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // This effect will manage the user-select style during canvas panning
  useEffect(() => {
    if (isDragging) {
      document.body.classList.add('user-select-none');
    } else {
      document.body.classList.remove('user-select-none');
    }
    return () => {
      document.body.classList.remove('user-select-none');
    };
  }, [isDragging]);

  // Determine the current app state for dynamic background
  let appState = 'idle';
  if (focusedTask) {
    if (isTimerActive) {
      appState = timerMode === 'pomodoro' ? 'focusing' : 'break';
    } else {
      // If a task is focused but the timer isn't active, it's 'paused'.
      appState = 'paused';
    }
  }

  const backgroundClasses = {
    idle: 'bg-slate-900',
    focusing: 'bg-emerald-950',
    break: 'bg-sky-950',
    paused: 'bg-slate-950',
  };

  if (focusedTask) {
    return <FocusView task={focusedTask} timerProps={timerProps} onExit={handleExitFocus} appState={appState} />;
  }

  // Check if the modal should be open and if its date values are valid.
  const isModalReady = manualLogModal && (
    (manualLogModal.startTime && manualLogModal.endTime) || manualLogModal.logToEdit
  );

  if (isModalReady) {
    const isEditing = !!manualLogModal.logToEdit;
    const startTime = isEditing ? manualLogModal.logToEdit.startTime : manualLogModal.startTime;
    const endTime = isEditing ? manualLogModal.logToEdit.endTime : manualLogModal.endTime;
    const initialText = isEditing ? manualLogModal.logToEdit.taskText : '';

    return (
      <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
          <h3 className="text-lg font-semibold text-slate-100 mb-2">{isEditing ? 'Edit Log Entry' : 'Add Manual Log Entry'}</h3>
          <p className="text-sm text-slate-400 mb-4">
            For {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
          </p>
          <form onSubmit={(e) => {
            e.preventDefault();
            const text = e.target.elements.description.value;
            if (text) {
              handleSaveLog({
                id: isEditing ? manualLogModal.logToEdit.id : null,
                text,
                startTime,
                endTime,
              });
            }
          }}>
            <input
              name="description"
              type="text"
              autoFocus
              defaultValue={initialText}
              placeholder="What were you working on?"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setManualLogModal(null)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
                <Save size={16} /> Save Log
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const isSearching = searchQuery.length > 0;

  return (
    <div className={`h-screen w-screen text-slate-200 font-sans overflow-hidden flex flex-col transition-colors duration-1000 ${backgroundClasses[appState]}`}>
      {/* Delete Modal */}
      <DeleteModal 
        isOpen={!!deleteTargetId} 
        onClose={() => setDeleteTargetId(null)} 
        onConfirm={confirmDelete} 
      />

      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-6 z-50 pointer-events-none flex justify-between items-start bg-gradient-to-b from-slate-950 to-transparent">
        <div className="flex items-center gap-6 pointer-events-auto">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Flow
            </h1>
          </div>
          <div className="flex gap-1 rounded-lg bg-slate-900/80 p-1 border border-slate-800 backdrop-blur-sm">
            <button onClick={() => setActiveTab('today')} className={`px-4 py-1.5 text-sm rounded-md transition-colors ${activeTab === 'today' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Today</button>
            <button onClick={() => setActiveTab('logs')} className={`px-4 py-1.5 text-sm rounded-md transition-colors ${activeTab === 'logs' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Logs</button>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-lg text-slate-400 hover:bg-white/10"
          >
            <Settings2 size={18} />
          </button>
        </div>

        {activeTab === 'today' && (
          <div className="flex items-center gap-1 rounded-lg bg-slate-900/80 p-1 border border-slate-800 backdrop-blur-sm pointer-events-auto">
            <button onClick={() => setViewMode('tree')} className={`p-2 rounded-md transition-colors ${viewMode === 'tree' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`} title="Tree View">
              <GitMerge size={18} />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`} title="List View">
              <LayoutGrid size={18} />
            </button>
          </div>
        )}

        <div className="pointer-events-auto flex gap-2 bg-slate-900/90 backdrop-blur p-2 rounded-xl border border-slate-800">
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-2 hover:bg-white/10 rounded-lg"><Minimize size={18} /></button>
          <span className="flex items-center px-2 text-sm font-mono text-slate-400">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-2 hover:bg-white/10 rounded-lg"><Maximize size={18} /></button>
          <div className="relative" ref={datePickerRef}>
            <button 
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
              className="flex items-center gap-2 cursor-pointer rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/10 transition-colors"
            >
              <CalendarDays size={16} />
              <span>{selectedDate === getTodayDateString() ? 'Today' : selectedDate}</span>
            </button>
            {isDatePickerOpen && (
              <div className="absolute top-full right-0 mt-2 z-30 animate-in fade-in duration-100">
                <CustomDatePicker 
                  // The replace() trick ensures the date string is parsed in the local timezone,
                  // Use parseISO from date-fns for robust, timezone-safe parsing.
                  selected={selectedDate ? parseISO(selectedDate) : undefined}
                  onSelect={(date) => {
                    if (date) setSelectedDate(format(date, 'yyyy-MM-dd'));
                    setIsDatePickerOpen(false);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <SearchOverlay query={searchQuery} resultCount={searchResults.length} currentIndex={searchIndex} />

      {/* Main Content Area */}
      <div className="pt-24 flex-1 flex flex-col min-h-0">
        {activeTab === 'today' && viewMode === 'tree' && (
          <div
            data-canvas-area
            className={`flex-1 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} animate-in fade-in duration-300`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
          >
            <div 
              className="min-w-max min-h-full p-20 flex justify-center items-start origin-top-left"
              style={{ transform: `scale(${scale}) translate(${pan.x}px, ${pan.y}px)`, transition: isDragging ? 'none' : 'transform 0.2s' }}
            >
              <div className="flex gap-16">
                 {displayedTreeData.map(node => (
                   <TreeNode 
                     key={node.id} 
                     node={node} 
                     onUpdate={handleUpdate} 
                     onAdd={handleAddSubtask} 
                     onRequestDelete={handleRequestDelete}
                     allFieldKeys={allFieldKeys}
                     onStartFocus={handleStartFocus}
                     focusedTaskId={focusedTaskId}
                     isTimerActive={isTimerActive}
                     isSearching={isSearching}
                     highlightedTaskId={highlightedTaskId}
                     highlightedRef={highlightedNodeRef}
                   />
                 ))}
                 
                 {/* Add Root Placeholder - only on Today view */}
                 {selectedDate >= getTodayDateString() && (
                   <button 
                     onClick={handleAddRoot}
                     className="w-64 h-24 rounded-2xl border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-600 hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
                   >
                     <div className="flex flex-col items-center gap-2">
                       <Plus size={24} />
                       <span className="font-medium">New Root</span>
                     </div>
                   </button>
                 )}
                 {displayedTreeData.length === 0 && selectedDate !== getTodayDateString() && (
                     <div className="text-slate-600">
                       {selectedDate < getTodayDateString() ? "No tasks were completed on this day." : "No tasks scheduled for this day."}
                     </div>
                 )}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'today' && viewMode === 'list' && (
          (() => {
            // If searching, filter the displayed data. Otherwise, show all of it.
            const listTasks = isSearching 
              ? searchResults.map(result => findNodeRecursive(displayedTreeData, result.item.id)).filter(Boolean)
              : displayedTreeData;

            return (
              <ListView 
                tasks={listTasks}
                onUpdate={handleUpdate}
                onStartFocus={handleStartFocus}
                onAdd={handleAddSubtask}
              />
            );
          })()
        )}
        {activeTab === 'logs' && <LogsView 
          logs={logs} 
          selectedDate={selectedDate} 
          onAddManualLog={(times) => setManualLogModal(times)}
          onEditLog={(log) => setManualLogModal({ logToEdit: log })}
          onDeleteLog={handleDeleteLog}
          onUpdateLogTime={handleUpdateLogTime}
          onInteractionChange={setIsTimelineInteracting}
        />}
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onExport={handleExport}
        onImport={handleImport}
      />
    </div>
  );
}
