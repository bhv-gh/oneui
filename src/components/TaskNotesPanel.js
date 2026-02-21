import React, { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { X } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';

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

const TaskNotesPanel = ({ taskId, taskTitle, initialNotes, onUpdate, onClose }) => {
  const [notes, setNotes] = useState(initialNotes || '');
  const debouncedNotes = useDebounce(notes, 500);
  const isInitialMount = useRef(true);
  const panelRef = useRef(null);

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
            <p className="text-xs text-content-muted mt-0.5">Notes</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-content-tertiary hover:text-content-inverse hover:bg-surface-secondary transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto p-5 rich-text-editor">
          <ReactQuill
            theme="snow"
            value={notes}
            onChange={setNotes}
            modules={modules}
            placeholder="Write your notes here..."
          />
        </div>
      </div>
    </>
  );
};

export default TaskNotesPanel;
