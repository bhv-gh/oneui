import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { AtSign, Hash, Flag } from 'lucide-react';

const HighlightedInput = React.forwardRef(({ value, onChange, onBlur, onKeyDown, onPaste, className = '', placeholder, autoFocus, onClick, projects = [], tags = [] }, ref) => {
  const mirrorRef = useRef(null);
  const containerRef = useRef(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionType, setSuggestionType] = useState(null);
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);

  const priorityOptions = ['urgent', 'high', 'medium', 'low'];

  const suggestions = useMemo(() => {
    const q = suggestionQuery.toLowerCase();
    if (suggestionType === '@') {
      const unique = [...new Set(projects)].filter(Boolean);
      return q ? unique.filter(p => p.toLowerCase().includes(q)) : unique;
    }
    if (suggestionType === '#') {
      const unique = [...new Set(tags)].filter(Boolean);
      const filtered = q ? unique.filter(t => t.toLowerCase().includes(q)) : unique;
      if (q && !filtered.some(t => t.toLowerCase() === q)) {
        filtered.push(q);
      }
      return filtered;
    }
    if (suggestionType === '!') {
      return q ? priorityOptions.filter(p => p.includes(q)) : priorityOptions;
    }
    return [];
  }, [suggestionType, suggestionQuery, projects, tags]);

  const detectTrigger = useCallback((text, cursorPos) => {
    if (!text || cursorPos <= 0) return null;
    const beforeCursor = text.slice(0, cursorPos);
    const match = beforeCursor.match(/([@#!])([\w-]*)$/);
    if (match) {
      return { type: match[1], query: match[2], start: match.index };
    }
    return null;
  }, []);

  const handleChange = useCallback((e) => {
    onChange(e);
    const input = e.target;
    const trigger = detectTrigger(e.target.value, input.selectionStart);
    if (trigger) {
      setSuggestionType(trigger.type);
      setSuggestionQuery(trigger.query);
      setShowSuggestions(true);
      setSelectedIdx(0);
    } else {
      setShowSuggestions(false);
    }
  }, [onChange, detectTrigger]);

  const applySuggestion = useCallback((suggestion) => {
    const input = ref?.current;
    if (!input) return;
    const cursorPos = input.selectionStart;
    const trigger = detectTrigger(value, cursorPos);
    if (!trigger) return;

    let replacement;
    if (trigger.type === '!') {
      replacement = `#${suggestion} `;
      const before = value.slice(0, trigger.start);
      const after = value.slice(cursorPos);
      const newValue = before + replacement + after;
      const syntheticEvent = { target: { value: newValue } };
      onChange(syntheticEvent);
    } else {
      replacement = `${trigger.type}${suggestion} `;
      const before = value.slice(0, trigger.start);
      const after = value.slice(cursorPos);
      const newValue = before + replacement + after;
      const syntheticEvent = { target: { value: newValue } };
      onChange(syntheticEvent);
    }

    setShowSuggestions(false);
    setTimeout(() => input.focus(), 0);
  }, [value, onChange, detectTrigger, ref]);

  const handleKeyDownInternal = useCallback((e) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx(i => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx(i => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        if (suggestions[selectedIdx]) {
          e.preventDefault();
          applySuggestion(suggestions[selectedIdx]);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }
    if (onKeyDown) onKeyDown(e);
  }, [showSuggestions, suggestions, selectedIdx, applySuggestion, onKeyDown]);

  const handleBlurInternal = useCallback((e) => {
    setTimeout(() => setShowSuggestions(false), 150);
    if (onBlur) onBlur(e);
  }, [onBlur]);

  const handleScroll = useCallback((e) => {
    if (mirrorRef.current) {
      mirrorRef.current.scrollLeft = e.target.scrollLeft;
    }
  }, []);

  useEffect(() => {
    setSelectedIdx(0);
  }, [suggestions.length, suggestionQuery]);

  const renderHighlighted = (text) => {
    if (!text) {
      if (placeholder) return <span className="opacity-50 italic">{placeholder}</span>;
      return null;
    }

    const parts = text.split(/([@#!][\w-]*)/g);
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
      if (part.startsWith('!')) {
        return (
          <span key={i} className="bg-warning/10 text-warning rounded-[3px] px-0.5">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const typeConfig = {
    '@': { icon: AtSign, label: 'Project', color: 'text-accent-secondary-bold' },
    '#': { icon: Hash, label: 'Tag', color: 'text-accent' },
    '!': { icon: Flag, label: 'Priority', color: 'text-warning' },
  };

  const currentConfig = typeConfig[suggestionType] || typeConfig['#'];

  return (
    <div className="relative" ref={containerRef}>
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
        onChange={handleChange}
        onBlur={handleBlurInternal}
        onKeyDown={handleKeyDownInternal}
        onPaste={onPaste}
        onScroll={handleScroll}
        className={className}
        style={{ WebkitTextFillColor: 'transparent' }}
        placeholder=""
        autoFocus={autoFocus}
        onClick={onClick}
      />

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 top-full mt-1 z-50 w-56 bg-surface-primary border border-edge-primary rounded-lg shadow-2xl overflow-hidden animate-in fade-in duration-100">
          <div className="px-2.5 py-1.5 border-b border-edge-secondary flex items-center gap-1.5">
            <currentConfig.icon size={11} className={currentConfig.color} />
            <span className="text-[10px] text-content-muted font-medium uppercase tracking-wider">{currentConfig.label}</span>
          </div>
          <div className="max-h-[160px] overflow-y-auto py-1">
            {suggestions.map((item, idx) => (
              <button
                key={item}
                onMouseDown={(e) => { e.preventDefault(); applySuggestion(item); }}
                onMouseEnter={() => setSelectedIdx(idx)}
                className={`w-full text-left px-3 py-1.5 text-sm transition-colors flex items-center gap-2 ${
                  idx === selectedIdx ? 'bg-surface-secondary text-content-primary' : 'text-content-secondary hover:bg-surface-secondary'
                }`}
              >
                <span className={`text-xs ${currentConfig.color}`}>
                  {suggestionType === '!' ? '#' : suggestionType}
                </span>
                <span className="truncate">{item}</span>
                {suggestionType === '#' && item === suggestionQuery && !tags.includes(item) && (
                  <span className="text-[10px] text-content-muted ml-auto">new</span>
                )}
              </button>
            ))}
          </div>
          <div className="px-2.5 py-1 border-t border-edge-secondary">
            <span className="text-[10px] text-content-disabled">
              <kbd className="px-1 py-0.5 rounded bg-surface-secondary">↑↓</kbd> select
              {' '}
              <kbd className="px-1 py-0.5 rounded bg-surface-secondary">Tab</kbd> accept
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

HighlightedInput.displayName = 'HighlightedInput';

export default HighlightedInput;
