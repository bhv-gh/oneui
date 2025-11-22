import React, { useState, useEffect, useRef } from 'react';
import { BrainCircuit, Coffee, TimerReset, Play, Pause } from 'lucide-react';

import { POMODORO_TIME, SHORT_BREAK_TIME, LONG_BREAK_TIME } from '../utils/WellKnown';

// --- Component: Pomodoro Timer ---
const PomodoroTimer = ({ 
  timeRemaining, 
  isTimerActive, 
  timerMode,
  onStartPause, 
  onReset,
  onSetMode
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const modeConfig = {
    pomodoro: { icon: BrainCircuit, label: 'Focus', time: POMODORO_TIME },
    shortBreak: { icon: Coffee, label: 'Short Break', time: SHORT_BREAK_TIME },
    longBreak: { icon: Coffee, label: 'Long Break', time: LONG_BREAK_TIME },
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-mono text-slate-400 hover:bg-white/10 rounded-lg"
      >
        <BrainCircuit size={16} className={isTimerActive && timerMode === 'pomodoro' ? 'text-emerald-400 animate-pulse' : ''} />
        {formatTime(timeRemaining)}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-60 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl p-4 animate-in fade-in duration-100">
          <div className="flex justify-around mb-4">
            {Object.entries(modeConfig).map(([mode, config]) => (
              <button 
                key={mode}
                onClick={() => onSetMode(mode)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${timerMode === mode ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:bg-slate-800'}`}
                title={config.label}
              >
                <config.icon size={20} />
                <span className="text-xs">{config.label}</span>
              </button>
            ))}
          </div>

          <div className="text-center mb-4">
            <p className="text-5xl font-mono font-bold text-slate-100">{formatTime(timeRemaining)}</p>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button 
              onClick={onReset}
              className="p-3 rounded-full text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              title="Reset Timer"
            >
              <TimerReset size={20} />
            </button>
            <button 
              onClick={onStartPause}
              className="w-24 h-12 flex items-center justify-center gap-2 rounded-full bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
            >
              {isTimerActive ? (
                <>
                  <Pause size={18} />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play size={18} />
                  <span>Start</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PomodoroTimer;