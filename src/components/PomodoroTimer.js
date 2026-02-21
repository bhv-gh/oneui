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
      <div className="flex justify-center flex-wrap gap-1.5 sm:gap-4 mb-3 sm:mb-8">
        {Object.entries(modeConfig).map(([mode, config]) => (
          <button
            key={mode}
            onClick={() => onSetMode(mode)}
            className={`px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${timerMode === mode ? 'bg-accent-subtle text-accent' : 'text-content-tertiary hover:bg-surface-secondary'}`}
          >
            {config.label}
          </button>
        ))}
      </div>

      <p
        className="font-mono font-bold text-content-primary mb-3 sm:mb-8 leading-none"
        style={{ fontSize: 'clamp(2rem, 18vw, 8rem)' }}
      >
        {formatTime(timeRemaining)}
      </p>

      <div className="flex items-center justify-center gap-3 sm:gap-6">
        <button onClick={onReset} className="p-2 sm:p-4 rounded-full text-content-tertiary hover:bg-surface-secondary hover:text-content-inverse transition-colors" title="Reset Timer">
          <TimerReset size={22} />
        </button>
        <button
          onClick={onStartPause}
          className="px-6 py-3 sm:px-8 sm:py-4 flex items-center justify-center gap-2 rounded-full bg-accent-bold text-content-inverse text-base sm:text-xl font-semibold shadow-lg shadow-accent-bold/20 hover:bg-accent-bolder transition-all"
        >
          {isTimerActive ? <Pause size={20} /> : <Play size={20} />}
          <span>{isTimerActive ? 'Pause' : 'Start'}</span>
        </button>
        <button onClick={onTogglePip} className="p-2 sm:p-4 rounded-full text-content-tertiary hover:bg-surface-secondary hover:text-content-inverse transition-colors" title="Picture-in-Picture">
          <PictureInPicture size={22} />
        </button>
      </div>
    </>
  );
};

export default PomodoroTimer;
