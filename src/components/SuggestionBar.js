import React from 'react';

// --- Component: Suggestion Bar ---
const SuggestionBar = ({ suggestions, onSuggestionClick }) => {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex items-center gap-2 bg-surface-overlay p-1.5 border border-edge-secondary backdrop-blur-sm rounded-xl">
      <span className="text-xs text-content-tertiary px-2 font-medium">Suggestions:</span>
      <div className="flex items-center gap-1">
        {suggestions.map(task => (
          <button
            key={task.id}
            onClick={() => onSuggestionClick(task.id)}
            className="px-3 py-1 text-xs text-content-secondary bg-surface-secondary rounded-md hover:bg-surface-secondary hover:text-content-inverse transition-colors truncate max-w-xs"
            title={task.text}
          >
            {task.text}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SuggestionBar;
