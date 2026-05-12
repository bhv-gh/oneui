import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, Check, ChevronRight, TreePine, Search, ArrowRight, Sparkles } from 'lucide-react';
import Fuse from 'fuse.js';

const PlacementPanel = ({ pendingTasks, treeData, onPlace, onPlaceAsRoot, onDismiss, onHighlightNode }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchOverride, setSearchOverride] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef(null);

  const flatTree = useMemo(() => {
    const list = [];
    const traverse = (nodes, path = []) => {
      nodes.forEach(node => {
        list.push({ id: node.id, text: node.text || 'Untitled', path: [...path] });
        if (node.children) traverse(node.children, [...path, node.text || 'Untitled']);
      });
    };
    traverse(treeData || []);
    return list;
  }, [treeData]);

  const fuse = useMemo(() => new Fuse(flatTree, {
    keys: ['text', 'path'],
    threshold: 0.5,
    includeScore: true,
  }), [flatTree]);

  const searchFuse = useMemo(() => new Fuse(flatTree, {
    keys: ['text', 'path'],
    threshold: 0.6,
    includeScore: true,
  }), [flatTree]);

  const currentTask = pendingTasks[currentIndex];

  const suggestedParent = useMemo(() => {
    if (searchOverride) return searchOverride;
    if (!currentTask) return null;
    const results = fuse.search(currentTask.text);
    if (results.length > 0 && results[0].score <= 0.5) {
      return results[0].item;
    }
    return null;
  }, [currentTask, fuse, searchOverride]);

  const topSuggestions = useMemo(() => {
    if (!currentTask) return [];
    return fuse.search(currentTask.text).slice(0, 4).map(r => r.item);
  }, [currentTask, fuse]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return flatTree.slice(0, 8);
    return searchFuse.search(searchQuery).slice(0, 8).map(r => r.item);
  }, [searchQuery, searchFuse, flatTree]);

  useEffect(() => {
    if (suggestedParent) {
      onHighlightNode(suggestedParent.id);
    } else {
      onHighlightNode(null);
    }
    return () => onHighlightNode(null);
  }, [suggestedParent, onHighlightNode]);

  useEffect(() => {
    setSearchOverride(null);
    setIsSearching(false);
    setSearchQuery('');
  }, [currentIndex]);

  useEffect(() => {
    if (isSearching && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearching]);

  if (!currentTask) {
    onDismiss();
    return null;
  }

  const handleAcceptSuggestion = () => {
    if (suggestedParent) {
      onPlace(currentTask, suggestedParent.id);
    } else {
      onPlaceAsRoot(currentTask);
    }
    advance();
  };

  const handlePlaceUnder = (parentId) => {
    onPlace(currentTask, parentId);
    advance();
    setIsSearching(false);
    setSearchQuery('');
  };

  const handlePlaceAsRoot = () => {
    onPlaceAsRoot(currentTask);
    advance();
  };

  const handleSkip = () => {
    advance();
  };

  const advance = () => {
    if (currentIndex >= pendingTasks.length - 1) {
      onHighlightNode(null);
      onDismiss();
    } else {
      setCurrentIndex(i => i + 1);
    }
  };

  const handleDismissAll = () => {
    onHighlightNode(null);
    onDismiss();
  };

  const remaining = pendingTasks.length - currentIndex;

  return (
    <div className="fixed right-6 top-24 bottom-6 w-96 z-[60] flex flex-col animate-in slide-in-from-right duration-300">
      <div className="flex-1 bg-surface-primary/95 backdrop-blur-xl border border-edge-primary rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-edge-secondary">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-accent-subtle">
              <Sparkles size={16} className="text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-content-primary">Place Tasks</h3>
              <p className="text-[11px] text-content-muted">{remaining} remaining</p>
            </div>
          </div>
          <button onClick={handleDismissAll} className="p-1.5 text-content-muted hover:text-content-primary hover:bg-surface-secondary rounded-lg transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Progress */}
        <div className="h-1 bg-surface-secondary">
          <div className="h-full bg-accent-bold transition-all duration-500" style={{ width: `${(currentIndex / pendingTasks.length) * 100}%` }} />
        </div>

        {/* Current task */}
        <div className="px-5 py-4 border-b border-edge-secondary">
          <p className="text-[10px] text-content-disabled uppercase tracking-wider mb-1.5">Task {currentIndex + 1} of {pendingTasks.length}</p>
          <p className="text-base font-medium text-content-primary leading-snug">{currentTask.text}</p>
          {currentTask.project && (
            <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 bg-accent-secondary-subtle text-accent-secondary-bold rounded-full">@{currentTask.project}</span>
          )}
        </div>

        {/* Suggestion / Search */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isSearching ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" size={14} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for a parent task..."
                  className="w-full bg-surface-secondary border border-edge-secondary rounded-lg pl-9 pr-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-accent-bold/30 placeholder:text-content-muted"
                  onKeyDown={(e) => { if (e.key === 'Escape') { setIsSearching(false); setSearchQuery(''); } }}
                />
              </div>
              <div className="space-y-1">
                {searchResults.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handlePlaceUnder(item.id)}
                    onMouseEnter={() => onHighlightNode(item.id)}
                    onMouseLeave={() => onHighlightNode(suggestedParent?.id || null)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-surface-secondary transition-colors group"
                  >
                    <p className="text-sm text-content-primary font-medium truncate">{item.text}</p>
                    {item.path.length > 0 && (
                      <p className="text-[10px] text-content-muted truncate">{item.path.join(' / ')}</p>
                    )}
                  </button>
                ))}
                {searchResults.length === 0 && (
                  <p className="text-xs text-content-muted text-center py-4">No matching tasks</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Suggested parent */}
              {suggestedParent && (
                <div>
                  <p className="text-[10px] text-content-disabled uppercase tracking-wider mb-2">Suggested Parent</p>
                  <button
                    onClick={handleAcceptSuggestion}
                    onMouseEnter={() => onHighlightNode(suggestedParent.id)}
                    className="w-full text-left p-3 rounded-xl bg-accent-subtle/50 border border-accent/20 hover:border-accent hover:bg-accent-subtle transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <ChevronRight size={14} className="text-accent flex-shrink-0" />
                          <p className="text-sm text-content-primary font-medium truncate">{suggestedParent.text}</p>
                        </div>
                        {suggestedParent.path.length > 0 && (
                          <p className="text-[10px] text-content-muted truncate ml-6">{suggestedParent.path.join(' / ')}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs font-medium">Place here</span>
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* Other matches */}
              {topSuggestions.length > 0 && (
                <div>
                  <p className="text-[10px] text-content-disabled uppercase tracking-wider mb-2">
                    {suggestedParent ? 'Other Matches' : 'Possible Parents'}
                  </p>
                  <div className="space-y-1">
                    {topSuggestions
                      .filter(s => s.id !== suggestedParent?.id)
                      .slice(0, 3)
                      .map(item => (
                        <button
                          key={item.id}
                          onClick={() => handlePlaceUnder(item.id)}
                          onMouseEnter={() => onHighlightNode(item.id)}
                          onMouseLeave={() => onHighlightNode(suggestedParent?.id || null)}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-secondary transition-colors"
                        >
                          <p className="text-sm text-content-primary truncate">{item.text}</p>
                          {item.path.length > 0 && (
                            <p className="text-[10px] text-content-muted truncate">{item.path.join(' / ')}</p>
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {!suggestedParent && topSuggestions.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-content-muted">No matching parents found</p>
                  <p className="text-xs text-content-disabled mt-1">Add as root or search manually</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-edge-secondary space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setIsSearching(!isSearching)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface-secondary hover:bg-surface-tertiary text-content-secondary text-sm transition-all"
            >
              <Search size={14} />
              <span>{isSearching ? 'Back' : 'Search'}</span>
            </button>
            <button
              onClick={handlePlaceAsRoot}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface-secondary hover:bg-surface-tertiary text-content-secondary text-sm transition-all"
            >
              <TreePine size={14} />
              <span>As Root</span>
            </button>
          </div>
          {suggestedParent && !isSearching && (
            <button
              onClick={handleAcceptSuggestion}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent-bold hover:bg-accent-bolder text-content-inverse text-sm font-medium shadow-lg shadow-accent-bold/20 transition-all"
            >
              <Check size={16} />
              <span>Place under "{suggestedParent.text.length > 20 ? suggestedParent.text.slice(0, 20) + '…' : suggestedParent.text}"</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlacementPanel;
