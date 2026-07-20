import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Flame, Check, ChevronRight, ChevronDown, Circle, Plus, Pencil, Trash2, X, Sparkles,
  Droplet, Minus, CalendarDays, CheckCircle2, Timer, Trophy, ListChecks,
} from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { getTodayDateString } from '../utils/dateUtils';
import RecurringAdherence from './RecurringAdherence';
import { CHANGE_STEPS } from '../data/changeSteps';
import { MOOD_KEY } from '../data/changePresets';
import {
  getEffectiveStep,
  setActiveStep,
  advanceStep,
  addStepToProgram,
  removeStepFromProgram,
  setStepOverride,
  getProgramProgress,
  computeJournalStreak,
  extractWinsForDate,
  buildHeatmap,
  isEntryMeaningful,
} from '../utils/changeJournal';

const MOODS = [
  { value: 1, emoji: '😞', label: 'Worst' },
  { value: 2, emoji: '🙁', label: 'Bad' },
  { value: 3, emoji: '😐', label: 'Decent' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😄', label: 'Best' },
];

// Short, step-aware nudge drawn from the day's closed tasks / focus sessions.
function stepNudge(stepId, wins) {
  const done = wins.completedTasks.length;
  const focus = wins.focusSessions.length;
  switch (stepId) {
    case 'pomodoro':
      return focus > 0
        ? `You ran ${focus} focus session${focus > 1 ? 's' : ''} today 🎯`
        : 'Start a focus session from the Today tab to practice this.';
    case 'essentialism':
      return done > 0 ? `You closed ${done} task${done > 1 ? 's' : ''} — which one actually mattered most?` : null;
    case 'pareto':
      return done > 0 ? `Of ${done} closed, which ~20% drove the result?` : null;
    case 'single-tasking':
      return done > 0 ? `${done} done today. Did you finish them one at a time?` : null;
    case 'eisenhower':
      return done > 0 ? `You closed ${done} — were they important, or just urgent?` : null;
    case 'goals':
      return done > 0 ? `${done} closed — did any move a real goal forward?` : null;
    case 'marginal-gains':
      return 'What is the one small thing you improved today?';
    case 'habits':
      return done > 0 ? `${done} done — consistency is the point. Keep the chain going.` : null;
    default:
      return done > 0 ? `You closed ${done} task${done > 1 ? 's' : ''} today.` : null;
  }
}

const Card = ({ children, className = '' }) => (
  <div className={`bg-surface-secondary/60 border border-edge-secondary rounded-xl ${className}`}>{children}</div>
);

// ── Step editor modal (edit title / method / prompt → overrides) ──
function StepEditModal({ journal, stepId, onSave, onClose }) {
  const step = getEffectiveStep(journal, stepId);
  const [title, setTitle] = useState(step?.title || '');
  const [subtitle, setSubtitle] = useState(step?.subtitle || '');
  const [method, setMethod] = useState(step?.method || '');
  const [prompt, setPrompt] = useState(step?.prompt || '');
  const [presets, setPresets] = useState(() => ({
    best: step?.presets?.best || '',
    good: step?.presets?.good || '',
    decent: step?.presets?.decent || '',
    bad: step?.presets?.bad || '',
    worst: step?.presets?.worst || '',
  }));
  if (!step) return null;

  const inputCls =
    'w-full bg-surface-secondary border border-edge-primary rounded-lg px-3 py-2 text-content-primary focus:outline-none focus:ring-2 focus:ring-edge-focus';

  return (
    <div
      className="fixed inset-0 z-[210] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface-primary border border-edge-primary rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-edge-secondary">
          <h3 className="text-lg font-semibold text-content-primary">Edit step</h3>
          <button onClick={onClose} className="p-1 text-content-muted hover:text-content-primary"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          <p className="text-xs text-content-muted">
            Paste the book’s exact wording here — it overrides the default and is stored with your journal.
          </p>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-content-muted mb-1">Title</label>
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-content-muted mb-1">Subtitle</label>
            <input className={inputCls} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-content-muted mb-1">Method</label>
            <textarea className={`${inputCls} min-h-[96px] resize-y`} value={method} onChange={(e) => setMethod(e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-content-muted mb-1">Daily prompt</label>
            <textarea className={`${inputCls} min-h-[60px] resize-y`} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-content-muted mb-1">Reflection presets (tapping a mood prefills these)</label>
            <div className="space-y-2">
              {[['best', 'Best'], ['good', 'Good'], ['decent', 'Decent'], ['bad', 'Bad'], ['worst', 'Worst']].map(([key, label]) => (
                <div key={key} className="flex items-start gap-2">
                  <span className="w-14 flex-shrink-0 text-xs text-content-tertiary pt-2">{label}</span>
                  <textarea
                    className={`${inputCls} min-h-[42px] resize-y`}
                    value={presets[key]}
                    onChange={(e) => setPresets(p => ({ ...p, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-edge-secondary">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-content-secondary hover:bg-surface-secondary transition-colors">Cancel</button>
          <button
            onClick={() => {
              const presetOverride = Object.fromEntries(Object.entries(presets).filter(([, v]) => v.trim()));
              onSave(stepId, { title, subtitle, method, prompt, presets: presetOverride });
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-accent-bold text-content-inverse hover:bg-accent-bolder transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Library modal (browse all 24, add/remove/edit) ──
function StepLibraryModal({ journal, onAdd, onRemove, onActivate, onEdit, onClose }) {
  const order = journal.program.order || [];
  return (
    <div
      className="fixed inset-0 z-[205] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface-primary border border-edge-primary rounded-2xl shadow-2xl w-full max-w-3xl animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-edge-secondary">
          <div>
            <h3 className="text-lg font-semibold text-content-primary">Step library</h3>
            <p className="text-xs text-content-muted">All 24 methods. Add any to your program, or edit the text to match your book.</p>
          </div>
          <button onClick={onClose} className="p-1 text-content-muted hover:text-content-primary"><X size={18} /></button>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto">
          {CHANGE_STEPS.map((seed) => {
            const inProgram = order.includes(seed.id);
            const step = getEffectiveStep(journal, seed.id);
            return (
              <div key={seed.id} className="bg-surface-secondary/60 border border-edge-secondary rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-content-primary truncate">{step.title}</p>
                    <p className="text-xs text-content-muted truncate">{step.subtitle}</p>
                  </div>
                  <span className="text-[10px] text-content-disabled uppercase tracking-wider flex-shrink-0">{step.category}</span>
                </div>
                <p className="text-xs text-content-tertiary line-clamp-2">{step.method}</p>
                <div className="flex items-center gap-2 mt-1">
                  {inProgram ? (
                    <>
                      <span className="flex items-center gap-1 text-xs text-accent"><Check size={13} /> In program</span>
                      <button onClick={() => onActivate(seed.id)} className="text-xs text-content-tertiary hover:text-accent ml-auto">Set current</button>
                      {order.length > 1 && (
                        <button onClick={() => onRemove(seed.id)} className="p-1 text-content-muted hover:text-danger" title="Remove from program"><Trash2 size={13} /></button>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => onAdd(seed.id)}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-accent-subtle text-accent hover:bg-accent-bold hover:text-content-inverse transition-colors"
                    >
                      <Plus size={13} /> Add
                    </button>
                  )}
                  <button onClick={() => onEdit(seed.id)} className="p-1 text-content-muted hover:text-accent ml-auto" title="Edit text"><Pencil size={13} /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ChangeView({ journal, updateJournal, treeData, logs }) {
  const today = getTodayDateString();
  const [viewedDate, setViewedDate] = useState(today);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [editingStepId, setEditingStepId] = useState(null);
  const [stepMenuOpen, setStepMenuOpen] = useState(false); // mobile step dropdown

  const isToday = viewedDate === today;
  const activeStepId = journal.program.activeStepId;
  const entry = journal.entries[viewedDate] || {};
  const step = activeStepId ? getEffectiveStep(journal, activeStepId) : null;

  const progress = useMemo(() => getProgramProgress(journal), [journal]);
  const streak = useMemo(() => computeJournalStreak(journal.entries, today), [journal.entries, today]);
  const totalEntries = useMemo(
    () => Object.values(journal.entries).filter(isEntryMeaningful).length,
    [journal.entries]
  );
  const wins = useMemo(() => extractWinsForDate(treeData, logs, viewedDate), [treeData, logs, viewedDate]);
  const heatmap = useMemo(() => buildHeatmap(journal.entries, today, 90), [journal.entries, today]);

  // ── Entry mutations ──
  const updateEntry = useCallback((patch) => {
    updateJournal(prev => {
      const entries = { ...prev.entries };
      const cur = entries[viewedDate] || { createdAt: new Date().toISOString() };
      entries[viewedDate] = {
        ...cur,
        ...patch,
        stepId: cur.stepId || prev.program.activeStepId || null,
        updatedAt: new Date().toISOString(),
      };
      return { ...prev, entries };
    });
  }, [updateJournal, viewedDate]);

  // Reflection: local state + debounced commit so typing stays smooth.
  const [reflection, setReflection] = useState(entry.reflection || '');
  const debouncedReflection = useDebounce(reflection, 600);
  useEffect(() => {
    setReflection((journal.entries[viewedDate] || {}).reflection || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewedDate]);
  useEffect(() => {
    const stored = (journal.entries[viewedDate] || {}).reflection || '';
    if (debouncedReflection !== stored) updateEntry({ reflection: debouncedReflection });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedReflection]);

  // Gratitude-style list input: local state + debounced commit.
  const listLines = step?.type === 'list' ? (step.config?.lines || 3) : 0;
  const [listItems, setListItems] = useState([]);
  const debouncedList = useDebounce(listItems, 600);
  useEffect(() => {
    const stored = (journal.entries[viewedDate] || {}).stepData?.items || [];
    setListItems(Array.from({ length: listLines }, (_, i) => stored[i] || ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewedDate, activeStepId, listLines]);
  useEffect(() => {
    if (step?.type !== 'list') return;
    const stored = (journal.entries[viewedDate] || {}).stepData?.items || [];
    const changed = debouncedList.some((v, i) => (v || '') !== (stored[i] || '')) || debouncedList.length !== stored.length;
    if (changed) updateEntry({ stepData: { ...(entry.stepData || {}), items: debouncedList } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedList]);

  // ── Program mutations ──
  const handleAdvance = () => updateJournal(prev => ({ ...prev, program: advanceStep(prev.program, today) }));
  const handleSetActive = (id) => updateJournal(prev => ({ ...prev, program: setActiveStep(prev.program, id, today) }));
  const handleAddStep = (id) => updateJournal(prev => ({ ...prev, program: addStepToProgram(prev.program, id) }));
  const handleRemoveStep = (id) => updateJournal(prev => ({ ...prev, program: removeStepFromProgram(prev.program, id) }));
  const handleSaveOverride = (id, overrides) => updateJournal(prev => ({ ...prev, program: setStepOverride(prev.program, id, overrides) }));

  const appendReflection = (text) => setReflection(r => (r ? `${r.replace(/\s+$/, '')}\n- ${text}` : `- ${text}`));

  // Set the mood and prefill the reflection with this step's preset for that
  // mood — but only when the box is empty or still holds an unedited preset, so
  // we never clobber something the user actually wrote.
  const applyMood = (value) => {
    updateEntry({ mood: value });
    const presets = step?.presets || {};
    const presetText = (presets[MOOD_KEY[value]] || '').trim();
    if (!presetText) return;
    const current = reflection.trim();
    const presetSet = new Set(Object.values(presets).map(v => (v || '').trim()).filter(Boolean));
    if (!current || presetSet.has(current)) {
      setReflection(presetText);
    }
  };

  const counter = step?.type === 'counter' ? (entry.stepData?.count || 0) : 0;
  const counterTarget = step?.config?.target || 8;
  const setCounter = (n) => updateEntry({ stepData: { ...(entry.stepData || {}), count: Math.max(0, n) } });

  const nudge = step ? stepNudge(step.id, wins) : null;
  const inputCls =
    'w-full bg-surface-secondary border border-edge-primary rounded-lg px-3 py-2 text-content-primary focus:outline-none focus:ring-2 focus:ring-edge-focus';

  return (
    <div className="flex-1 overflow-y-auto px-8 md:px-12 pb-10 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Change</h1>
          <p className="text-sm text-content-tertiary">
            {step
              ? `Step ${progress.position} of ${progress.total} · ${step.title}`
              : `Program complete — ${progress.doneCount}/${progress.total} steps`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-secondary/60 border border-edge-secondary">
            <Flame size={16} className={streak > 0 ? 'text-warning' : 'text-content-disabled'} />
            <span className="text-sm font-semibold text-content-primary">{streak}</span>
            <span className="text-xs text-content-muted">day streak</span>
          </div>
          {!isToday && (
            <button
              onClick={() => setViewedDate(today)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-accent hover:bg-accent-subtle border border-edge-secondary transition-colors"
            >
              <CalendarDays size={14} /> Back to today
            </button>
          )}
        </div>
      </div>

      {!isToday && (
        <div className="mb-4 text-xs text-content-muted flex items-center gap-2">
          <CalendarDays size={13} /> Viewing {format(parseISO(viewedDate), 'EEEE, MMM d')} — edits save to that day.
        </div>
      )}

      {/* Mobile step selector — desktop uses the Program rail on the right instead */}
      <div className="lg:hidden mb-4 relative">
        <button
          onClick={() => setStepMenuOpen(o => !o)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-surface-secondary/60 border border-edge-secondary"
        >
          <span className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-content-muted flex-shrink-0">{progress.position}/{progress.total}</span>
            <span className="truncate text-content-primary font-medium">{step ? step.title : 'Program complete'}</span>
          </span>
          <ChevronDown size={16} className={`text-content-tertiary transition-transform flex-shrink-0 ${stepMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {stepMenuOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setStepMenuOpen(false)} />
            <div className="absolute z-30 mt-1 w-full max-h-72 overflow-y-auto rounded-lg bg-surface-primary border border-edge-primary shadow-xl py-1">
              {journal.program.order.map((id) => {
                const s = getEffectiveStep(journal, id);
                if (!s) return null;
                const state = journal.program.steps[id] || {};
                const isActive = id === activeStepId;
                const isDone = state.status === 'done';
                return (
                  <button
                    key={id}
                    onClick={() => { handleSetActive(id); setStepMenuOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left ${isActive ? 'bg-accent-subtle' : 'active:bg-surface-secondary'}`}
                  >
                    <span className="w-4 flex-shrink-0 flex items-center justify-center">
                      {isDone
                        ? <Check size={15} className="text-accent" />
                        : isActive
                          ? <span className="w-2.5 h-2.5 rounded-full bg-warning inline-block" />
                          : <Circle size={13} className="text-content-disabled" />}
                    </span>
                    <span className={`text-sm truncate ${isActive ? 'text-content-primary font-medium' : isDone ? 'text-content-muted line-through' : 'text-content-tertiary'}`}>
                      {s.title}
                    </span>
                  </button>
                );
              })}
              <div className="border-t border-edge-secondary mt-1 pt-1">
                <button
                  onClick={() => { setLibraryOpen(true); setStepMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-content-tertiary active:bg-surface-secondary"
                >
                  <Plus size={15} /> Add from library
                </button>
              </div>
            </div>
          </>
        )}

        {step && (
          <button
            onClick={handleAdvance}
            className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-accent-bold text-content-inverse text-sm font-medium active:bg-accent-bolder"
          >
            Mark done & next <ChevronRight size={15} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current step */}
          <Card className="p-5">
            {step ? (
              <>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-accent" />
                      <h2 className="text-lg font-semibold text-content-primary">{step.title}</h2>
                    </div>
                    <p className="text-xs text-content-muted mt-0.5">{step.subtitle} · {step.category}</p>
                  </div>
                  <button onClick={() => setEditingStepId(step.id)} className="p-1.5 text-content-muted hover:text-accent" title="Edit step text"><Pencil size={15} /></button>
                </div>
                <p className="text-sm text-content-secondary leading-relaxed mb-4">{step.method}</p>
                <p className="text-sm italic text-content-tertiary border-l-2 border-accent-bold pl-3 mb-1">{step.prompt}</p>
                <p className="text-xs text-content-muted mb-4">✎ Answer this in your Reflection below.</p>

                {/* Practiced toggle */}
                <button
                  onClick={() => updateEntry({ practiced: !entry.practiced })}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    entry.practiced
                      ? 'bg-accent-bold text-content-inverse'
                      : 'bg-surface-secondary text-content-tertiary hover:text-content-primary border border-edge-primary'
                  }`}
                >
                  <CheckCircle2 size={16} /> {entry.practiced ? 'Practiced today' : 'Mark as practiced'}
                </button>

                {/* Step-specific input */}
                {step.type === 'counter' && (
                  <div className="mt-4 flex items-center gap-3">
                    <button onClick={() => setCounter(counter - 1)} className="p-2 rounded-lg bg-surface-secondary border border-edge-primary text-content-tertiary hover:text-content-primary"><Minus size={16} /></button>
                    <div className="flex items-center gap-1.5">
                      <Droplet size={18} className="text-accent-secondary" />
                      <span className="text-lg font-semibold text-content-primary">{counter}</span>
                      <span className="text-sm text-content-muted">/ {counterTarget} {step.config?.unit || ''}</span>
                    </div>
                    <button onClick={() => setCounter(counter + 1)} className="p-2 rounded-lg bg-surface-secondary border border-edge-primary text-content-tertiary hover:text-content-primary"><Plus size={16} /></button>
                  </div>
                )}
                {step.type === 'list' && (
                  <div className="mt-4 space-y-2">
                    {Array.from({ length: listLines }).map((_, i) => (
                      <input
                        key={i}
                        className={inputCls}
                        placeholder={step.config?.placeholder || 'Add an item…'}
                        value={listItems[i] || ''}
                        onChange={(e) => setListItems(items => { const next = [...items]; next[i] = e.target.value; return next; })}
                      />
                    ))}
                  </div>
                )}
                {step.type === 'focus' && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-content-tertiary">
                    <Timer size={16} className="text-accent" />
                    {wins.focusSessions.length} focus session{wins.focusSessions.length === 1 ? '' : 's'} logged {isToday ? 'today' : 'that day'}.
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <Trophy size={28} className="text-warning mx-auto mb-3" />
                <p className="text-content-primary font-medium mb-1">You’ve completed the program 🎉</p>
                <p className="text-content-muted text-sm mb-4">Revisit a step or add more from the library.</p>
                <button onClick={() => setLibraryOpen(true)} className="text-sm px-4 py-2 rounded-lg bg-accent-bold text-content-inverse hover:bg-accent-bolder transition-colors">Open library</button>
              </div>
            )}
          </Card>

          {/* Wins from closed tasks */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <ListChecks size={16} className="text-accent" />
              <h3 className="text-sm font-semibold text-content-primary uppercase tracking-wider">Today’s wins</h3>
              <span className="text-xs text-content-muted ml-auto">
                {wins.completedTasks.length} closed · {wins.focusSessions.length} focus
              </span>
            </div>
            {nudge && (
              <p className="text-sm text-accent bg-accent-subtle rounded-lg px-3 py-2 mb-3">{nudge}</p>
            )}
            {wins.completedTasks.length === 0 && wins.focusSessions.length === 0 ? (
              <p className="text-sm text-content-muted">Nothing closed yet {isToday ? 'today' : 'that day'}. Finish a task on the Today tab and it’ll show up here.</p>
            ) : (
              <ul className="space-y-1.5">
                {wins.completedTasks.map((w) => (
                  <li key={w.taskId} className="flex items-center gap-2 text-sm text-content-secondary group">
                    <CheckCircle2 size={14} className="text-accent flex-shrink-0" />
                    <span className="truncate">{w.text}</span>
                    {w.recurring && <span className="text-[10px] text-content-disabled">recurring</span>}
                    <button
                      onClick={() => appendReflection(w.text)}
                      className="ml-auto opacity-0 group-hover:opacity-100 text-xs text-content-tertiary hover:text-accent transition-opacity flex-shrink-0"
                      title="Add to reflection"
                    >
                      + reflect
                    </button>
                  </li>
                ))}
                {wins.focusSessions.map((f) => (
                  <li key={f.id} className="flex items-center gap-2 text-sm text-content-tertiary">
                    <Timer size={14} className="text-accent-secondary flex-shrink-0" />
                    <span className="truncate">{f.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Reflection + mood */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-content-primary uppercase tracking-wider mb-1">Reflection</h3>
            {step?.prompt && (
              <p className="text-sm text-content-secondary mb-3">{step.prompt}</p>
            )}
            <textarea
              className={`${inputCls} min-h-[120px] resize-y`}
              placeholder="Write your answer here…"
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
            />
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <span className="text-xs text-content-muted mr-1">Mood</span>
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => applyMood(m.value)}
                  title={`${m.label} — prefill reflection`}
                  className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-all ${
                    entry.mood === m.value ? 'bg-accent-subtle ring-2 ring-accent-bold scale-105' : 'hover:bg-surface-secondary opacity-70 hover:opacity-100'
                  }`}
                >
                  <span className="text-lg leading-none">{m.emoji}</span>
                  <span className="text-[9px] text-content-muted mt-0.5">{m.label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-content-muted mt-2">Tap a mood to prefill a reflection — then tweak it.</p>
          </Card>
        </div>

        {/* Side column: program rail */}
        <div className="space-y-6">
          <Card className="p-5 hidden lg:block">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-content-primary uppercase tracking-wider">Program</h3>
              <span className="text-xs text-content-muted">{progress.doneCount}/{progress.total}</span>
            </div>
            <div className="space-y-1">
              {journal.program.order.map((id) => {
                const s = getEffectiveStep(journal, id);
                if (!s) return null;
                const state = journal.program.steps[id] || {};
                const isActive = id === activeStepId;
                const isDone = state.status === 'done';
                return (
                  <button
                    key={id}
                    onClick={() => handleSetActive(id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                      isActive ? 'bg-accent-subtle' : 'hover:bg-surface-secondary'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      isDone ? 'bg-accent-bold' : isActive ? 'bg-warning' : 'bg-surface-secondary border border-edge-primary'
                    }`} />
                    <span className={`text-sm truncate ${
                      isActive ? 'text-content-primary font-medium' : isDone ? 'text-content-muted line-through' : 'text-content-tertiary'
                    }`}>
                      {s.title}
                    </span>
                    {isDone && <Check size={13} className="text-accent ml-auto flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2 mt-4">
              {step && (
                <button
                  onClick={handleAdvance}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-accent-bold text-content-inverse text-sm font-medium hover:bg-accent-bolder transition-colors"
                >
                  Mark done & next <ChevronRight size={15} />
                </button>
              )}
              <button
                onClick={() => setLibraryOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-edge-secondary text-content-tertiary hover:text-content-primary hover:bg-surface-secondary text-sm transition-colors"
              >
                <Plus size={15} /> Add from library
              </button>
            </div>
          </Card>

          {/* Consistency */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-content-primary uppercase tracking-wider">Consistency</h3>
              <span className="text-xs text-content-muted">{totalEntries} entries</span>
            </div>
            <div className="grid grid-rows-7 grid-flow-col gap-[3px]">
              {Array.from({ length: heatmap[0]?.dayOfWeek || 0 }).map((_, i) => <div key={`off-${i}`} />)}
              {heatmap.map((cell) => (
                <button
                  key={cell.date}
                  onClick={() => setViewedDate(cell.date)}
                  title={`${cell.date}${cell.logged ? ' · logged' : ''}`}
                  className={`w-3.5 h-3.5 rounded-sm transition-colors ${
                    cell.logged ? 'bg-accent-bold' : 'bg-surface-secondary/60 hover:bg-surface-secondary'
                  } ${cell.date === viewedDate ? 'ring-2 ring-accent-secondary' : ''}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-3 mt-3 text-[10px] text-content-disabled">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-accent-bold inline-block" /> Journaled</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-surface-secondary/60 inline-block" /> Missed</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Habit consistency (recurring-task adherence, folded in from the old Insights tab) */}
      <div className="mt-8">
        <RecurringAdherence tasks={treeData} />
      </div>

      {libraryOpen && (
        <StepLibraryModal
          journal={journal}
          onAdd={handleAddStep}
          onRemove={handleRemoveStep}
          onActivate={(id) => { handleSetActive(id); setLibraryOpen(false); }}
          onEdit={(id) => setEditingStepId(id)}
          onClose={() => setLibraryOpen(false)}
        />
      )}
      {editingStepId && (
        <StepEditModal
          journal={journal}
          stepId={editingStepId}
          onSave={handleSaveOverride}
          onClose={() => setEditingStepId(null)}
        />
      )}
    </div>
  );
}
