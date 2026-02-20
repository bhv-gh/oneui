import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Fuse from 'fuse.js';
import { TreePine, ChevronRight, Check, Mic, MicOff } from 'lucide-react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
export const isSpeechSupported = !!SpeechRecognition;

const QuickAddModal = ({ isOpen, onClose, treeData, onAddSubtask, onAddRoot, onUpdate, selectedDate }) => {
  const [inputText, setInputText] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [confirmation, setConfirmation] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef(null);
  const confirmTimeoutRef = useRef(null);
  const recognitionRef = useRef(null);

  // Flatten full tree with paths (reuses TriageModal pattern)
  const flattenedTree = useMemo(() => {
    const list = [];
    const traverse = (nodes, path = []) => {
      nodes.forEach(node => {
        list.push({ id: node.id, text: node.text || 'Untitled', path: [...path] });
        if (node.children) traverse(node.children, [...path, node.text || 'Untitled']);
      });
    };
    traverse(treeData);
    return list;
  }, [treeData]);

  const fuse = useMemo(() => new Fuse(flattenedTree, {
    keys: ['text', 'path'],
    threshold: 1.0,
    includeScore: true,
  }), [flattenedTree]);

  const results = useMemo(() => {
    if (!inputText.trim()) return [];
    const fullResults = fuse.search(inputText);
    // Also search individual words so longer phrases still match short task names
    const words = inputText.trim().split(/\s+/).filter(w => w.length >= 3);
    if (words.length > 1) {
      const seen = new Set(fullResults.map(r => r.item.id));
      for (const word of words) {
        for (const r of fuse.search(word)) {
          if (!seen.has(r.item.id)) {
            seen.add(r.item.id);
            fullResults.push(r);
          }
        }
      }
    }
    return fullResults.sort((a, b) => a.score - b.score).slice(0, 5);
  }, [inputText, fuse]);

  // Options: "New Root" + fuzzy matches
  const options = useMemo(() => {
    const opts = [{ type: 'root', label: 'New Root Task' }];
    results.forEach(r => {
      opts.push({ type: 'parent', item: r.item, score: r.score });
    });
    return opts;
  }, [results]);

  // Auto-select best match if score is good enough, otherwise default to "New Root"
  useEffect(() => {
    if (results.length > 0 && results[0].score <= 0.3) {
      setSelectedIndex(1); // first match
    } else {
      setSelectedIndex(0); // "New Root"
    }
  }, [results]);

  // Focus input when opened; stop recording + reset when closed
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      setInputText('');
      setSelectedIndex(0);
      setConfirmation(null);
      setIsRecording(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    }
  }, [isOpen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  const startRecording = useCallback(() => {
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript.trim();
          if (text) {
            setInputText(text.charAt(0).toUpperCase() + text.slice(1));
          }
          setIsRecording(false);
          recognitionRef.current = null;
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsRecording(true);
    } catch {
      recognitionRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!inputText.trim()) return;
    stopRecording();

    const selected = options[selectedIndex];
    let confirmMsg;

    if (selected.type === 'root') {
      const id = onAddRoot(selectedDate);
      onUpdate(id, { text: inputText.trim() }, selectedDate);
      confirmMsg = 'Added as root task';
    } else {
      const id = onAddSubtask(selected.item.id, selectedDate);
      onUpdate(id, { text: inputText.trim() }, selectedDate);
      confirmMsg = `Added under "${selected.item.text}"`;
    }

    setConfirmation(confirmMsg);
    setInputText('');

    if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    confirmTimeoutRef.current = setTimeout(() => {
      setConfirmation(null);
      onClose();
    }, 800);
  }, [inputText, options, selectedIndex, onAddRoot, onAddSubtask, onUpdate, selectedDate, onClose, stopRecording]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, options.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
      return;
    }
  }, [onClose, options.length, handleConfirm]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[20vh] bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg mx-4 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
        {/* Confirmation flash */}
        {confirmation ? (
          <div className="flex items-center gap-3 px-5 py-4 text-emerald-400 animate-in fade-in duration-150">
            <Check size={18} />
            <span className="text-sm font-medium">{confirmation}</span>
          </div>
        ) : (
          <>
            {/* Input */}
            <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a task..."
                className="flex-1 bg-transparent text-base text-slate-200 outline-none placeholder-slate-500"
              />
              {isSpeechSupported && (
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className="flex-shrink-0 p-1.5 rounded-lg transition-colors hover:bg-slate-800 active:bg-slate-700"
                  title={isRecording ? 'Stop recording' : 'Voice input'}
                >
                  {isRecording ? (
                    <span className="relative flex items-center justify-center">
                      <span className="absolute w-6 h-6 rounded-full bg-rose-500/20 animate-pulse" />
                      <MicOff size={16} className="text-rose-400 relative" />
                    </span>
                  ) : (
                    <Mic size={16} className="text-slate-400" />
                  )}
                </button>
              )}
            </div>

            {/* Options */}
            {inputText.trim() && (
              <div className="max-h-[280px] overflow-y-auto">
                {options.map((opt, idx) => (
                  <button
                    key={opt.type === 'root' ? 'root' : opt.item.id}
                    onClick={() => { setSelectedIndex(idx); handleConfirm(); }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                      idx === selectedIndex
                        ? 'bg-slate-800'
                        : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                      idx === selectedIndex
                        ? 'border-emerald-400 bg-emerald-400'
                        : 'border-slate-600'
                    }`} />
                    <div className="flex-1 min-w-0">
                      {opt.type === 'root' ? (
                        <div className="flex items-center gap-2">
                          <TreePine size={14} className="text-emerald-400 flex-shrink-0" />
                          <span className="text-sm text-slate-200 font-medium">New Root Task</span>
                        </div>
                      ) : (
                        <>
                          <div className="text-sm text-slate-200 font-medium truncate">{opt.item.text}</div>
                          {opt.item.path.length > 0 && (
                            <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                              {opt.item.path.map((seg, i) => (
                                <React.Fragment key={i}>
                                  {i > 0 && <ChevronRight size={10} className="flex-shrink-0" />}
                                  <span>{seg}</span>
                                </React.Fragment>
                              ))}
                              <ChevronRight size={10} className="flex-shrink-0" />
                              <span>{opt.item.text}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Hint */}
            <div className="px-4 py-2 border-t border-slate-800 flex items-center gap-4 text-[11px] text-slate-500">
              <span><kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-400">↑↓</kbd> navigate</span>
              <span><kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-400">↵</kbd> confirm</span>
              <span><kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-400">esc</kbd> close</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default QuickAddModal;
