import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';

const QuickCapture = ({ onCapture, capturedCount }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleSubmit = () => {
    if (text.trim()) {
      onCapture(text.trim());
      setText('');
    }
    setIsExpanded(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setText('');
      setIsExpanded(false);
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-full bg-surface-secondary border border-edge-primary hover:border-edge-focus hover:bg-surface-secondary text-content-tertiary hover:text-accent transition-all"
        title="Jot down a task"
      >
        <Plus size={16} />
        <span className="text-xs font-medium">Jot</span>
        {capturedCount > 0 && (
          <span className="text-[10px] bg-accent-subtle text-accent px-1.5 py-0.5 rounded-full font-medium">
            {capturedCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-surface-secondary border border-edge-primary rounded-xl px-3 py-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (!text.trim()) setIsExpanded(false); }}
        placeholder="Jot down a task..."
        className="bg-transparent text-sm text-content-primary outline-none flex-1 min-w-[180px] placeholder-content-muted"
      />
      <button
        onClick={handleSubmit}
        disabled={!text.trim()}
        className="p-1.5 rounded-lg bg-accent-subtle text-accent hover:bg-accent-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Plus size={14} />
      </button>
    </div>
  );
};

export default QuickCapture;
