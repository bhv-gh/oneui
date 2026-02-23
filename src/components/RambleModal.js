import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { X, Mic, Square, Check, ChevronRight, ChevronUp, Clock, Plus, Search, ArrowLeft, Hash, AtSign } from 'lucide-react';
import Fuse from 'fuse.js';
import { parseTaskInput } from '../utils/taskParser';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// ── Constants ────────────────────────────────────────────────

const CHUNK_SEP = '\x1F';

// ── Duration Parsing ─────────────────────────────────────────

const NUM_WORDS = {
  'a': 1, 'an': 1, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'eleven': 11, 'twelve': 12,
};

function parseDuration(text) {
  const s = text.toLowerCase();
  if (/half\s+(?:an?\s+)?hour/.test(s)) return 0.5;
  if (/quarter\s+(?:of\s+)?(?:an?\s+)?hour/.test(s)) return 0.25;

  const halfHr = s.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a|an)\s+and\s+(?:a\s+)?half\s+hours?/);
  if (halfHr) { const n = NUM_WORDS[halfHr[1]] ?? parseFloat(halfHr[1]); if (!isNaN(n)) return n + 0.5; }

  const hm = s.match(/(\d+(?:\.\d+)?)\s+hours?\s+(?:and\s+)?(\d+)\s+min/);
  if (hm) return parseFloat(hm[1]) + parseFloat(hm[2]) / 60;

  const hr = s.match(/(\d+(?:\.\d+)?)\s+hours?/);
  if (hr) return parseFloat(hr[1]);

  for (const [w, n] of Object.entries(NUM_WORDS)) {
    if (n > 0 && new RegExp(`\\b${w}\\s+hours?\\b`).test(s)) return n;
  }

  const mn = s.match(/(\d+)\s+min(?:utes?)?/);
  if (mn) return parseFloat(mn[1]) / 60;

  return null;
}

function formatDuration(hours) {
  if (hours == null) return '';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function stripDurationPhrase(text) {
  return text
    .replace(/,?\s*(?:and\s+)?(?:(?:it\s+)?(?:took|spent)|(?:i\s+)?logged?|for)\s+(?:me\s+)?(?:about\s+)?(?:[\d.]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|an?|half|quarter)[\w\s]*?(?:hours?|minutes?|mins?)\b/gi, '')
    .replace(/\s*[,;]\s*$/, '')
    .trim();
}

// ── Action Detection ─────────────────────────────────────────

function parseActionFromSegment(text) {
  const clean = text.replace(/[.!?;]+$/g, '').replace(/\s+/g, ' ').trim();
  if (!clean || clean.length < 3) return null;

  // Completion patterns
  const completionREs = [
    /(?:i(?:'ve|'ve| have)?\s+(?:just\s+)?(?:finished|completed)|(?:i'm|i am|i'm)\s+done\s+with|done\s+with|finished|completed)\s+(?:the\s+|a\s+|my\s+)?(.+)/i,
    /(?:checked|ticked)\s+off\s+(?:the\s+|a\s+|my\s+)?(.+)/i,
    /(?:mark|set)\s+(?:the\s+|a\s+|my\s+)?(.+?)\s+(?:as\s+)?(?:done|complete|finished)/i,
  ];

  for (const re of completionREs) {
    const m = clean.match(re);
    if (m) {
      let ref = m[1].trim();
      const dur = parseDuration(ref);
      ref = stripDurationPhrase(ref);
      if (!ref) continue;
      return dur != null
        ? { type: 'complete_and_log', taskRef: ref, hours: dur }
        : { type: 'complete', taskRef: ref };
    }
  }

  // Log patterns: [duration-part, task-part]
  const logREs = [
    /(?:log|logged)\s+(?:the\s+)?(?:last\s+)?(.+?)\s+(?:for|on)\s+(?:the\s+|a\s+|my\s+)?(.+)/i,
    /spent\s+(.+?)\s+(?:on|doing|working\s+on)\s+(?:the\s+|a\s+|my\s+)?(.+)/i,
    /worked\s+on\s+(?:the\s+|a\s+|my\s+)?(.+?)\s+for\s+(.+)/i,
    /(.+?)\s+took\s+(?:me\s+)?(?:about\s+)?(.+)/i,
  ];

  for (const re of logREs) {
    const m = clean.match(re);
    if (m) {
      const p1 = m[1].trim(), p2 = m[2].trim();
      const d1 = parseDuration(p1), d2 = parseDuration(p2);
      if (d1 != null && p2.length > 1) return { type: 'log', taskRef: p2, hours: d1 };
      if (d2 != null && p1.length > 1) return { type: 'log', taskRef: p1, hours: d2 };
    }
  }

  return null;
}

// ── Existing New-Task Parser ─────────────────────────────────

const CMD_ROOT = 'another\\s+task|next\\s+task|new\\s+task|after\\s+that|and\\s+then|next\\s+one|next';
const CMD_SUB = 'another\\s+subtask|another\\s+sub\\s+task|sub\\s+task|subtask|including|which\\s+includes';
const CMD_UP = 'level\\s+up|go\\s+up|back\\s+up|go\\s+back|step\\s+back';
const CMD_CONT = 'and\\s+also|also\\s+need\\s+to|i\\s+also\\s+need|another\\s+one|also';
const CMD_PATTERN = new RegExp(`\\b(${CMD_ROOT}|${CMD_SUB}|${CMD_UP}|${CMD_CONT})\\b`, 'i');

const ROOT_TEST = /^(next|next task|new task|another task|and then|after that|next one)$/;
const SUB_TEST = /^(subtask|sub task|another subtask|another sub task|including|which includes)$/;
const UP_TEST = /^(level up|go up|back up|go back|step back)$/;
const CONT_TEST = /^(also|and also|also need to|i also need|another one)$/;
const MERGE_PREFIX = /^(with|from|by|using|at|in|on|into|through|during)\b/i;

function formatTaskText(text) {
  let clean = text
    .replace(/^(and|but|or|so|also|then|i need to|need to|i have to|have to|i want to|want to|i gotta|gotta)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function parseTranscript(text) {
  const tasks = [];
  const path = [];
  const prepared = text
    .replace(/\x1F/g, ` ${CHUNK_SEP} `)
    .replace(/[.!?;]+(?=\s|$)/g, ` ${CHUNK_SEP}`)
    .replace(/[,:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!prepared) return { tasks, depth: 0, parentText: null };

  function lastAtLevel() {
    if (path.length === 0) return tasks.length > 0 ? tasks[tasks.length - 1] : null;
    const p = path[path.length - 1];
    return p.children.length > 0 ? p.children[p.children.length - 1] : null;
  }
  function addTask(t) {
    const task = { text: t, children: [] };
    if (path.length === 0) tasks.push(task); else path[path.length - 1].children.push(task);
    return task;
  }
  function mergeIntoLast(t) {
    const last = lastAtLevel();
    if (last) { last.text += ' ' + t.charAt(0).toLowerCase() + t.slice(1); return true; }
    return false;
  }

  for (const segment of prepared.split(CMD_PATTERN)) {
    const cmd = segment.replace(/\x1F/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!cmd) continue;
    if (ROOT_TEST.test(cmd)) { path.length = 0; continue; }
    if (SUB_TEST.test(cmd)) { const l = lastAtLevel(); if (l) path.push(l); continue; }
    if (UP_TEST.test(cmd)) { if (path.length > 0) path.pop(); continue; }
    if (CONT_TEST.test(cmd)) continue;

    for (const chunk of segment.split(CHUNK_SEP).map(c => c.trim()).filter(c => c.length > 0)) {
      if (MERGE_PREFIX.test(chunk)) { if (!mergeIntoLast(chunk)) addTask(formatTaskText(chunk)); continue; }
      const t = formatTaskText(chunk);
      if (t) addTask(t);
    }
  }
  return { tasks, depth: path.length, parentText: path.length > 0 ? path[path.length - 1].text : null };
}

// ── Combined Action Parser ───────────────────────────────────

function parseRambleActions(text, fuse) {
  if (!text || !text.trim()) return [];

  const actions = [];
  const nonActionParts = [];

  // Split transcript by chunk separators (natural pauses)
  const chunks = text.split(CHUNK_SEP).map(c => c.trim()).filter(c => c.length > 0);

  for (const chunk of chunks) {
    // Try sentence-level splitting within each chunk
    const sentences = chunk.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);

    for (const sentence of sentences) {
      const action = parseActionFromSegment(sentence);
      if (action) {
        const results = fuse.search(action.taskRef);
        action.matchedTask = results.length > 0 ? results[0].item : null;
        action.matchScore = results.length > 0 ? results[0].score : null;
        actions.push(action);
      } else {
        nonActionParts.push(sentence);
      }
    }
  }

  // Parse remaining non-action text for new tasks
  if (nonActionParts.length > 0) {
    const { tasks } = parseTranscript(nonActionParts.join(CHUNK_SEP));
    for (const task of tasks) {
      const { text: cleanText, project, tags } = parseTaskInput(task.text);
      actions.push({ type: 'new_task', text: cleanText, children: task.children || [], project, tags });
    }
  }

  // Merge: if a complete and a log reference the same task, combine
  const merged = [];
  const completeIdx = {};
  for (const action of actions) {
    if (action.type === 'complete' && action.matchedTask) {
      completeIdx[action.matchedTask.id] = merged.length;
      merged.push(action);
    } else if (action.type === 'log' && action.matchedTask && completeIdx[action.matchedTask.id] !== undefined) {
      const target = merged[completeIdx[action.matchedTask.id]];
      target.type = 'complete_and_log';
      target.hours = action.hours;
    } else {
      merged.push(action);
    }
  }

  return merged;
}

// ── Helpers ──────────────────────────────────────────────────

function countTasks(tasks) {
  return tasks.reduce((n, t) => n + 1 + countTasks(t.children || []), 0);
}

function countByType(actions) {
  let completes = 0, logs = 0, newTasks = 0;
  for (const a of actions) {
    if (a.type === 'complete') completes++;
    else if (a.type === 'log') logs++;
    else if (a.type === 'complete_and_log') { completes++; logs++; }
    else if (a.type === 'new_task') newTasks += 1 + countTasks(a.children || []);
  }
  return { completes, logs, newTasks };
}

// ── Renderers ────────────────────────────────────────────────

function renderTaskTree(items, depth = 0) {
  return items.map((task, i) => (
    <div key={i}>
      <div className="flex items-center gap-2 py-0.5" style={{ paddingLeft: depth * 16 }}>
        <div className={`rounded-full border-2 flex-shrink-0 ${
          depth === 0 ? 'w-3 h-3 border-edge-primary' : 'w-2.5 h-2.5 border-edge-secondary'
        }`} />
        <span className={`text-xs ${depth === 0 ? 'text-content-primary' : 'text-content-secondary'}`}>{task.text}</span>
      </div>
      {task.children?.length > 0 && renderTaskTree(task.children, depth + 1)}
    </div>
  ));
}

// ── Component ────────────────────────────────────────────────

export default function RambleModal({ isOpen, onClose, onAddTasks, treeData, onUpdate, onSaveLog, selectedDate }) {
  const [phase, setPhase] = useState('record'); // 'record' | 'review'
  const [isRecording, setIsRecording] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [reviewActions, setReviewActions] = useState([]);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editQuery, setEditQuery] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const recognitionRef = useRef(null);
  const editInputRef = useRef(null);

  // Flatten tree for fuzzy matching
  const flatTree = useMemo(() => {
    const list = [];
    const traverse = (nodes, path = []) => {
      nodes.forEach(node => {
        list.push({ id: node.id, text: node.text || 'Untitled', path: [...path] });
        if (node.children) traverse(node.children, [...path, node.text || 'Untitled']);
      });
    };
    traverse(treeData || []);
    return list;
  }, [treeData]);

  const fuse = useMemo(() => new Fuse(flatTree, {
    keys: ['text', 'path'],
    threshold: 0.6,
    includeScore: true,
  }), [flatTree]);

  // Live parsed actions (during recording)
  const liveActions = useMemo(() => {
    const text = finalTranscript + (interimTranscript ? CHUNK_SEP + interimTranscript : '');
    return parseRambleActions(text, fuse);
  }, [finalTranscript, interimTranscript, fuse]);

  // For depth/parent indicator (task creation commands)
  const liveParse = useMemo(() => {
    return parseTranscript(finalTranscript + (interimTranscript ? ' ' + interimTranscript : ''));
  }, [finalTranscript, interimTranscript]);

  const hasActions = liveActions.some(a => a.type !== 'new_task');
  const liveStats = useMemo(() => countByType(liveActions), [liveActions]);

  // ── Recording ──────────────────────────────────────────────

  const startRecording = useCallback(() => {
    if (!SpeechRecognition) { setError('Speech recognition is not supported.'); return; }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '', final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t; else interim += t;
      }
      if (final) setFinalTranscript(prev => prev ? prev + CHUNK_SEP + final : final);
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      setError(`Recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) { try { recognition.start(); } catch {} }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); setIsRecording(true); setError(null); }
    catch { setError('Could not start speech recognition.'); }
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      rec.stop();
    }
    setIsRecording(false);
    setInterimTranscript('');
  }, []);

  // Auto-start on open
  useEffect(() => {
    if (isOpen && SpeechRecognition) {
      setPhase('record');
      setFinalTranscript('');
      setInterimTranscript('');
      setError(null);
      setReviewActions([]);
      setEditingIdx(null);
      setConfirmation(null);
      const timer = setTimeout(() => startRecording(), 300);
      return () => clearTimeout(timer);
    }
    return () => {
      if (recognitionRef.current) { const r = recognitionRef.current; recognitionRef.current = null; r.stop(); }
    };
  }, [isOpen, startRecording]);

  useEffect(() => {
    if (editingIdx !== null && editInputRef.current) editInputRef.current.focus();
  }, [editingIdx]);

  // ── Handlers ───────────────────────────────────────────────

  const handleClose = useCallback(() => {
    stopRecording();
    setFinalTranscript('');
    setPhase('record');
    onClose();
  }, [stopRecording, onClose]);

  const handleStartReview = () => {
    stopRecording();
    const actions = parseRambleActions(finalTranscript, fuse);
    setReviewActions(actions.map(a => ({ ...a, enabled: true })));
    setPhase('review');
  };

  const handleBackToRecord = () => {
    setPhase('record');
    setEditingIdx(null);
    setEditQuery('');
  };

  const toggleAction = (idx) => {
    setReviewActions(prev => prev.map((a, i) => i === idx ? { ...a, enabled: !a.enabled } : a));
  };

  const changeMatch = (idx, newTask) => {
    setReviewActions(prev => prev.map((a, i) => i === idx ? { ...a, matchedTask: newTask, matchScore: 0 } : a));
    setEditingIdx(null);
    setEditQuery('');
  };

  const editResults = useMemo(() => {
    if (!editQuery.trim()) return flatTree.slice(0, 6);
    return fuse.search(editQuery).slice(0, 6).map(r => r.item);
  }, [editQuery, fuse, flatTree]);

  const handleApply = () => {
    const enabled = reviewActions.filter(a => a.enabled);
    const newTasks = [];

    for (const action of enabled) {
      if (action.type === 'new_task') {
        const task = { text: action.text, children: action.children || [] };
        if (action.project) task.project = action.project;
        if (action.tags?.length > 0) task.tags = action.tags;
        newTasks.push(task);
      }
      if ((action.type === 'complete' || action.type === 'complete_and_log') && action.matchedTask) {
        onUpdate(action.matchedTask.id, { isCompleted: true }, selectedDate);
      }
      if ((action.type === 'log' || action.type === 'complete_and_log') && action.matchedTask && action.hours) {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - action.hours * 3600000);
        onSaveLog({ text: action.matchedTask.text, startTime, endTime });
      }
    }

    if (newTasks.length > 0) onAddTasks(newTasks);

    const stats = countByType(enabled);
    const parts = [];
    if (stats.completes > 0) parts.push(`${stats.completes} completed`);
    if (stats.logs > 0) parts.push(`${stats.logs} logged`);
    if (stats.newTasks > 0) parts.push(`${stats.newTasks} new task${stats.newTasks > 1 ? 's' : ''}`);
    setConfirmation(parts.join(', ') || 'Done');
    setTimeout(handleClose, 1200);
  };

  // Quick-add (no review, new tasks only — same as original)
  const handleQuickAdd = () => {
    const newTasks = liveActions
      .filter(a => a.type === 'new_task')
      .map(a => {
        const task = { text: a.text, children: a.children || [] };
        if (a.project) task.project = a.project;
        if (a.tags?.length > 0) task.tags = a.tags;
        return task;
      });
    if (newTasks.length > 0) onAddTasks(newTasks);
    stopRecording();
    setFinalTranscript('');
    onClose();
  };

  const handleCommandButton = (command) => {
    setFinalTranscript(prev => prev + ` ${command} `);
  };

  if (!isOpen) return null;

  if (!SpeechRecognition) {
    return (
      <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-surface-primary border border-edge-primary rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-content-primary">Ramble</h3>
            <button onClick={handleClose} className="p-1 text-content-muted hover:text-content-inverse rounded-full"><X size={20} /></button>
          </div>
          <p className="text-content-tertiary text-sm">Speech recognition is not supported in this browser. Try Chrome or Safari.</p>
        </div>
      </div>
    );
  }

  // ── Confirmation Flash ─────────────────────────────────────

  if (confirmation) {
    return (
      <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-surface-primary border border-edge-primary rounded-2xl shadow-2xl w-full max-w-sm p-8 animate-in fade-in zoom-in-95 duration-200 text-center">
          <div className="w-12 h-12 rounded-full bg-accent-subtle flex items-center justify-center mx-auto mb-4">
            <Check size={24} className="text-accent" />
          </div>
          <p className="text-lg font-semibold text-content-primary mb-1">Applied</p>
          <p className="text-sm text-content-tertiary">{confirmation}</p>
        </div>
      </div>
    );
  }

  // ── Review Phase ───────────────────────────────────────────

  if (phase === 'review') {
    const enabledCount = reviewActions.filter(a => a.enabled).length;

    return (
      <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-surface-primary border border-edge-primary rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 pt-5 pb-3">
            <button onClick={handleBackToRecord} className="p-1 text-content-muted hover:text-content-primary rounded-full transition-colors">
              <ArrowLeft size={18} />
            </button>
            <h3 className="text-lg font-semibold text-content-primary flex-1">Review Actions</h3>
            <button onClick={handleClose} className="p-1 text-content-muted hover:text-content-inverse rounded-full"><X size={20} /></button>
          </div>

          {/* Action list */}
          <div className="flex-1 overflow-y-auto px-5 py-2 space-y-2">
            {reviewActions.map((action, idx) => (
              <div
                key={idx}
                className={`rounded-xl border transition-all ${
                  action.enabled ? 'border-edge-primary bg-surface-primary' : 'border-edge-secondary bg-surface-tertiary opacity-50'
                }`}
              >
                <div className="flex items-start gap-3 p-3">
                  {/* Toggle checkbox */}
                  <button
                    onClick={() => toggleAction(idx)}
                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      action.enabled ? 'bg-accent-bold border-accent-bold text-white' : 'border-edge-primary text-transparent'
                    }`}
                  >
                    <Check size={12} strokeWidth={3} />
                  </button>

                  <div className="flex-1 min-w-0">
                    {/* Type badges */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {(action.type === 'complete' || action.type === 'complete_and_log') && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-accent px-1.5 py-0.5 bg-accent-subtle rounded">
                          <Check size={10} /> Complete
                        </span>
                      )}
                      {(action.type === 'log' || action.type === 'complete_and_log') && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-accent-secondary px-1.5 py-0.5 bg-accent-secondary-subtle rounded">
                          <Clock size={10} /> {formatDuration(action.hours)}
                        </span>
                      )}
                      {action.type === 'new_task' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-content-tertiary px-1.5 py-0.5 bg-surface-secondary rounded">
                          <Plus size={10} /> New Task
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    {action.type === 'new_task' ? (
                      <div>
                        <p className="text-sm text-content-primary font-medium">{action.text}</p>
                        {action.children?.length > 0 && <div className="mt-1 ml-2">{renderTaskTree(action.children)}</div>}
                        {(action.project || action.tags?.length > 0) && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {action.project && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-accent-secondary-subtle text-accent-secondary-bold rounded-full">
                                <AtSign size={8} />{action.project}
                              </span>
                            )}
                            {(action.tags || []).map(tag => (
                              <span key={tag} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 border border-edge-secondary text-content-tertiary rounded-full">
                                <Hash size={8} />{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-content-muted italic mb-1">"{action.taskRef}"</p>

                        {editingIdx === idx ? (
                          /* Inline task search picker */
                          <div className="bg-surface-secondary rounded-lg p-2 animate-in fade-in duration-150">
                            <div className="flex items-center gap-2 mb-2">
                              <Search size={12} className="text-content-muted flex-shrink-0" />
                              <input
                                ref={editInputRef}
                                type="text"
                                value={editQuery}
                                onChange={(e) => setEditQuery(e.target.value)}
                                placeholder="Search tasks..."
                                className="flex-1 bg-transparent text-xs text-content-primary outline-none placeholder-content-muted"
                                onKeyDown={(e) => { if (e.key === 'Escape') { setEditingIdx(null); setEditQuery(''); } }}
                              />
                              <button onClick={() => { setEditingIdx(null); setEditQuery(''); }} className="p-0.5 text-content-muted hover:text-content-secondary">
                                <X size={12} />
                              </button>
                            </div>
                            <div className="max-h-[120px] overflow-y-auto space-y-0.5">
                              {editResults.map(item => (
                                <button
                                  key={item.id}
                                  onClick={() => changeMatch(idx, item)}
                                  className="w-full text-left px-2 py-1.5 rounded-md hover:bg-surface-primary transition-colors"
                                >
                                  <p className="text-xs text-content-primary font-medium truncate">{item.text}</p>
                                  {item.path.length > 0 && <p className="text-[10px] text-content-muted truncate">{item.path.join(' / ')}</p>}
                                </button>
                              ))}
                              {editResults.length === 0 && <p className="text-[10px] text-content-muted text-center py-2">No matching tasks</p>}
                            </div>
                          </div>
                        ) : action.matchedTask ? (
                          /* Matched task display */
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <ChevronRight size={10} className="text-accent flex-shrink-0" />
                                <p className="text-sm text-content-primary font-medium truncate">{action.matchedTask.text}</p>
                                {action.matchScore != null && action.matchScore > 0.4 && (
                                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-warning" title="Weak match" />
                                )}
                              </div>
                              {action.matchedTask.path?.length > 0 && (
                                <p className="text-[10px] text-content-muted truncate ml-4">{action.matchedTask.path.join(' / ')}</p>
                              )}
                            </div>
                            <button
                              onClick={() => { setEditingIdx(idx); setEditQuery(''); }}
                              className="text-[10px] text-content-muted hover:text-accent transition-colors flex-shrink-0 px-1.5 py-0.5 rounded hover:bg-surface-secondary"
                            >
                              Change
                            </button>
                          </div>
                        ) : (
                          /* No match */
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-danger flex-1">No matching task found</p>
                            <button
                              onClick={() => { setEditingIdx(idx); setEditQuery(action.taskRef || ''); }}
                              className="text-[10px] text-accent hover:text-accent-bold transition-colors flex-shrink-0 px-1.5 py-0.5 rounded hover:bg-surface-secondary"
                            >
                              Search
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {reviewActions.length === 0 && (
              <div className="text-center py-8">
                <p className="text-content-muted text-sm">No actions detected. Go back and try again.</p>
              </div>
            )}
          </div>

          {/* Apply footer */}
          <div className="px-5 pb-5 pt-3 border-t border-edge-secondary">
            <button
              onClick={handleApply}
              disabled={enabledCount === 0}
              className="w-full py-3 rounded-xl text-sm font-medium bg-accent-bolder text-content-inverse active:bg-accent-boldest disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Check size={16} />
              Apply {enabledCount} Action{enabledCount !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Record Phase ───────────────────────────────────────────

  const actionItems = liveActions.filter(a => a.type !== 'new_task');
  const newTaskItems = liveActions.filter(a => a.type === 'new_task');

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-primary border border-edge-primary rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <Mic size={18} className="text-accent" />
            <h3 className="text-lg font-semibold text-content-primary">Ramble</h3>
          </div>
          <button onClick={handleClose} className="p-1 text-content-muted hover:text-content-inverse rounded-full"><X size={20} /></button>
        </div>

        {/* Instructions */}
        <div className="px-5 pb-3">
          <p className="text-xs text-content-muted">
            Speak naturally. Say <span className="text-content-secondary font-medium">"I finished X"</span> to complete, <span className="text-content-secondary font-medium">"log 2 hours for X"</span> to log time, or just describe new tasks.
          </p>
        </div>

        {/* Live preview */}
        <div className="flex-1 overflow-y-auto px-5 min-h-[100px] max-h-[40vh]">
          {liveActions.length === 0 ? (
            <div className="flex items-center justify-center h-full py-8">
              <p className="text-content-disabled text-sm italic">Start speaking...</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {/* Detected actions */}
              {actionItems.map((action, i) => (
                <div key={`a-${i}`} className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg bg-surface-secondary/50">
                  {(action.type === 'complete' || action.type === 'complete_and_log') && <Check size={12} className="text-accent flex-shrink-0" />}
                  {action.type === 'log' && <Clock size={12} className="text-accent-secondary flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-content-tertiary">
                      {action.type === 'complete' && 'Complete: '}
                      {action.type === 'log' && `Log ${formatDuration(action.hours)}: `}
                      {action.type === 'complete_and_log' && `Complete + ${formatDuration(action.hours)}: `}
                    </span>
                    <span className="text-xs text-content-primary font-medium">
                      {action.matchedTask ? action.matchedTask.text : action.taskRef}
                    </span>
                    {action.matchedTask && action.matchScore > 0.4 && <span className="ml-1 text-[10px] text-warning">(weak)</span>}
                    {!action.matchedTask && <span className="ml-1 text-[10px] text-danger">(no match)</span>}
                  </div>
                </div>
              ))}

              {/* New tasks */}
              {newTaskItems.length > 0 && (
                <div className="space-y-0.5">
                  {actionItems.length > 0 && (
                    <div className="text-[10px] text-content-disabled uppercase tracking-wider mt-2 mb-1">New Tasks</div>
                  )}
                  {newTaskItems.map((action, i) => (
                    <div key={`t-${i}`}>
                      <div className="flex items-center gap-2 py-0.5">
                        <div className="w-3 h-3 rounded-full border-2 border-edge-primary flex-shrink-0" />
                        <span className="text-xs text-content-primary">{action.text}</span>
                        {action.project && (
                          <span className="text-[9px] px-1 py-0.5 bg-accent-secondary-subtle text-accent-secondary-bold rounded-full">@{action.project}</span>
                        )}
                      </div>
                      {action.children?.length > 0 && <div className="ml-4">{renderTaskTree(action.children, 1)}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Transcript status */}
        <div className="px-5 py-3 border-t border-edge-secondary">
          <div className="flex items-start gap-2">
            {isRecording && <span className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full bg-danger animate-pulse" />}
            <p className="text-sm text-content-muted italic min-h-[1.25rem]">
              {interimTranscript || (isRecording ? 'Listening...' : 'Stopped')}
            </p>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <ChevronRight size={12} className="text-content-disabled" />
            <span className="text-xs text-content-disabled">
              {liveParse.depth > 0 && liveParse.parentText
                ? `Under "${liveParse.parentText}" · depth ${liveParse.depth + 1}`
                : 'Root level'}
            </span>
          </div>
        </div>

        {error && <div className="px-5 py-2"><p className="text-xs text-danger">{error}</p></div>}

        {/* Command buttons */}
        <div className="px-5 py-3 border-t border-edge-secondary flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleCommandButton('next task')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors active:scale-95 ${
              liveParse.depth === 0
                ? 'bg-accent-secondary-subtle text-accent-secondary border-accent-secondary'
                : 'bg-surface-secondary text-accent-secondary border-edge-primary'
            }`}
          >
            + Task
          </button>
          <button
            onClick={() => handleCommandButton('subtask')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors active:scale-95 ${
              liveParse.depth > 0
                ? 'bg-amber-950/50 text-amber-400 border-amber-800'
                : 'bg-surface-secondary text-amber-400 border-edge-primary'
            }`}
          >
            + Subtask
          </button>
          {liveParse.depth > 0 && (
            <>
              <button onClick={() => handleCommandButton('also')} className="px-3 py-1.5 rounded-full text-xs font-medium bg-amber-950/50 text-amber-400 border border-amber-800 transition-colors active:scale-95">
                + Another
              </button>
              <button onClick={() => handleCommandButton('go up')} className="px-3 py-1.5 rounded-full text-xs font-medium bg-surface-secondary text-accent border border-edge-primary transition-colors active:scale-95 flex items-center gap-1">
                <ChevronUp size={12} /> Up
              </button>
            </>
          )}
          <div className="flex-1" />
          {isRecording ? (
            <button onClick={stopRecording} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-secondary text-danger border border-edge-primary">
              <Square size={12} /> Stop
            </button>
          ) : (
            <button onClick={startRecording} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-secondary text-accent border border-edge-primary">
              <Mic size={12} /> Resume
            </button>
          )}
        </div>

        {/* Footer action */}
        <div className="px-5 pb-5 pt-2">
          {hasActions ? (
            <button
              onClick={handleStartReview}
              disabled={liveActions.length === 0}
              className="w-full py-3 rounded-xl text-sm font-medium bg-accent-bolder text-content-inverse active:bg-accent-boldest disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Check size={16} />
              <span>Review & Apply</span>
              <span className="text-xs opacity-80">
                ({[
                  liveStats.completes > 0 && `${liveStats.completes} done`,
                  liveStats.logs > 0 && `${liveStats.logs} log${liveStats.logs > 1 ? 's' : ''}`,
                  liveStats.newTasks > 0 && `${liveStats.newTasks} new`,
                ].filter(Boolean).join(', ')})
              </span>
            </button>
          ) : (
            <button
              onClick={handleQuickAdd}
              disabled={newTaskItems.length === 0}
              className="w-full py-3 rounded-xl text-sm font-medium bg-accent-bolder text-content-inverse active:bg-accent-boldest disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Check size={16} />
              {liveStats.newTasks > 0 ? `Add ${liveStats.newTasks} Task${liveStats.newTasks > 1 ? 's' : ''}` : 'Add Tasks'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const isSpeechSupported = !!SpeechRecognition;
