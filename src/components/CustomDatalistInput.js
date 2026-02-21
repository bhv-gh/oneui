import React, { useState, useEffect, useRef } from 'react';

// --- Component: Custom Styled Datalist Input ---
const CustomDatalistInput = ({ value, onChange, options, placeholder, onKeyDown }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(value.toLowerCase())
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div className="relative w-1/3" ref={wrapperRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full bg-surface-inset text-xs text-content-tertiary border border-edge-secondary rounded px-2 py-1 focus:border-edge-focus focus:outline-none transition-colors"
      />
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-20 bg-surface-primary border border-edge-primary rounded-lg shadow-lg max-h-40 overflow-y-auto animate-in fade-in duration-100">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(option => (
              <button
                key={option}
                onClick={() => handleSelect(option)}
                className="w-full text-left text-xs px-3 py-1.5 text-content-secondary hover:bg-accent-subtle"
              >
                {option}
              </button>
            ))
          ) : (
            <div className="text-xs text-content-muted px-3 py-1.5 italic">
              No matching keys.
            </div>
          )}
           {/* Allow creating a new key if the input value is not in the options */}
           {value && !options.includes(value) && (
             <button
                onClick={() => handleSelect(value)}
                className="w-full text-left text-xs px-3 py-1.5 text-accent hover:bg-accent-subtle border-t border-edge-secondary"
              >
                Create new key: "{value}"
              </button>
           )}
        </div>
      )}
    </div>
  );
};

export default CustomDatalistInput;