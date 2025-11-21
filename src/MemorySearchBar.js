import React from 'react';
import { Search } from 'lucide-react';

const MemorySearchBar = ({ searchQuery, setSearchQuery }) => {
  return (
    <div className="p-4 border-b border-slate-800">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search in memory..."
          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
    </div>
  );
};

export default MemorySearchBar;