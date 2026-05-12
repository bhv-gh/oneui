import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import gsap from 'gsap';
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
  AtSign,
  Hash,
  Flag,
  Ellipsis,
} from 'lucide-react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import CustomDatalistInput from './CustomDatalistInput';
import CustomDatePicker from './CustomDatePicker';
import HighlightedInput from './HighlightedInput';
import RecurrenceEditor from './RecurrenceEditor';
import { getTimerDurations } from '../utils/timerSettings';
import { generateId } from '../utils/idGenerator';
import { startOfToday, parseISO } from 'date-fns';
import { getTodayDateString, getDeadlineStatus } from '../utils/dateUtils';
import { isUrl, fetchPageTitle, getLinkedSegments } from '../utils/linkUtils';
import { parseTaskInput } from '../utils/taskParser';
import { getPriorityColor, getNextPriority, getPriorityLabel } from '../utils/priorityUtils';

// --- Component: Task Card (The actual node content) ---
const TaskCard = ({ node, onUpdate, onAdd, onRequestDelete, allFieldKeys, onStartFocus, focusedTaskId, isTimerActive, isSearching, isHighlighted, highlightedRef, treeData, selectedDate, newlyAddedTaskId, onFocusHandled, onOpenNotes, activeDragId, isFilterMatch }) => {
  const isCompleted = node.recurrence
    ? node.completedOccurrences?.includes(selectedDate)
    : node.isCompleted;
  const [isEditing, setIsEditing] = useState(false);
  const [showFields, setShowFields] = useState(false);
  const inputRef = useRef(null);
  const cardBoxRef = useRef(null);
  const nodeRef = useRef(node);
  nodeRef.current = node;
  const prevCompletedRef = useRef(isCompleted);

  // GSAP: celebration on completion
  useEffect(() => {
    if (isCompleted && !prevCompletedRef.current && cardBoxRef.current) {
      const card = cardBoxRef.current;

      // Card glow pulse
      gsap.to(card, {
        boxShadow: '0 0 30px rgba(16,185,129,0.4)',
        duration: 0.3,
        yoyo: true,
        repeat: 1,
        ease: 'power2.out',
      });

      // Card bounce
      gsap.fromTo(card, { scale: 1 }, { scale: 1.05, duration: 0.2, yoyo: true, repeat: 1, ease: 'back.out(3)' });

      // Checkbox spin
      const checkbox = card.querySelector('[data-checkbox]');
      if (checkbox) {
        gsap.fromTo(checkbox, { rotation: 0, scale: 0.5 }, { rotation: 360, scale: 1, duration: 0.5, ease: 'back.out(2)' });
      }

      // Confetti burst from the checkbox
      const rect = (checkbox || card).getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const emojis = ['🎉', '✨', '⭐', '🌟', '💫', '🎊', '✅', '🥳'];

      for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.textContent = emojis[i % emojis.length];
        particle.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;font-size:16px;pointer-events:none;z-index:9999;`;
        document.body.appendChild(particle);

        const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.5;
        const dist = 40 + Math.random() * 60;

        gsap.to(particle, {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist - 20,
          opacity: 0,
          scale: 1.5,
          duration: 0.6 + Math.random() * 0.3,
          ease: 'power2.out',
          onComplete: () => particle.remove(),
        });
      }

      // Fade out after celebration — if the card stays in DOM (not hidden),
      // we restore it; if it gets unmounted by the grace period, it's seamless.
      const wrapper = card.closest('[data-task-id]');
      if (wrapper) {
        gsap.to(wrapper, {
          opacity: 0.4,
          y: -8,
          scale: 0.97,
          duration: 0.4,
          delay: 0.7,
          ease: 'power2.in',
          onComplete: () => {
            // If still in DOM after fade, gently settle into completed state
            if (wrapper.isConnected) {
              gsap.to(wrapper, { opacity: 0.7, y: 0, scale: 1, duration: 0.3, ease: 'power2.out' });
            }
          },
        });
      }
    }
    prevCompletedRef.current = isCompleted;
  }, [isCompleted]);

  // GSAP: smooth expand when entering edit mode
  useEffect(() => {
    if (isEditing && cardBoxRef.current) {
      gsap.from(cardBoxRef.current, {
        scaleY: 0.92, opacity: 0.8,
        duration: 0.3, ease: 'back.out(1.5)',
        clearProps: 'transform,opacity',
      });
    }
  }, [isEditing]);
  const [incompleteWarning, setIncompleteWarning] = useState(null);
  const [isSchedulePickerOpen, setIsSchedulePickerOpen] = useState(false);
  const [isDeadlinePickerOpen, setIsDeadlinePickerOpen] = useState(false);
  const [isRecurrenceEditorOpen, setIsRecurrenceEditorOpen] = useState(false);
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);

  const { allProjects, allTags } = useMemo(() => {
    const projects = new Set();
    const tags = new Set();
    const collect = (nodes) => {
      for (const n of nodes) {
        if (n.project) projects.add(n.project);
        if (n.tags) n.tags.forEach(t => tags.add(t));
        if (n.children) collect(n.children);
      }
    };
    collect(treeData || []);
    return { allProjects: [...projects], allTags: [...tags] };
  }, [treeData]);

  const schedulePickerRef = useRef(null);
  const deadlinePickerRef = useRef(null);
  const recurrenceEditorRef = useRef(null);
  const moreActionsRef = useRef(null);

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
      if (deadlinePickerRef.current && !deadlinePickerRef.current.contains(event.target)) {
        setIsDeadlinePickerOpen(false);
      }
      if (moreActionsRef.current && !moreActionsRef.current.contains(event.target)) {
        setIsMoreActionsOpen(false);
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

  const handleFinishEditing = () => {
    setIsEditing(false);
    const { text: cleanText, project, tags, priority: parsedPriority } = parseTaskInput(node.text);
    if (cleanText !== node.text || project || tags.length > 0 || parsedPriority) {
      const updates = { text: cleanText };
      if (project) updates.project = project;
      if (tags.length > 0) updates.tags = [...new Set([...(node.tags || []), ...tags])];
      if (parsedPriority) updates.priority = parsedPriority;
      onUpdate(node.id, updates);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleFinishEditing();
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

  const isLightTheme = document.documentElement.getAttribute('data-theme') === 'personal';
  const priority = node.priority || 'none';
  const priorityColor = getPriorityColor(priority, isLightTheme);

  return (
    <div
      ref={(el) => {
        setDropRef(el);
        if (isHighlighted && highlightedRef) highlightedRef.current = el;
      }}
      data-task-id={node.id}
      className={`
        relative flex flex-col w-full transition-all duration-300 group
        ${isEditing || isMoreActionsOpen || isSchedulePickerOpen || isDeadlinePickerOpen || isRecurrenceEditorOpen ? 'z-50' : 'z-10'}
        ${isSearching && !isHighlighted ? 'opacity-20 scale-95' : 'opacity-100 scale-100'}
        ${isHighlighted ? 'opacity-100' : ''}
        ${isCompleted && !isHighlighted ? 'opacity-70' : ''}
        ${isDragging ? '!opacity-40' : ''}
        ${isFilterMatch === false ? 'opacity-40' : ''}
      `}
    >
      {/* The Card Box */}
      {isEditing ? (
      /* ═══════════ EDITING STATE ═══════════ */
      <div ref={cardBoxRef} className="relative w-full bg-surface-primary/95 backdrop-blur-md border border-accent/40 rounded-2xl p-6 shadow-[0_0_40px_rgba(16,185,129,0.12)] transition-all duration-300"
        style={priority !== 'none' ? { backgroundImage: `linear-gradient(135deg, ${priorityColor.dot}25 0%, transparent 50%)`, boxShadow: `inset 0 0 30px ${priorityColor.dot}15, 0 0 12px ${priorityColor.dot}10` } : undefined}
      >

        {/* Main input — blends with card */}
        <HighlightedInput
          ref={inputRef}
          value={node.text}
          onChange={(e) => onUpdate(node.id, { text: e.target.value })}
          onBlur={handleFinishEditing}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className="bg-transparent text-content-primary text-lg font-medium w-full outline-none border-b-2 border-accent/30 focus:border-accent pb-2 transition-all"
          placeholder="What needs to be done?"
          projects={allProjects}
          tags={allTags}
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />

        {/* Inline quick actions */}
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              const input = inputRef.current;
              if (input) {
                const pos = input.selectionStart || input.value.length;
                const before = input.value.slice(0, pos);
                const after = input.value.slice(pos);
                const newVal = before + (before.endsWith(' ') || before === '' ? '@' : ' @') + after;
                onUpdate(node.id, { text: newVal });
                setTimeout(() => { input.focus(); input.setSelectionRange(newVal.length - after.length, newVal.length - after.length); }, 0);
              }
            }}
            className="px-2.5 py-1.5 text-[11px] rounded-lg bg-accent-secondary-subtle text-accent-secondary-bold hover:bg-accent-secondary/20 transition-colors flex items-center gap-1"
          >
            <AtSign size={11} /> Project
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              const input = inputRef.current;
              if (input) {
                const pos = input.selectionStart || input.value.length;
                const before = input.value.slice(0, pos);
                const after = input.value.slice(pos);
                const newVal = before + (before.endsWith(' ') || before === '' ? '#' : ' #') + after;
                onUpdate(node.id, { text: newVal });
                setTimeout(() => { input.focus(); input.setSelectionRange(newVal.length - after.length, newVal.length - after.length); }, 0);
              }
            }}
            className="px-2.5 py-1.5 text-[11px] rounded-lg bg-accent-subtle text-accent hover:bg-accent/20 transition-colors flex items-center gap-1"
          >
            <Hash size={11} /> Tag
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              onUpdate(node.id, { priority: getNextPriority(priority) });
            }}
            className="px-2.5 py-1.5 text-[11px] rounded-lg transition-colors flex items-center gap-1 border"
            style={{ backgroundColor: priorityColor.bg, color: priorityColor.text, borderColor: priorityColor.border }}
          >
            <Flag size={11} /> {getPriorityLabel(priority)}
          </button>
        </div>

        {/* Inline schedule / deadline row */}
        <div className="mt-3 pt-3 border-t border-edge-secondary grid grid-cols-2 gap-2">
          <div className="relative" ref={schedulePickerRef}>
            <button
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setIsSchedulePickerOpen(!isSchedulePickerOpen); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg bg-surface-secondary text-content-secondary hover:text-accent-secondary hover:bg-accent-secondary-subtle transition-colors"
            >
              <CalendarPlus size={13} />
              <span>{node.scheduledDate ? `${node.scheduledDate}${node.scheduledTime ? ' @ ' + node.scheduledTime : ''}` : 'Schedule'}</span>
            </button>
            {isSchedulePickerOpen && (
              <div className="absolute top-full left-0 mt-1 z-[110] animate-in fade-in duration-100">
                <div className="bg-surface-primary border border-edge-secondary rounded-xl shadow-2xl overflow-hidden">
                  <CustomDatePicker
                    selected={node.scheduledDate ? new Date(node.scheduledDate) : undefined}
                    onSelect={(date) => {
                      const newScheduledDate = date ? date.toISOString().split('T')[0] : null;
                      onUpdate(node.id, { scheduledDate: newScheduledDate });
                      if (!node.scheduledTime) setIsSchedulePickerOpen(false);
                    }}
                  />
                  <div className="px-3 pb-3 flex items-center gap-2 border-t border-edge-secondary pt-2">
                    <label className="text-[10px] text-content-muted uppercase tracking-wider">Time</label>
                    <input
                      type="time"
                      value={node.scheduledTime || ''}
                      onChange={(e) => onUpdate(node.id, { scheduledTime: e.target.value || null })}
                      className="flex-1 bg-surface-secondary text-content-primary text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent-bold/50"
                    />
                    {node.scheduledTime && (
                      <button onClick={(e) => { e.stopPropagation(); onUpdate(node.id, { scheduledTime: null }); }} className="p-1 text-content-muted hover:text-danger transition-colors">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="relative" ref={deadlinePickerRef}>
            <button
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setIsDeadlinePickerOpen(!isDeadlinePickerOpen); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg bg-surface-secondary text-content-secondary hover:text-warning hover:bg-warning-subtle transition-colors"
            >
              <Flag size={13} />
              <span>{node.deadline || 'Deadline'}</span>
            </button>
            {isDeadlinePickerOpen && (
              <div className="absolute top-full right-0 mt-1 z-[110] animate-in fade-in duration-100">
                <CustomDatePicker
                  selected={node.deadline ? new Date(node.deadline) : undefined}
                  onSelect={(date) => {
                    const newDeadline = date ? date.toISOString().split('T')[0] : null;
                    onUpdate(node.id, { deadline: newDeadline });
                    setIsDeadlinePickerOpen(false);
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Inline recurrence + delete row */}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="relative" ref={recurrenceEditorRef}>
            <button
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setIsRecurrenceEditorOpen(!isRecurrenceEditorOpen); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg bg-surface-secondary text-content-secondary hover:text-accent-secondary hover:bg-accent-secondary-subtle transition-colors"
            >
              <Repeat size={13} />
              <span>{node.recurrence ? 'Edit Recurrence' : 'Recurrence'}</span>
            </button>
            {isRecurrenceEditorOpen && (
              <div className="absolute top-full left-0 mt-1 z-[110] animate-in fade-in duration-100">
                <RecurrenceEditor
                  recurrence={node.recurrence}
                  onSave={(newRecurrence) => { onUpdate(node.id, { recurrence: newRecurrence }); setIsRecurrenceEditorOpen(false); }}
                  onClose={() => setIsRecurrenceEditorOpen(false)}
                />
              </div>
            )}
          </div>
          <button
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onRequestDelete(node.id); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg bg-surface-secondary text-content-secondary hover:text-danger hover:bg-danger-subtle transition-colors"
          >
            <Trash2 size={13} />
            <span>Delete</span>
          </button>
        </div>

        {/* Links */}
        {node.links && node.links.length > 0 && (
          <div className="flex flex-col gap-0.5 mt-3">
            {node.links.map((l, i) => (
              <div key={i} className="flex items-center gap-1">
                <ExternalLink size={10} className="text-accent-secondary-bold flex-shrink-0" />
                <span className="text-[10px] text-accent-secondary/70 truncate flex-1">{l.title !== l.url ? `${l.title} — ${l.url}` : l.url}</span>
                <button
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); const updated = node.links.filter((_, j) => j !== i); onUpdate(node.id, { links: updated.length ? updated : null }); }}
                  className="text-content-disabled hover:text-danger transition-colors flex-shrink-0"
                ><X size={10} /></button>
              </div>
            ))}
          </div>
        )}

        {/* Footer hint */}
        <div className="mt-3 pt-2 border-t border-edge-secondary flex items-center justify-between">
          <span className="text-[10px] text-content-disabled">
            <kbd className="px-1 py-0.5 rounded bg-surface-secondary border border-edge-secondary">Enter</kbd> save
            {' · '}
            <kbd className="px-1 py-0.5 rounded bg-surface-secondary border border-edge-secondary">@</kbd> project
            {' · '}
            <kbd className="px-1 py-0.5 rounded bg-surface-secondary border border-edge-secondary">#</kbd> tag
          </span>
        </div>
      </div>
      ) : (
      /* ═══════════ VIEW STATE ═══════════ */
      <div
        ref={cardBoxRef}
        className={`
          relative w-full bg-surface-primary/90 backdrop-blur-md border rounded-2xl p-4 shadow-xl transition-all duration-300
          ${isDropTarget
            ? 'border-accent-secondary shadow-[0_0_15px_rgba(34,211,238,0.3)]'
            : isHighlighted
            ? 'border-accent-secondary shadow-[0_0_25px_rgba(56,189,248,0.4)]'
            : isFilterMatch === true
              ? 'border-accent shadow-[0_0_12px_rgba(99,102,241,0.2)]'
              : hasPausedTimer && !isCurrentlyRunningInFocus
              ? 'border-edge-focus shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-border-pulse'
              : (isCompleted ? 'border-edge-focus shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-edge-primary hover:border-content-muted hover:shadow-2xl hover:shadow-accent-bold/5')}
        `}
        style={priority !== 'none' ? { backgroundImage: `linear-gradient(135deg, ${priorityColor.dot}25 0%, transparent 50%)`, boxShadow: `inset 0 0 30px ${priorityColor.dot}15, 0 0 12px ${priorityColor.dot}10` } : undefined}
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

          {/* Checkbox */}
          <div className="relative flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!isCompleted && node.originalChildrenCount > 0) {
                  const fullNode = findNodeRecursive(treeData, node.id);
                  const allChildrenDone = fullNode.children.every(child => child.isCompleted);
                  if (!allChildrenDone) {
                    const incompleteChildren = fullNode.children.filter(child => !child.isCompleted);
                    const today = startOfToday();
                    const hasActionableTasks = incompleteChildren.some(
                      child => !child.scheduledDate || parseISO(child.scheduledDate) <= today
                    );
                    let warningMessage = 'Complete all subtasks first.';
                    if (!hasActionableTasks) {
                      const futureTasks = incompleteChildren.filter(child => child.scheduledDate).sort((a, b) => parseISO(a.scheduledDate) - parseISO(b.scheduledDate));
                      const nextTask = futureTasks[0];
                      warningMessage = `Next up: "${nextTask.text}" on ${nextTask.scheduledDate}.`;
                    }
                    setIncompleteWarning(warningMessage);
                    setTimeout(() => setIncompleteWarning(null), 3000);
                    return;
                  }
                }
                onUpdate(node.id, { isCompleted: !isCompleted, isExpanded: false });
              }}
              data-checkbox
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

          {isCurrentlyRunningInFocus && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
          )}

          {/* Text Content */}
          <div className="flex-1 min-w-0">
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
                        className="text-accent-secondary hover:text-accent-secondary-bold hover:underline"
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

        {/* Project & Tags */}
        {(node.project || (node.tags && node.tags.length > 0)) && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {node.project && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-accent-secondary-subtle text-accent-secondary-bold rounded-full group/badge font-medium border border-accent-secondary/20">
                <AtSign size={8} />
                {node.project}
                <button
                  onClick={(e) => { e.stopPropagation(); onUpdate(node.id, { project: null }); }}
                  className="ml-0.5 opacity-0 group-hover/badge:opacity-100 hover:text-danger transition-all"
                >
                  <X size={8} />
                </button>
              </span>
            )}
            {priority !== 'none' && (
              <span
                className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: priorityColor.bg, color: priorityColor.text, border: `1px solid ${priorityColor.border}` }}
              >
                {getPriorityLabel(priority)}
              </span>
            )}
            {(node.tags || []).map(tag => (
              <span key={tag} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 border border-edge-secondary text-content-tertiary rounded-full group/badge">
                <Hash size={8} />
                {tag}
                <button
                  onClick={(e) => { e.stopPropagation(); onUpdate(node.id, { tags: (node.tags || []).filter(t => t !== tag) }); }}
                  className="ml-0.5 opacity-0 group-hover/badge:opacity-100 hover:text-danger transition-all"
                >
                  <X size={8} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Scheduled Date + Time Display */}
        {node.scheduledDate && (
          <div className="mt-2 text-xs flex items-center gap-1.5 text-content-muted">
            <CalendarDays size={12} />
            <span>{node.scheduledDate}</span>
            {node.scheduledTime && <span className="text-accent-secondary-bold font-medium">@ {node.scheduledTime}</span>}
          </div>
        )}

        {/* Deadline Display */}
        {node.deadline && (() => {
          const todayStr = getTodayDateString();
          const status = getDeadlineStatus(node.deadline, todayStr, isCompleted);
          const urgencyClasses = {
            overdue: 'text-danger',
            'due-soon': 'text-warning',
            completed: 'text-content-muted',
            normal: 'text-content-muted',
          };
          const badgeClasses = {
            overdue: 'bg-danger/10 text-danger',
            'due-soon': 'bg-warning/10 text-warning',
            completed: 'bg-surface-tertiary text-content-muted',
            normal: 'bg-surface-tertiary text-content-muted',
          };
          const badgeText = status.daysRemaining === 0 ? 'Today' : status.daysRemaining < 0 ? `${Math.abs(status.daysRemaining)}d overdue` : `${status.daysRemaining}d left`;
          return (
            <div className={`mt-1 text-xs flex items-center gap-1.5 ${urgencyClasses[status.urgency]}`}>
              <Flag size={12} />
              <span>{node.deadline}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${badgeClasses[status.urgency]}`}>{badgeText}</span>
            </div>
          );
        })()}

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
                <span>{completedChildren}/{totalChildren}</span>
              </button>
              {hasCompletedChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const isCurrentlyHiding = node.hideCompleted !== false;
                    onUpdate(node.id, { hideCompleted: !isCurrentlyHiding });
                  }}
                  className={`text-xs flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
                    node.hideCompleted !== false
                      ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20'
                      : 'text-content-tertiary bg-surface-tertiary hover:bg-surface-secondary hover:text-content-inverse'
                  }`}
                  title={node.hideCompleted !== false ? 'Show completed subtasks' : 'Hide completed subtasks'}
                >
                  {node.hideCompleted !== false ? <EyeOff size={12} /> : <Eye size={12} />}
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
          <div className="flex items-center gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(node.id, { priority: getNextPriority(priority) });
              }}
              className="p-1 rounded-md transition-all"
              style={{ color: priorityColor.dot }}
              title={`Priority: ${getPriorityLabel(priority)} — click to cycle`}
            >
              <Flag size={14} />
            </button>
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
            <div className="relative" ref={moreActionsRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setIsMoreActionsOpen(!isMoreActionsOpen); }}
                className={`p-1 rounded-md transition-colors ${isMoreActionsOpen ? 'text-accent bg-accent-subtle' : 'text-content-tertiary hover:text-content-inverse hover:bg-surface-secondary'}`}
                title="More actions"
              >
                <Ellipsis size={14} />
              </button>
              {isMoreActionsOpen && (
                <div className="absolute top-full right-0 mt-1 z-[100] animate-in fade-in duration-100 bg-surface-primary border border-edge-primary rounded-lg shadow-2xl p-1 flex flex-col gap-0.5 min-w-[160px]">
                  <div className="relative" ref={schedulePickerRef}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsSchedulePickerOpen(!isSchedulePickerOpen); }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-content-secondary hover:text-accent-secondary hover:bg-surface-secondary rounded-md transition-colors"
                    >
                      <CalendarPlus size={13} />
                      <span>Schedule</span>
                    </button>
                    {isSchedulePickerOpen && (
                      <div className="absolute top-0 right-full mr-1 z-[110] animate-in fade-in duration-100">
                        <div className="bg-surface-primary border border-edge-secondary rounded-xl shadow-2xl overflow-hidden">
                          <CustomDatePicker
                            selected={node.scheduledDate ? new Date(node.scheduledDate) : undefined}
                            onSelect={(date) => {
                              const newScheduledDate = date ? date.toISOString().split('T')[0] : null;
                              onUpdate(node.id, { scheduledDate: newScheduledDate });
                              if (!node.scheduledTime) {
                                setIsSchedulePickerOpen(false);
                                setIsMoreActionsOpen(false);
                              }
                            }}
                          />
                          <div className="px-3 pb-3 flex items-center gap-2 border-t border-edge-secondary pt-2">
                            <label className="text-[10px] text-content-muted uppercase tracking-wider">Time</label>
                            <input
                              type="time"
                              value={node.scheduledTime || ''}
                              onChange={(e) => onUpdate(node.id, { scheduledTime: e.target.value || null })}
                              className="flex-1 bg-surface-secondary text-content-primary text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent-bold/50"
                            />
                            {node.scheduledTime && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onUpdate(node.id, { scheduledTime: null }); }}
                                className="p-1 text-content-muted hover:text-danger transition-colors"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="relative" ref={deadlinePickerRef}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsDeadlinePickerOpen(!isDeadlinePickerOpen); }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-content-secondary hover:text-warning hover:bg-surface-secondary rounded-md transition-colors"
                    >
                      <Flag size={13} />
                      <span>Deadline</span>
                    </button>
                    {isDeadlinePickerOpen && (
                      <div className="absolute top-0 right-full mr-1 z-[110] animate-in fade-in duration-100">
                        <CustomDatePicker
                          selected={node.deadline ? new Date(node.deadline) : undefined}
                          onSelect={(date) => {
                            const newDeadline = date ? date.toISOString().split('T')[0] : null;
                            onUpdate(node.id, { deadline: newDeadline });
                            setIsDeadlinePickerOpen(false);
                            setIsMoreActionsOpen(false);
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="relative" ref={recurrenceEditorRef}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsRecurrenceEditorOpen(!isRecurrenceEditorOpen); }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-content-secondary hover:text-accent-secondary hover:bg-surface-secondary rounded-md transition-colors"
                    >
                      <Repeat size={13} />
                      <span>Recurrence</span>
                    </button>
                    {isRecurrenceEditorOpen && (
                      <div className="absolute top-0 right-full mr-1 z-[110] animate-in fade-in duration-100">
                        <RecurrenceEditor
                          recurrence={node.recurrence}
                          onSave={(newRecurrence) => { onUpdate(node.id, { recurrence: newRecurrence }); setIsMoreActionsOpen(false); }}
                          onClose={() => setIsRecurrenceEditorOpen(false)}
                        />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestDelete(node.id);
                      setIsMoreActionsOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-content-secondary hover:text-danger hover:bg-danger/10 rounded-md transition-colors"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

    </div>
  );
};

export default TaskCard;
