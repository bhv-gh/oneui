import React from 'react';
import { Search, X } from 'lucide-react';

const MemorySearchBar = ({ searchQuery, setSearchQuery }) => {
  return (
    <div className="px-8 pt-4 pb-2 flex-shrink-0">
      <div className="relative max-w-2xl mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" size={16} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notes and Q&A..."
          className="w-full bg-surface-secondary border border-edge-secondary rounded-xl pl-10 pr-10 py-2.5 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-accent-bold/30 focus:border-accent-bold/50 placeholder:text-content-muted transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-content-muted hover:text-content-primary rounded transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default MemorySearchBar;
