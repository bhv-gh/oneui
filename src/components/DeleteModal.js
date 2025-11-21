import React from 'react';
import { AlertTriangle } from 'lucide-react';

// --- Component: Delete Modal ---
const DeleteModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex items-center gap-3 text-rose-400 mb-4">
            <div className="bg-rose-400/10 p-3 rounded-full">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-semibold text-slate-100">Delete Task?</h3>
          </div>
          <p className="text-slate-400 mb-6">
            Are you sure you want to delete this task? This will also delete all subtasks in this branch.
          </p>
          <div className="flex gap-3 justify-end">
            <button 
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors font-medium"
            >
              Cancel
            </button>
            <button 
              onClick={onConfirm}
              className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20 transition-all font-medium"
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