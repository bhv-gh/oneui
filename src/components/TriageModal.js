import React, { useState, useMemo, useRef, useEffect } from 'react';
import { TreePine, FolderTree, Trash2, X, Search, ChevronRight } from 'lucide-react';
import Fuse from 'fuse.js';

const TriageModal = ({ capturedTasks, treeData, onAddAsRoot, onAddUnderParent, onDiscard, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showParentPicker, setShowParentPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  const currentTask = capturedTasks[currentIndex];
  const isLastTask = currentIndex >= capturedTasks.length - 1;

  // Flatten tree for parent picker
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
    threshold: 0.4,
  }), [flattenedTree]);

  const filteredParents = searchQuery.trim()
    ? fuse.search(searchQuery).map(r => r.item)
    : flattenedTree;

  useEffect(() => {
    if (showParentPicker && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showParentPicker]);

  const advance = () => {
    if (isLastTask) {
      onComplete();
    } else {
      setCurrentIndex(i => i + 1);
      setShowParentPicker(false);
      setSearchQuery('');
    }
  };

  const handleAddAsRoot = () => {
    onAddAsRoot(currentTask.text);
    advance();
  };

  const handleAddUnderParent = (parentId) => {
    onAddUnderParent(currentTask.text, parentId);
    advance();
  };

  const handleDiscard = () => {
    onDiscard(currentTask.id);
    advance();
  };

  const handleDiscardAll = () => {
    onComplete();
  };

  if (!currentTask) {
    onComplete();
    return null;
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/95 animate-in fade-in duration-300">
      <div className="w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-200">Organize Captured Tasks</h2>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full">
              {currentIndex + 1} of {capturedTasks.length}
            </span>
          </div>
          <button
            onClick={handleDiscardAll}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Skip All
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-800 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${((currentIndex) / capturedTasks.length) * 100}%` }}
          />
        </div>

        {/* Current task card */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 mb-6">
          <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Task</p>
          <p className="text-xl font-medium text-slate-100">{currentTask.text}</p>
        </div>

        {/* Actions */}
        {!showParentPicker ? (
          <div className="space-y-3">
            <button
              onClick={handleAddAsRoot}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-500/40 hover:bg-slate-800 text-slate-200 transition-all group"
            >
              <TreePine size={18} className="text-emerald-400" />
              <span className="flex-1 text-left font-medium">Add as Root Task</span>
              <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
            </button>

            <button
              onClick={() => setShowParentPicker(true)}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/40 hover:bg-slate-800 text-slate-200 transition-all group"
            >
              <FolderTree size={18} className="text-cyan-400" />
              <span className="flex-1 text-left font-medium">Add Under a Parent...</span>
              <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
            </button>

            <button
              onClick={handleDiscard}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-rose-500/40 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all group"
            >
              <Trash2 size={18} className="text-rose-400/60 group-hover:text-rose-400 transition-colors" />
              <span className="flex-1 text-left font-medium">Discard</span>
            </button>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
            {/* Search */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
              <Search size={14} className="text-slate-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="bg-transparent text-sm text-slate-200 outline-none flex-1 placeholder-slate-500"
              />
              <button
                onClick={() => { setShowParentPicker(false); setSearchQuery(''); }}
                className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[300px] overflow-y-auto">
              {filteredParents.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">No matching tasks found.</div>
              ) : (
                filteredParents.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleAddUnderParent(item.id)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-800 transition-colors border-b border-slate-800/50 last:border-b-0"
                  >
                    {item.path.length > 0 && (
                      <div className="text-[11px] text-slate-500 truncate mb-0.5">
                        {item.path.join(' / ')}
                      </div>
                    )}
                    <div className="text-sm text-slate-200 font-medium truncate">{item.text}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TriageModal;
