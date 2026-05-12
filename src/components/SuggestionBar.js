import React, { useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import gsap from 'gsap';

const SuggestionBar = ({ suggestions, onSuggestionClick }) => {
  const barRef = useRef(null);

  useEffect(() => {
    if (!barRef.current || suggestions.length === 0) return;
    const pills = barRef.current.querySelectorAll('[data-pill]');
    gsap.fromTo(pills,
      { opacity: 0, scale: 0.8, y: -5 },
      { opacity: 1, scale: 1, y: 0, duration: 0.3, stagger: 0.07, ease: 'back.out(2)', clearProps: 'transform,opacity' }
    );
  }, [suggestions]);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div ref={barRef} className="absolute top-[72px] left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-2 bg-surface-primary/90 p-1.5 border border-edge-secondary backdrop-blur-md rounded-xl shadow-lg">
      <span className="flex items-center gap-1.5 text-xs text-content-muted px-2">
        <Sparkles size={12} />
        <span className="hidden sm:inline">Suggested</span>
      </span>
      <div className="flex items-center gap-1">
        {suggestions.map(task => (
          <button
            key={task.id}
            data-pill
            onClick={() => onSuggestionClick(task.id)}
            className="px-3 py-1.5 text-xs text-content-secondary bg-surface-secondary rounded-lg hover:bg-accent-subtle hover:text-accent border border-transparent hover:border-accent/20 transition-all truncate max-w-[200px]"
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
