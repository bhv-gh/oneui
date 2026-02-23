import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { X, HelpCircle, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { generateId } from '../utils/idGenerator';

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'code-block'],
    ['link'],
    ['clean'],
  ],
};

// --- Inline editable field for Q&A ---
const QAField = ({ value, onChange, placeholder }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(value);
  const debouncedText = useDebounce(text, 500);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (!isEditing) setText(value);
  }, [value, isEditing]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    onChange(debouncedText);
  }, [debouncedText]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBlur = () => {
    setIsEditing(false);
    if (text !== value) onChange(text);
  };

  if (isEditing) {
    return (
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        autoFocus
        placeholder={placeholder}
        className="w-full bg-surface-secondary border border-edge-primary rounded-lg p-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-edge-focus resize-y min-h-[2.5rem]"
      />
    );
  }
  return (
    <div onClick={() => setIsEditing(true)} className="w-full p-2 cursor-text whitespace-pre-wrap text-sm min-h-[2.5rem]">
      {value ? (
        <span className="text-content-primary">{value}</span>
      ) : (
        <span className="text-content-muted">{placeholder}</span>
      )}
    </div>
  );
};

// --- Collect all descendant task IDs ---
const collectDescendantIds = (node) => {
  const ids = [node.id];
  if (node.children) {
    for (const child of node.children) {
      ids.push(...collectDescendantIds(child));
    }
  }
  return ids;
};

// --- Find a node by ID recursively ---
const findNodeById = (nodes, id) => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

const TaskNotesPanel = ({ taskId, taskTitle, initialNotes, onUpdate, onClose, memoryData, onMemoryUpdate, treeData }) => {
  const [notes, setNotes] = useState(initialNotes || '');
  const debouncedNotes = useDebounce(notes, 500);
  const isInitialMount = useRef(true);
  const panelRef = useRef(null);
  const [qaExpanded, setQaExpanded] = useState(true);

  // Sync when a different task is opened
  useEffect(() => {
    setNotes(initialNotes || '');
    isInitialMount.current = true;
  }, [taskId]);

  // Auto-save debounced notes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    onUpdate(taskId, { notes: debouncedNotes });
  }, [debouncedNotes, taskId, onUpdate]);

  // Collect descendant IDs for this task
  const descendantIds = useMemo(() => {
    if (!treeData) return [taskId];
    const node = findNodeById(treeData, taskId);
    return node ? collectDescendantIds(node) : [taskId];
  }, [treeData, taskId]);

  const descendantIdSet = useMemo(() => new Set(descendantIds), [descendantIds]);

  // Q&As for this task and descendants
  const relatedQAs = useMemo(() => {
    if (!memoryData?.qas) return [];
    return memoryData.qas
      .filter(qa => qa.taskId && descendantIdSet.has(qa.taskId))
      .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
  }, [memoryData?.qas, descendantIdSet]);

  // Q&As directly on this task
  const directQAs = useMemo(() => {
    if (!memoryData?.qas) return [];
    return memoryData.qas
      .filter(qa => qa.taskId === taskId)
      .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
  }, [memoryData?.qas, taskId]);

  // Q&As from descendants only (not this task)
  const descendantQAs = useMemo(() => {
    if (!memoryData?.qas) return [];
    return relatedQAs.filter(qa => qa.taskId !== taskId);
  }, [relatedQAs, taskId, memoryData?.qas]);

  // Group descendant Q&As by task
  const descendantQAsByTask = useMemo(() => {
    const groups = {};
    for (const qa of descendantQAs) {
      if (!groups[qa.taskId]) {
        groups[qa.taskId] = { taskId: qa.taskId, taskLabel: qa.taskLabel || qa.taskId, qas: [] };
      }
      groups[qa.taskId].qas.push(qa);
    }
    return Object.values(groups);
  }, [descendantQAs]);

  const handleAddQA = useCallback(() => {
    if (!onMemoryUpdate || !memoryData) return;
    const newQA = {
      id: generateId(),
      question: '',
      answer: '',
      taskId,
      taskLabel: taskTitle || 'Untitled Task',
      lastModified: new Date().toISOString(),
    };
    onMemoryUpdate({ qas: [...memoryData.qas, newQA] });
  }, [onMemoryUpdate, memoryData, taskId, taskTitle]);

  const handleUpdateQA = useCallback((qaId, field, value) => {
    if (!onMemoryUpdate || !memoryData) return;
    const updatedQAs = memoryData.qas.map(qa =>
      qa.id === qaId ? { ...qa, [field]: value, lastModified: new Date().toISOString() } : qa
    );
    onMemoryUpdate({ qas: updatedQAs });
  }, [onMemoryUpdate, memoryData]);

  const handleDeleteQA = useCallback((qaId) => {
    if (!onMemoryUpdate || !memoryData) return;
    onMemoryUpdate({ qas: memoryData.qas.filter(qa => qa.id !== qaId) });
  }, [onMemoryUpdate, memoryData]);

  const hasQASupport = !!memoryData && !!onMemoryUpdate;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 z-[101] h-full w-full max-w-lg bg-surface-primary border-l border-edge-primary shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-edge-secondary">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-content-primary truncate">
              {taskTitle || 'Untitled Task'}
            </h2>
            <p className="text-xs text-content-muted mt-0.5">Notes & Q&A</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-content-tertiary hover:text-content-inverse hover:bg-surface-secondary transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Rich Text Notes */}
          <div className="p-5 rich-text-editor">
            <ReactQuill
              theme="snow"
              value={notes}
              onChange={setNotes}
              modules={modules}
              placeholder="Write your notes here..."
            />
          </div>

          {/* Q&A Section */}
          {hasQASupport && (
            <div className="border-t border-edge-secondary">
              {/* Q&A Header */}
              <div className="flex items-center justify-between px-5 py-3">
                <button
                  onClick={() => setQaExpanded(!qaExpanded)}
                  className="flex items-center gap-2 text-sm font-semibold text-content-primary hover:text-accent transition-colors"
                >
                  {qaExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <HelpCircle size={14} />
                  <span>Q&A</span>
                  {relatedQAs.length > 0 && (
                    <span className="text-[10px] text-content-disabled bg-surface-secondary px-1.5 py-0.5 rounded-full">
                      {relatedQAs.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={handleAddQA}
                  className="px-2.5 py-1 text-xs rounded-lg bg-accent-bolder text-content-inverse hover:bg-accent-boldest flex items-center gap-1 transition-colors"
                >
                  <Plus size={12} />
                  Add Q&A
                </button>
              </div>

              {qaExpanded && (
                <div className="px-5 pb-4 space-y-3">
                  {/* Direct Q&As for this task */}
                  {directQAs.length > 0 && (
                    <div className="space-y-2">
                      {directQAs.map(qa => (
                        <QACard
                          key={qa.id}
                          qa={qa}
                          onUpdateQA={handleUpdateQA}
                          onDeleteQA={handleDeleteQA}
                        />
                      ))}
                    </div>
                  )}

                  {/* Descendant Q&As grouped by task */}
                  {descendantQAsByTask.length > 0 && (
                    <div className="space-y-3 mt-2">
                      <div className="text-[10px] font-bold text-content-disabled uppercase tracking-widest">From Subtasks</div>
                      {descendantQAsByTask.map(group => (
                        <div key={group.taskId} className="space-y-2">
                          <div className="text-xs text-content-tertiary font-medium px-1 truncate">
                            {group.taskLabel}
                          </div>
                          {group.qas.map(qa => (
                            <QACard
                              key={qa.id}
                              qa={qa}
                              onUpdateQA={handleUpdateQA}
                              onDeleteQA={handleDeleteQA}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {relatedQAs.length === 0 && (
                    <div className="text-xs text-content-muted text-center py-4">
                      No Q&A entries yet. Click "Add Q&A" to create one.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// --- Q&A Card sub-component ---
const QACard = ({ qa, onUpdateQA, onDeleteQA }) => {
  return (
    <div className="bg-surface-secondary/50 rounded-lg group/qa relative border border-edge-secondary/50 transition-all hover:border-edge-primary">
      <div className="p-3">
        <label className="text-[10px] font-semibold text-accent uppercase tracking-wider">Question</label>
        <QAField
          value={qa.question}
          onChange={(val) => onUpdateQA(qa.id, 'question', val)}
          placeholder="Type your question..."
        />
      </div>
      <div className="p-3 border-t border-edge-secondary/50">
        <label className="text-[10px] font-semibold text-accent-secondary uppercase tracking-wider">Answer</label>
        <QAField
          value={qa.answer}
          onChange={(val) => onUpdateQA(qa.id, 'answer', val)}
          placeholder="Type your answer..."
        />
      </div>
      <button
        onClick={() => onDeleteQA(qa.id)}
        className="absolute top-2 right-2 p-1 text-content-muted hover:text-danger opacity-0 group-hover/qa:opacity-100 transition-opacity"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
};

export default TaskNotesPanel;
