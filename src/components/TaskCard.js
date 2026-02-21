import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  Settings2,
  ListPlus,
  X,
  CalendarPlus,
  CalendarDays,
  Repeat,
  Play,
  Eye,
  EyeOff,
  Sparkles,
  ExternalLink,
  StickyNote,
  GripVertical,
} from 'lucide-react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import CustomDatalistInput from './CustomDatalistInput';
import CustomDatePicker from './CustomDatePicker';
import RecurrenceEditor from './RecurrenceEditor';
import { getTimerDurations } from '../utils/timerSettings';
import { generateId } from '../utils/idGenerator';
import { startOfToday, parseISO } from 'date-fns';
import { getTodayDateString } from '../utils/dateUtils';
import { isUrl, fetchPageTitle, getLinkedSegments } from '../utils/linkUtils';

// --- Component: Task Card (The actual node content) ---
const TaskCard = ({ node, onUpdate, onAdd, onRequestDelete, allFieldKeys, onStartFocus, focusedTaskId, isTimerActive, isSearching, isHighlighted, highlightedRef, treeData, selectedDate, newlyAddedTaskId, onFocusHandled, onOpenNotes, activeDragId }) => {
  const isCompleted = node.recurrence
    ? node.completedOccurrences?.includes(selectedDate)
    : node.isCompleted;
  const [isEditing, setIsEditing] = useState(false);
  const [showFields, setShowFields] = useState(false);
  const inputRef = useRef(null);
  const nodeRef = useRef(node);
  nodeRef.current = node;
  const [incompleteWarning, setIncompleteWarning] = useState(null);
  const [isSchedulePickerOpen, setIsSchedulePickerOpen] = useState(false);
  const [isRecurrenceEditorOpen, setIsRecurrenceEditorOpen] = useState(false);
  const schedulePickerRef = useRef(null);
  const recurrenceEditorRef = useRef(null);

  // DnD hooks
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id: node.id });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: node.id });

  const isDropTarget = isOver && activeDragId && activeDragId !== node.id;

  // This is a helper function that needs access to the top-level state.
  // Instead of passing the function, we pass the data it needs (`treeData`).
  const findNodeRecursive = (nodes, id) => {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = findNodeRecursive(node.children || [], id);
      if (found) return found;
    }
    return null;
  };

  // Focus when created empty
  useEffect(() => {
    if (node.text === "" && isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [node.text, isEditing]);

  useEffect(() => {
    if (newlyAddedTaskId === node.id) {
      setIsEditing(true);
      if (onFocusHandled) {
        onFocusHandled();
      }
    }
  }, [newlyAddedTaskId, node.id, onFocusHandled]);

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

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').trim();
    if (isUrl(pasted)) {
      // Let the URL paste into text naturally — don't preventDefault
      // Just register the link and fetch its title
      const alreadyTracked = (node.links || []).some(l => l.url === pasted);
      if (!alreadyTracked) {
        const newLinks = [...(node.links || []), { url: pasted, title: pasted }];
        onUpdate(node.id, { links: newLinks });
      }
      fetchPageTitle(pasted).then(title => {
        const latest = nodeRef.current;
        const updatedLinks = (latest.links || []).map(l =>
          l.url === pasted ? { ...l, title } : l
        );
        onUpdate(node.id, { links: updatedLinks });
      });
    }
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
  const completedChildren = node.children.filter(c => {
    if (c.recurrence) {
      return c.completedOccurrences?.includes(selectedDate);
    }
    return c.isCompleted;
  }).length;
  const progress = totalChildren === 0 ? 0 : (completedChildren / totalChildren) * 100;
  const fieldsCount = node.fields ? node.fields.length : 0;
  const hasCompletedChildren = completedChildren > 0;

  const isCurrentlyRunningInFocus = focusedTaskId === node.id && isTimerActive;

  const hasPausedTimer = (() => {
    if (node.timeRemaining === undefined || node.timeRemaining <= 0) return false;
    const d = getTimerDurations();
    const full = node.timerMode === 'shortBreak' ? d.shortBreak : node.timerMode === 'longBreak' ? d.longBreak : d.pomodoro;
    return node.timeRemaining < full;
  })();

  return (
    <div
      ref={(el) => {
        setDropRef(el);
        if (isHighlighted && highlightedRef) highlightedRef.current = el;
      }}
      data-task-id={node.id}
      className={`
        relative flex flex-col items-center w-[15vw] min-w-[250px] max-w-[350px] transition-all duration-300 group z-10
        ${isSearching && !isHighlighted ? 'opacity-20 scale-95' : 'opacity-100 scale-100'}
        ${isHighlighted ? 'opacity-100' : ''}
        ${isCompleted && !isHighlighted ? 'opacity-70' : ''}
        ${isDragging ? '!opacity-40' : ''}
      `}
    >
      {/* The Card Box */}
      <div
        className={`
          relative w-full bg-surface-primary/90 backdrop-blur-md border rounded-2xl p-3 shadow-xl transition-all duration-300
          ${isDropTarget
            ? 'border-accent-secondary shadow-[0_0_15px_rgba(34,211,238,0.3)]'
            : isHighlighted
            ? 'border-accent-secondary shadow-[0_0_25px_rgba(56,189,248,0.4)]'
            : hasPausedTimer && !isCurrentlyRunningInFocus
              ? 'border-edge-focus shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-border-pulse'
              : (isCompleted ? 'border-edge-focus shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-edge-primary hover:border-content-muted hover:shadow-2xl hover:shadow-accent-bold/5')}
        `}
      >
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <div
            ref={setDragRef}
            {...listeners}
            {...attributes}
            data-drag-handle
            className="mt-1 flex-shrink-0 cursor-grab active:cursor-grabbing text-content-disabled hover:text-content-tertiary transition-colors"
          >
            <GripVertical size={14} />
          </div>

          {/* Checkbox with Tooltip Wrapper */}
          <div className="relative flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                // If trying to complete a parent task
                // Use originalChildrenCount to check for ALL children, not just visible ones.
                if (!isCompleted && node.originalChildrenCount > 0) {
                  // We need to find the node in the full tree to check its real children's status.
                  const fullNode = findNodeRecursive(treeData, node.id);
                  const allChildrenDone = fullNode.children.every(child => child.isCompleted);
                  if (!allChildrenDone) {
                    const incompleteChildren = fullNode.children.filter(child => !child.isCompleted);
                    const today = startOfToday();

                    // Check if there are any incomplete tasks that are due today or are overdue/unscheduled.
                    const hasActionableTasks = incompleteChildren.some(
                      child => !child.scheduledDate || parseISO(child.scheduledDate) <= today
                    );

                    let warningMessage = 'Complete all subtasks first.';
                    // Only show the "Next up" message if ALL incomplete tasks are in the future.
                    if (!hasActionableTasks) {
                      const futureTasks = incompleteChildren.filter(child => child.scheduledDate).sort((a, b) => parseISO(a.scheduledDate) - parseISO(b.scheduledDate));
                      const nextTask = futureTasks[0];
                      warningMessage = `Next up: "${nextTask.text}" on ${nextTask.scheduledDate}.`;
                    }

                    setIncompleteWarning(warningMessage);
                    setTimeout(() => setIncompleteWarning(null), 3000); // Hide after 3 seconds
                    return; // Prevent completion
                  }
                }

                // Proceed with update if it's being un-completed, has no children, or all children are done.
                onUpdate(node.id, { isCompleted: !isCompleted, isExpanded: false });
              }}
              className={`
                mt-1 flex items-center justify-center w-5 h-5 rounded-full border transition-all duration-300
                ${isCompleted
                  ? 'bg-accent-bold border-accent-bold text-content-inverse'
                  : 'border-content-muted text-transparent hover:border-accent'}
              `}
            >
              <Check size={12} strokeWidth={4} />
            </button>
            {incompleteWarning && (
              <div className="absolute top-1/2 -right-2 transform translate-x-full -translate-y-1/2 w-max bg-surface-secondary text-content-primary text-xs px-3 py-1.5 rounded-lg shadow-lg z-20 animate-in fade-in slide-in-from-left-2 duration-200">
                {incompleteWarning}
              </div>
            )}
          </div>

          {/* Indicator for currently running timer */}
          {isCurrentlyRunningInFocus && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
          )}

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <>
                <input
                  ref={inputRef}
                  type="text"
                  value={node.text}
                  onChange={(e) => onUpdate(node.id, { text: e.target.value })}
                  onBlur={() => setIsEditing(false)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  className="bg-transparent text-content-primary text-sm w-full outline-none border-b border-edge-focus pb-1"
                  placeholder="Task name..."
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
                {node.links && node.links.length > 0 && (
                  <div className="flex flex-col gap-0.5 mt-1">
                    {node.links.map((l, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <ExternalLink size={10} className="text-accent-secondary-bold flex-shrink-0" />
                        <span className="text-[10px] text-accent-secondary/70 truncate flex-1">{l.title !== l.url ? `${l.title} — ${l.url}` : l.url}</span>
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const updated = node.links.filter((_, j) => j !== i);
                            onUpdate(node.id, { links: updated.length ? updated : null });
                          }}
                          className="text-content-disabled hover:text-danger transition-colors flex-shrink-0"
                          title="Remove link"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div
                onClick={(e) => {
                  if (e.target.tagName === 'A') return;
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className={`
                  cursor-text text-sm font-medium break-words pb-1 min-h-[1.5rem]
                  ${node.text ? 'text-content-primary' : 'text-content-muted italic'}
                  ${isCompleted ? 'line-through text-content-muted' : ''}
                `}
              >
                {(() => {
                  const segments = getLinkedSegments(node.text, node.links);
                  if (segments) {
                    return segments.map((seg, i) =>
                      seg.type === 'link' ? (
                        <a
                          key={i}
                          href={seg.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-accent-secondary hover:text-accent-secondary hover:underline"
                        >
                          {seg.content}
                          <ExternalLink size={10} className="inline ml-0.5 mb-0.5" />
                        </a>
                      ) : (
                        <span key={i}>{seg.content}</span>
                      )
                    );
                  }
                  return node.text || "New Task";
                })()}
              </div>
            )}
          </div>

          {/* Fields Toggle */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {isCompleted && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestDelete(node.id);
                }}
                className="p-1 rounded-md text-content-disabled hover:text-danger hover:bg-danger/10 transition-colors"
                title="Clean up completed task"
              >
                <Sparkles size={14} />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowFields(!showFields);
              }}
              className={`
                p-1 rounded-md transition-colors
                ${showFields ? 'text-accent bg-accent-subtle' : 'text-content-disabled hover:text-content-secondary hover:bg-surface-secondary'}
              `}
              title="Custom Fields"
            >
              <Settings2 size={14} />
            </button>
          </div>
        </div>

        {/* Custom Fields Section */}
        {showFields && (
          <div className="mt-3 pt-3 border-t border-edge-secondary space-y-2 animate-in slide-in-from-top-2 duration-200">
            <div className="space-y-1.5">
              {(node.fields || []).map((field) => (
                <div key={field.id} className="flex items-center gap-2 group/field">
                  <CustomDatalistInput
                    value={field.label}
                    onChange={(newValue) => handleUpdateField(field.id, 'label', newValue)}
                    options={allFieldKeys}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                    placeholder="Label"
                  />
                  <span className="text-content-disabled text-xs">:</span>
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => handleUpdateField(field.id, 'value', e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                    placeholder="Value"
                    className="flex-1 bg-surface-elevated/50 text-xs text-content-primary border border-edge-secondary rounded px-2 py-1 focus:border-edge-focus focus:outline-none transition-colors"
                  />
                  <button
                    onClick={() => handleDeleteField(field.id)}
                    className="opacity-0 group-hover/field:opacity-100 p-1 text-content-muted hover:text-danger transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={handleAddField}
              className="w-full py-1 text-xs text-content-muted hover:text-accent border border-dashed border-edge-secondary hover:border-edge-focus rounded flex items-center justify-center gap-1 transition-colors"
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
               <span key={field.id} className="text-[10px] px-1.5 py-0.5 bg-surface-tertiary text-content-tertiary rounded border border-edge-secondary truncate max-w-[100px]">
                 {field.label || 'Key'}: {field.value || 'Value'}
               </span>
            ))}
            {fieldsCount > 3 && <span className="text-[10px] text-content-disabled">+{fieldsCount - 3}</span>}
          </div>
        )}

        {/* Scheduled Date Display */}
        {node.scheduledDate && (
          <div className="mt-2 text-xs flex items-center gap-1.5 text-content-muted"><CalendarDays size={12} /><span>{node.scheduledDate}</span></div>
        )}

        {/* Recurrence Info Display */}
        {node.recurrence && (
          <div className="mt-1 text-xs flex items-center gap-1.5 text-accent-secondary-bold"><Repeat size={12} /><span>Recurring</span></div>
        )}

        {/* Footer Actions & Info */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-edge-secondary">
          {/* Collapse Toggle */}
          {node.children.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate(node.id, { isExpanded: !node.isExpanded });
                }}
                className="text-xs flex items-center gap-1 text-content-tertiary hover:text-content-inverse bg-surface-tertiary hover:bg-surface-secondary px-2 py-1 rounded-md transition-colors"
              >
                {node.isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                <span>{node.children.length}</span>
              </button>
              {hasCompletedChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate(node.id, { hideCompleted: !node.hideCompleted });
                  }}
                  className={`text-xs flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
                    node.hideCompleted
                      ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20'
                      : 'text-content-tertiary bg-surface-tertiary hover:bg-surface-secondary hover:text-content-inverse'
                  }`}
                  title={node.hideCompleted ? 'Show completed subtasks' : 'Hide completed subtasks'}
                >
                  {node.hideCompleted ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              )}
            </div>
          )}

          {/* Progress Bar (if no children, empty space) */}
          {node.children.length > 0 ? (
             <div className="flex-1 mx-3 h-1 bg-surface-secondary rounded-full overflow-hidden">
               <div
                 className="h-full bg-accent-bold transition-all duration-500"
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
              className="p-1 text-content-tertiary hover:text-accent hover:bg-accent-subtle rounded-md transition-colors"
              title="Add Subtask"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRequestDelete(node.id);
              }}
              className="p-1 text-content-tertiary hover:text-danger hover:bg-danger/10 rounded-md transition-colors"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
            <div className="relative" ref={schedulePickerRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setIsSchedulePickerOpen(!isSchedulePickerOpen); }}
                className="p-1 text-content-tertiary hover:text-accent-secondary hover:bg-accent-secondary/10 rounded-md transition-colors"
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
                className="p-1 text-content-tertiary hover:text-accent-secondary hover:bg-accent-secondary/10 rounded-md transition-colors"
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
              className="p-1 text-content-tertiary hover:text-accent hover:bg-accent-subtle rounded-md transition-colors"
              title="Focus on this task"
            >
              <Play size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenNotes) onOpenNotes(node.id);
              }}
              className="relative p-1 text-content-tertiary hover:text-amber-400 hover:bg-amber-400/10 rounded-md transition-colors"
              title="Notes"
            >
              <StickyNote size={14} />
              {node.notes && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Vertical Connector from Card to Children Line */}
      {node.isExpanded && node.children.length > 0 && (
        <div className="w-px h-8 bg-surface-secondary"></div>
      )}
    </div>
  );
};

export default TaskCard;
