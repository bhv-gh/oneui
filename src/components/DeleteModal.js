import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

const DeleteModal = ({ isOpen, onClose, onConfirm }) => {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (isOpen && cancelRef.current) {
      cancelRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface-primary border border-edge-primary rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-danger-subtle p-2.5 rounded-xl">
              <AlertTriangle size={20} className="text-danger" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-content-primary">Delete Task?</h3>
              <p className="text-xs text-content-muted">This action cannot be undone.</p>
            </div>
          </div>
          <p className="text-sm text-content-tertiary mb-6">
            This will permanently delete this task and all its subtasks.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              ref={cancelRef}
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-content-secondary hover:bg-surface-secondary hover:text-content-primary transition-all font-medium text-sm"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 rounded-lg bg-danger hover:bg-red-600 text-content-inverse shadow-lg shadow-danger/20 hover:shadow-danger/40 transition-all font-medium text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;
