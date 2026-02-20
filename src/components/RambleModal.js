import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { X, Mic, MicOff, Square, Check, ChevronRight, ChevronUp } from 'lucide-react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// ── Parser ──────────────────────────────────────────────────

const CHUNK_SEP = '\x1F'; // Marks natural pauses between speech chunks

// Clean text for command matching (strips chunk markers and punctuation)
function cleanTranscript(text) {
  return text
    .replace(/\x1F/g, ' ')
    .replace(/[.,!?;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Command patterns
const CMD_ROOT = 'another\\s+task|next\\s+task|new\\s+task|after\\s+that|and\\s+then|next\\s+one|next';
const CMD_SUB = 'another\\s+subtask|another\\s+sub\\s+task|sub\\s+task|subtask|including|which\\s+includes';
const CMD_UP = 'level\\s+up|go\\s+up|back\\s+up|go\\s+back|step\\s+back';
const CMD_CONT = 'and\\s+also|also\\s+need\\s+to|i\\s+also\\s+need|another\\s+one|also';
const CMD_PATTERN = new RegExp(`\\b(${CMD_ROOT}|${CMD_SUB}|${CMD_UP}|${CMD_CONT})\\b`, 'i');

const ROOT_TEST = /^(next|next task|new task|another task|and then|after that|next one)$/;
const SUB_TEST = /^(subtask|sub task|another subtask|another sub task|including|which includes)$/;
const UP_TEST = /^(level up|go up|back up|go back|step back)$/;
const CONT_TEST = /^(also|and also|also need to|i also need|another one)$/;

// Prepositional starts — continue the previous task, not start a new one
const MERGE_PREFIX = /^(with|from|by|using|at|in|on|into|through|during)\b/i;

// Clean up task text: strip leading filler/intent phrases, capitalize
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
  const path = []; // stack of parent task refs for nesting

  const prepared = text
    .replace(/\x1F/g, ` ${CHUNK_SEP} `)
    .replace(/[.!?;]+(?=\s|$)/g, ` ${CHUNK_SEP}`)
    .replace(/[,:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!prepared) return { tasks, depth: 0, parentText: null };

  // Get the last task at the current nesting level
  function lastAtLevel() {
    if (path.length === 0) {
      return tasks.length > 0 ? tasks[tasks.length - 1] : null;
    }
    const parent = path[path.length - 1];
    return parent.children.length > 0 ? parent.children[parent.children.length - 1] : null;
  }

  // Add a task at the current nesting level
  function addTask(taskText) {
    const task = { text: taskText, children: [] };
    if (path.length === 0) {
      tasks.push(task);
    } else {
      path[path.length - 1].children.push(task);
    }
    return task;
  }

  // Merge text into the last task at the current level
  function mergeIntoLast(text) {
    const last = lastAtLevel();
    if (last) {
      last.text += ' ' + text.charAt(0).toLowerCase() + text.slice(1);
      return true;
    }
    return false;
  }

  const segments = prepared.split(CMD_PATTERN);

  for (const segment of segments) {
    const cmdCheck = segment.replace(/\x1F/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!cmdCheck) continue;

    // Command handling
    if (ROOT_TEST.test(cmdCheck)) { path.length = 0; continue; }
    if (SUB_TEST.test(cmdCheck)) {
      const last = lastAtLevel();
      if (last) path.push(last);
      continue;
    }
    if (UP_TEST.test(cmdCheck)) {
      if (path.length > 0) path.pop();
      continue;
    }
    if (CONT_TEST.test(cmdCheck)) { continue; }

    // Split on chunk boundaries (pauses + sentence endings)
    const chunks = segment
      .split(CHUNK_SEP)
      .map(c => c.trim())
      .filter(c => c.length > 0);

    for (const chunk of chunks) {
      if (MERGE_PREFIX.test(chunk)) {
        if (!mergeIntoLast(chunk)) addTask(formatTaskText(chunk));
        continue;
      }

      const taskText = formatTaskText(chunk);
      if (!taskText) continue;
      addTask(taskText);
    }
  }

  return {
    tasks,
    depth: path.length,
    parentText: path.length > 0 ? path[path.length - 1].text : null,
  };
}

function countTasks(tasks) {
  return tasks.reduce((n, t) => n + 1 + countTasks(t.children || []), 0);
}

// ── Recursive task renderer ─────────────────────────────────

function renderTaskTree(items, depth = 0) {
  return items.map((task, i) => (
    <div key={i}>
      <div className="flex items-center gap-2 py-1" style={{ paddingLeft: depth * 20 }}>
        <div className={`rounded-full border-2 flex-shrink-0 ${
          depth === 0 ? 'w-4 h-4 border-slate-600' :
          depth === 1 ? 'w-3.5 h-3.5 border-slate-700' :
          'w-3 h-3 border-slate-700/60'
        }`} />
        <span className={`text-sm ${
          depth === 0 ? 'text-slate-200' :
          depth === 1 ? 'text-slate-300' :
          'text-slate-400'
        }`}>
          {task.text}
        </span>
      </div>
      {task.children?.length > 0 && renderTaskTree(task.children, depth + 1)}
    </div>
  ));
}

// ── Component ───────────────────────────────────────────────

export default function RambleModal({ isOpen, onClose, onAddTasks }) {
  const [isRecording, setIsRecording] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  const parsed = useMemo(() => parseTranscript(finalTranscript), [finalTranscript]);
  const parsedTasks = parsed.tasks;
  const taskCount = useMemo(() => countTasks(parsedTasks), [parsedTasks]);
  const currentDepth = parsed.depth;
  const parentText = parsed.parentText;

  // Determine what interim text would become
  const interimPreview = useMemo(() => {
    if (!interimTranscript.trim()) return null;
    return parseTranscript(finalTranscript + ' ' + interimTranscript).tasks;
  }, [finalTranscript, interimTranscript]);

  const displayTasks = interimPreview && interimPreview.length > 0 ? interimPreview : parsedTasks;

  const startRecording = useCallback(() => {
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (final) {
        setFinalTranscript(prev => prev ? prev + CHUNK_SEP + final : final);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return; // Ignore silence
      if (event.error === 'aborted') return;
      setError(`Recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      // Auto-restart if still supposed to be recording
      if (recognitionRef.current === recognition) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError('Could not start speech recognition.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null; // Prevent auto-restart
      rec.stop();
    }
    setIsRecording(false);
    setInterimTranscript('');
  }, []);

  // Auto-start recording when modal opens
  useEffect(() => {
    if (isOpen && SpeechRecognition) {
      setFinalTranscript('');
      setInterimTranscript('');
      setError(null);
      // Small delay so modal animation finishes
      const timer = setTimeout(() => startRecording(), 300);
      return () => clearTimeout(timer);
    }
    return () => {
      if (recognitionRef.current) {
        const rec = recognitionRef.current;
        recognitionRef.current = null;
        rec.stop();
      }
    };
  }, [isOpen, startRecording]);

  const handleClose = () => {
    stopRecording();
    setFinalTranscript('');
    onClose();
  };

  const handleAddAll = () => {
    if (parsedTasks.length > 0) {
      onAddTasks(parsedTasks);
    }
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
        <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Ramble</h3>
            <button onClick={handleClose} className="p-1 text-slate-500 hover:text-white rounded-full">
              <X size={20} />
            </button>
          </div>
          <p className="text-slate-400 text-sm">Speech recognition is not supported in this browser. Try Chrome or Safari.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <Mic size={18} className="text-emerald-400" />
            <h3 className="text-lg font-semibold text-slate-100">Ramble</h3>
          </div>
          <button onClick={handleClose} className="p-1 text-slate-500 hover:text-white rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Instructions */}
        <div className="px-5 pb-3">
          <p className="text-xs text-slate-500">
            Pause between tasks to auto-split. Say <span className="text-slate-300 font-medium">"subtask"</span> for children, or use the buttons below.
          </p>
        </div>

        {/* Task preview */}
        <div className="flex-1 overflow-y-auto px-5 min-h-[120px] max-h-[40vh]">
          {displayTasks.length === 0 ? (
            <div className="flex items-center justify-center h-full py-8">
              <p className="text-slate-600 text-sm italic">Start speaking to add tasks...</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {renderTaskTree(displayTasks)}
            </div>
          )}
        </div>

        {/* Live transcript */}
        <div className="px-5 py-3 border-t border-slate-800">
          <div className="flex items-start gap-2">
            {isRecording && (
              <span className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
            <p className="text-sm text-slate-500 italic min-h-[1.25rem]">
              {interimTranscript || (isRecording ? 'Listening...' : 'Stopped')}
            </p>
          </div>
          {/* Mode indicator */}
          <div className="flex items-center gap-1 mt-1">
            <ChevronRight size={12} className="text-slate-600" />
            <span className="text-xs text-slate-600">
              {currentDepth > 0 && parentText
                ? `Under "${parentText}" · depth ${currentDepth + 1}`
                : 'Root level'}
            </span>
          </div>
        </div>

        {error && (
          <div className="px-5 py-2">
            <p className="text-xs text-rose-400">{error}</p>
          </div>
        )}

        {/* Command buttons */}
        <div className="px-5 py-3 border-t border-slate-800 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleCommandButton('next task')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors active:scale-95 ${
              currentDepth === 0
                ? 'bg-cyan-950/50 text-cyan-400 border-cyan-800'
                : 'bg-slate-800 text-cyan-400 border-slate-700 active:bg-slate-700'
            }`}
          >
            + Task
          </button>
          <button
            onClick={() => handleCommandButton('subtask')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors active:scale-95 ${
              currentDepth > 0
                ? 'bg-amber-950/50 text-amber-400 border-amber-800'
                : 'bg-slate-800 text-amber-400 border-slate-700 active:bg-slate-700'
            }`}
          >
            + Subtask
          </button>
          {currentDepth > 0 && (
            <>
              <button
                onClick={() => handleCommandButton('also')}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-amber-950/50 text-amber-400 border border-amber-800 active:bg-amber-900/50 transition-colors active:scale-95"
              >
                + Another
              </button>
              <button
                onClick={() => handleCommandButton('go up')}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-800 text-emerald-400 border border-slate-700 active:bg-slate-700 transition-colors active:scale-95 flex items-center gap-1"
              >
                <ChevronUp size={12} />
                Up
              </button>
            </>
          )}
          <div className="flex-1" />
          {isRecording ? (
            <button
              onClick={stopRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-rose-400 border border-slate-700 active:bg-slate-700"
            >
              <Square size={12} />
              Stop
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-emerald-400 border border-slate-700 active:bg-slate-700"
            >
              <Mic size={12} />
              Resume
            </button>
          )}
        </div>

        {/* Add tasks footer */}
        <div className="px-5 pb-5 pt-2">
          <button
            onClick={handleAddAll}
            disabled={parsedTasks.length === 0}
            className="w-full py-3 rounded-xl text-sm font-medium bg-emerald-600 text-white active:bg-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Check size={16} />
            {taskCount > 0 ? `Add ${taskCount} Task${taskCount > 1 ? 's' : ''}` : 'Add Tasks'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Export availability check for conditional rendering of mic button
export const isSpeechSupported = !!SpeechRecognition;
