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
        className="w-full bg-slate-950/50 text-xs text-slate-400 border border-slate-800 rounded px-2 py-1 focus:border-emerald-500/50 focus:outline-none transition-colors"
      />
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-20 bg-slate-900 border border-slate-700 rounded-lg shadow-lg max-h-40 overflow-y-auto animate-in fade-in duration-100">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(option => (
              <button
                key={option}
                onClick={() => handleSelect(option)}
                className="w-full text-left text-xs px-3 py-1.5 text-slate-300 hover:bg-emerald-500/10"
              >
                {option}
              </button>
            ))
          ) : (
            <div className="text-xs text-slate-500 px-3 py-1.5 italic">
              No matching keys.
            </div>
          )}
           {/* Allow creating a new key if the input value is not in the options */}
           {value && !options.includes(value) && (
             <button
                onClick={() => handleSelect(value)}
                className="w-full text-left text-xs px-3 py-1.5 text-emerald-400 hover:bg-emerald-500/10 border-t border-slate-800"
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