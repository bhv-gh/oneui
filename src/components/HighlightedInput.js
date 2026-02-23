import React, { useRef, useCallback } from 'react';

const HighlightedInput = React.forwardRef(({ value, onChange, onBlur, onKeyDown, onPaste, className = '', placeholder, autoFocus, onClick }, ref) => {
  const mirrorRef = useRef(null);

  const handleScroll = useCallback((e) => {
    if (mirrorRef.current) {
      mirrorRef.current.scrollLeft = e.target.scrollLeft;
    }
  }, []);

  const renderHighlighted = (text) => {
    if (!text) {
      if (placeholder) return <span className="opacity-50 italic">{placeholder}</span>;
      return null;
    }

    const parts = text.split(/([@#][\w-]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="bg-accent-secondary/15 text-accent-secondary-bold rounded-[3px] px-0.5">
            {part}
          </span>
        );
      }
      if (part.startsWith('#')) {
        return (
          <span key={i} className="bg-accent/10 text-accent rounded-[3px] px-0.5">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="relative">
      <div
        ref={mirrorRef}
        className={`${className} absolute inset-0 pointer-events-none overflow-hidden whitespace-pre`}
        style={{ borderColor: 'transparent' }}
        aria-hidden="true"
      >
        {renderHighlighted(value)}
      </div>
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onScroll={handleScroll}
        className={className}
        style={{ WebkitTextFillColor: 'transparent' }}
        placeholder=""
        autoFocus={autoFocus}
        onClick={onClick}
      />
    </div>
  );
});

HighlightedInput.displayName = 'HighlightedInput';

export default HighlightedInput;
