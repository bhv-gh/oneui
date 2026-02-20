import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { X, Mic, MicOff, Square, Check, ChevronRight } from 'lucide-react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// ── Parser ──────────────────────────────────────────────────

function parseTranscript(text) {
  const tasks = [];
  let lastRoot = null;

  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return tasks;

  // Split keeping command delimiters
  const segments = normalized.split(/\b(next\s+task|subtask|sub\s+task|next)\b/i);

  let mode = 'root';

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    const lower = trimmed.toLowerCase();
    if (lower === 'next' || lower === 'next task') { mode = 'root'; continue; }
    if (lower === 'subtask' || lower === 'sub task') { mode = 'sub'; continue; }

    // Capitalize first letter
    const taskText = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);

    if (mode === 'sub' && lastRoot) {
      lastRoot.children.push({ text: taskText });
    } else {
      const root = { text: taskText, children: [] };
      tasks.push(root);
      lastRoot = root;
    }
  }

  return tasks;
}

function countTasks(tasks) {
  return tasks.reduce((n, t) => n + 1 + (t.children?.length || 0), 0);
}

function getLastCommand(text) {
  const matches = text.match(/\b(next\s+task|subtask|sub\s+task|next)\b/gi);
  if (!matches) return null;
  const last = matches[matches.length - 1].toLowerCase();
  if (last === 'subtask' || last === 'sub task') return 'sub';
  return 'root';
}

// ── Component ───────────────────────────────────────────────

export default function RambleModal({ isOpen, onClose, onAddTasks }) {
  const [isRecording, setIsRecording] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  const parsedTasks = useMemo(() => parseTranscript(finalTranscript), [finalTranscript]);
  const taskCount = useMemo(() => countTasks(parsedTasks), [parsedTasks]);
  const currentMode = getLastCommand(finalTranscript) || 'root';
  const lastRootText = parsedTasks.length > 0 ? parsedTasks[parsedTasks.length - 1].text : null;

  // Determine what interim text would become
  const interimPreview = useMemo(() => {
    if (!interimTranscript.trim()) return null;
    // Parse interim as if it were final to show preview
    const preview = parseTranscript(finalTranscript + ' ' + interimTranscript);
    return preview;
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
        setFinalTranscript(prev => prev + final);
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
            Say <span className="text-slate-300 font-medium">"next"</span> for a new task, <span className="text-slate-300 font-medium">"subtask"</span> for a child task
          </p>
        </div>

        {/* Task preview */}
        <div className="flex-1 overflow-y-auto px-5 min-h-[120px] max-h-[40vh]">
          {displayTasks.length === 0 ? (
            <div className="flex items-center justify-center h-full py-8">
              <p className="text-slate-600 text-sm italic">Start speaking to add tasks...</p>
            </div>
          ) : (
            <div className="space-y-1">
              {displayTasks.map((task, i) => (
                <div key={i}>
                  {/* Root task */}
                  <div className="flex items-center gap-2 py-1.5">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-600 flex-shrink-0" />
                    <span className="text-sm text-slate-200">{task.text}</span>
                  </div>
                  {/* Subtasks */}
                  {(task.children || []).map((child, j) => (
                    <div key={j} className="flex items-center gap-2 py-1 pl-6">
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-700 flex-shrink-0" />
                      <span className="text-sm text-slate-300">{child.text}</span>
                    </div>
                  ))}
                </div>
              ))}
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
              {currentMode === 'sub' && lastRootText
                ? `Subtask of "${lastRootText}"`
                : 'New root task'}
            </span>
          </div>
        </div>

        {error && (
          <div className="px-5 py-2">
            <p className="text-xs text-rose-400">{error}</p>
          </div>
        )}

        {/* Command buttons */}
        <div className="px-5 py-3 border-t border-slate-800 flex items-center gap-2">
          <button
            onClick={() => handleCommandButton('next')}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-800 text-cyan-400 border border-slate-700 active:bg-slate-700 transition-colors"
          >
            Next Task
          </button>
          <button
            onClick={() => handleCommandButton('subtask')}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-800 text-amber-400 border border-slate-700 active:bg-slate-700 transition-colors"
          >
            Subtask
          </button>
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
