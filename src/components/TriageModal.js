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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-page-base animate-in fade-in duration-300">
      <div className="w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-content-primary">Organize Captured Tasks</h2>
            <span className="text-xs bg-surface-secondary text-content-tertiary px-2 py-1 rounded-full">
              {currentIndex + 1} of {capturedTasks.length}
            </span>
          </div>
          <button
            onClick={handleDiscardAll}
            className="text-xs text-content-muted hover:text-content-secondary transition-colors"
          >
            Skip All
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-surface-secondary rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-accent-bold transition-all duration-500"
            style={{ width: `${((currentIndex) / capturedTasks.length) * 100}%` }}
          />
        </div>

        {/* Current task card */}
        <div className="bg-surface-primary border border-edge-primary rounded-2xl p-6 mb-6">
          <p className="text-xs text-content-muted mb-2 uppercase tracking-wider">Task</p>
          <p className="text-xl font-medium text-content-primary">{currentTask.text}</p>
        </div>

        {/* Actions */}
        {!showParentPicker ? (
          <div className="space-y-3">
            <button
              onClick={handleAddAsRoot}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-xl bg-surface-primary border border-edge-primary hover:border-edge-focus hover:bg-surface-secondary text-content-primary transition-all group"
            >
              <TreePine size={18} className="text-accent" />
              <span className="flex-1 text-left font-medium">Add as Root Task</span>
              <ChevronRight size={16} className="text-content-disabled group-hover:text-content-tertiary transition-colors" />
            </button>

            <button
              onClick={() => setShowParentPicker(true)}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-xl bg-surface-primary border border-edge-primary hover:border-accent-secondary hover:bg-surface-secondary text-content-primary transition-all group"
            >
              <FolderTree size={18} className="text-accent-secondary" />
              <span className="flex-1 text-left font-medium">Add Under a Parent...</span>
              <ChevronRight size={16} className="text-content-disabled group-hover:text-content-tertiary transition-colors" />
            </button>

            <button
              onClick={handleDiscard}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-xl bg-surface-primary border border-edge-primary hover:border-danger hover:bg-surface-secondary text-content-tertiary hover:text-content-primary transition-all group"
            >
              <Trash2 size={18} className="text-danger group-hover:text-danger transition-colors" />
              <span className="flex-1 text-left font-medium">Discard</span>
            </button>
          </div>
        ) : (
          <div className="bg-surface-primary border border-edge-primary rounded-2xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
            {/* Search */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-edge-secondary">
              <Search size={14} className="text-content-muted" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="bg-transparent text-sm text-content-primary outline-none flex-1 placeholder-content-muted"
              />
              <button
                onClick={() => { setShowParentPicker(false); setSearchQuery(''); }}
                className="p-1 text-content-muted hover:text-content-secondary transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[300px] overflow-y-auto">
              {filteredParents.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-content-muted">No matching tasks found.</div>
              ) : (
                filteredParents.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleAddUnderParent(item.id)}
                    className="w-full text-left px-4 py-3 hover:bg-surface-secondary transition-colors border-b border-edge-secondary last:border-b-0"
                  >
                    {item.path.length > 0 && (
                      <div className="text-[11px] text-content-muted truncate mb-0.5">
                        {item.path.join(' / ')}
                      </div>
                    )}
                    <div className="text-sm text-content-primary font-medium truncate">{item.text}</div>
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
