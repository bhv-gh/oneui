import React from 'react';
import { AlertTriangle } from 'lucide-react';

// --- Component: Delete Modal ---
const DeleteModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-primary border border-edge-primary rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex items-center gap-3 text-danger mb-4">
            <div className="bg-danger-subtle p-3 rounded-full">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-semibold text-content-primary">Delete Task?</h3>
          </div>
          <p className="text-content-tertiary mb-6">
            Are you sure you want to delete this task? This will also delete all subtasks in this branch.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-content-secondary hover:bg-surface-secondary hover:text-content-inverse transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 rounded-lg bg-danger hover:bg-danger text-content-inverse shadow-lg shadow-danger/20 transition-all font-medium"
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
