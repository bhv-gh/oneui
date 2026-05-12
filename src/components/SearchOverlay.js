import React from 'react';
import { Search } from 'lucide-react';

const SearchOverlay = ({ query, resultCount, currentIndex }) => {
  if (!query) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-surface-primary/95 backdrop-blur-md border border-edge-primary rounded-xl shadow-2xl px-4 py-2.5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <Search size={14} className="text-content-muted flex-shrink-0" />
      <span className="text-content-primary font-medium text-sm">{query}</span>
      {resultCount > 0 ? (
        <span className="text-xs bg-accent-subtle text-accent rounded-full px-2 py-0.5 font-medium">
          {currentIndex + 1}/{resultCount}
        </span>
      ) : (
        <span className="text-xs text-content-muted">No results</span>
      )}
      <div className="text-[10px] text-content-disabled flex gap-2 ml-1">
        <span><kbd className="px-1 py-0.5 rounded bg-surface-secondary text-content-muted border border-edge-secondary">↑↓</kbd> navigate</span>
        <span><kbd className="px-1 py-0.5 rounded bg-surface-secondary text-content-muted border border-edge-secondary">Esc</kbd> clear</span>
      </div>
    </div>
  );
};

export default SearchOverlay;
