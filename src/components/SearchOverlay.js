import React from 'react';

// --- Component: Search Overlay ---
const SearchOverlay = ({ query, resultCount, currentIndex }) => {
  if (!query) return null;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-surface-overlay backdrop-blur-md border border-edge-primary rounded-xl shadow-2xl px-4 py-2 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <span className="text-content-tertiary text-sm">Search:</span>
      <span className="text-content-inverse font-medium">{query}</span>
      {resultCount > 0 && (
        <span className="text-xs bg-surface-secondary text-content-secondary rounded-full px-2 py-0.5">{currentIndex + 1} of {resultCount}</span>
      )}
      {resultCount === 0 && <span className="text-xs text-content-muted">No results</span>}
    </div>
  );
};

export default SearchOverlay;
