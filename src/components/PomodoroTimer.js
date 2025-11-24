import React from 'react';
import {
  BrainCircuit,
  Coffee,
  TimerReset,
  Play,
  Pause,
  PictureInPicture,
} from 'lucide-react';

const PomodoroTimer = ({ 
  timeRemaining, 
  isTimerActive, 
  timerMode,
  onStartPause, 
  onReset,
  onSetMode,
  onTogglePip
}) => {

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

  return (
    <>
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

      <p 
        className="font-mono font-bold text-slate-100 mb-8"
        style={{ fontSize: 'clamp(2rem, 20vw, 8rem)' }}
      >
        {formatTime(timeRemaining)}
      </p>

      <div className="flex items-center justify-center gap-6">
        <button onClick={onReset} className="p-4 rounded-full text-slate-400 hover:bg-slate-800 hover:text-white transition-colors" title="Reset Timer">
          <TimerReset size={24} />
        </button>
        <button 
          onClick={onStartPause}
          className="w-32 h-16 md:w-40 flex items-center justify-center gap-3 rounded-full bg-emerald-500 text-white text-xl font-semibold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
        >
          {isTimerActive ? <Pause size={24} /> : <Play size={24} />}
          <span>{isTimerActive ? 'Pause' : 'Start'}</span>
        </button>
        <button onClick={onTogglePip} className="p-4 rounded-full text-slate-400 hover:bg-slate-800 hover:text-white transition-colors" title="Picture-in-Picture">
          <PictureInPicture size={24} />
        </button>
      </div>
    </>
  );
};

export default PomodoroTimer;
