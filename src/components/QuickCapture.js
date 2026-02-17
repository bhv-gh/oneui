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
        className="flex items-center gap-2 px-3 py-2 rounded-full bg-slate-800/80 border border-slate-700 hover:border-emerald-500/40 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-all"
        title="Jot down a task"
      >
        <Plus size={16} />
        <span className="text-xs font-medium">Jot</span>
        {capturedCount > 0 && (
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">
            {capturedCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (!text.trim()) setIsExpanded(false); }}
        placeholder="Jot down a task..."
        className="bg-transparent text-sm text-slate-200 outline-none flex-1 min-w-[180px] placeholder-slate-500"
      />
      <button
        onClick={handleSubmit}
        disabled={!text.trim()}
        className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Plus size={14} />
      </button>
    </div>
  );
};

export default QuickCapture;
