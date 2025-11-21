import React, { useRef } from 'react';
import {
  X,
  UploadCloud,
  DownloadCloud,
} from 'lucide-react';

// --- Component: Settings Modal ---
const SettingsModal = ({ isOpen, onClose, onExport, onImport }) => {
  const importFileRef = useRef(null);

  if (!isOpen) return null;

  const handleImportClick = () => {
    importFileRef.current.click();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-slate-100">Settings</h3>
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-white rounded-full">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <button
            onClick={onExport}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            <DownloadCloud size={18} />
            <span>Export Data</span>
          </button>
          <button
            onClick={handleImportClick}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            <UploadCloud size={18} />
            <span>Import Data</span>
          </button>
          <input
            type="file"
            ref={importFileRef}
            className="hidden"
            accept=".json"
            onChange={onImport}
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;