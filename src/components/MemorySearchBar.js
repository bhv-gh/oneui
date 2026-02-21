import React from 'react';
import { Search } from 'lucide-react';

const MemorySearchBar = ({ searchQuery, setSearchQuery }) => {
  return (
    <div className="p-4 border-b border-edge-secondary">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" size={18} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search in memory..."
          className="w-full bg-surface-primary border border-edge-primary rounded-lg pl-10 pr-4 py-2 text-content-primary focus:outline-none focus:ring-2 focus:ring-edge-focus"
        />
      </div>
    </div>
  );
};

export default MemorySearchBar;
