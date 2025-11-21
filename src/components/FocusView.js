import React from 'react';
import {
  BrainCircuit,
  Coffee,
  TimerReset,
  Play,
  Pause,
  XCircle,
} from 'lucide-react';

// --- Component: Full Screen Focus View ---
const FocusView = ({ task, timerProps, onExit, appState }) => {
  if (!task) return null;

  const { 
    timeRemaining, 
    isTimerActive, 
    timerMode,
    onStartPause, 
    onReset,
    onSetMode
  } = timerProps;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const modeConfig = {
    pomodoro: { icon: BrainCircuit, label: 'Focus' },
    shortBreak: { icon: Coffee, label: 'Short Break' },
    longBreak: { icon: Coffee, label: 'Long Break' },
  };

  const backgroundClasses = {
    focusing: 'bg-slate-950', 
    break: 'bg-sky-950',      // Dark blue for break
    paused: 'bg-emerald-950',   
    idle: 'bg-emerald-950',     
  };

  return (
    <div className={`fixed inset-0 z-[200] flex flex-col items-center justify-center p-8 animate-in fade-in duration-300 transition-colors duration-1000 ${backgroundClasses[appState]}`}>
      <button onClick={onExit} className="absolute top-6 right-6 text-slate-600 hover:text-slate-300 transition-colors">
        <XCircle size={32} />
      </button>

      <div className="text-center">
        <p className="text-slate-500 text-lg mb-2">Focusing on:</p>
        <h1 className="text-4xl font-bold text-slate-100 mb-12 truncate max-w-2xl">{task.text || "Untitled Task"}</h1>

        <div className="flex justify-center gap-4 mb-8">
          {Object.entries(modeConfig).map(([mode, config]) => (
            <button 
              key={mode}
              onClick={() => onSetMode(mode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${timerMode === mode ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              {config.label}
            </button>
          ))}
        </div>

        <p className="text-9xl font-mono font-bold text-slate-100 mb-12">{formatTime(timeRemaining)}</p>

        <div className="flex items-center justify-center gap-6">
          <button onClick={onReset} className="p-4 rounded-full text-slate-400 hover:bg-slate-800 hover:text-white transition-colors" title="Reset Timer">
            <TimerReset size={24} />
          </button>
          <button 
            onClick={onStartPause}
            className="w-40 h-16 flex items-center justify-center gap-3 rounded-full bg-emerald-500 text-white text-xl font-semibold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
          >
            {isTimerActive ? <Pause size={24} /> : <Play size={24} />}
            <span>{isTimerActive ? 'Pause' : 'Start'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FocusView;