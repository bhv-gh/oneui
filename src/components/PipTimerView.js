import React from 'react';
import { getTimerDurations } from '../utils/timerSettings';

// Dedicated PiP timer with self-contained inline styles.
// Does NOT depend on Tailwind — works in the PiP window independently.
const PipTimerView = ({
  timeRemaining,
  isTimerActive,
  timerMode,
  onStartPause,
  onReset,
  onSetMode,
  onTogglePip,
  onCapture,
  capturedCount,
  appState,
}) => {
  const [minimized, setMinimized] = React.useState(false);
  const [jotOpen, setJotOpen] = React.useState(false);
  const [jotText, setJotText] = React.useState('');
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (jotOpen && inputRef.current) inputRef.current.focus();
  }, [jotOpen]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const modes = [
    { key: 'pomodoro', label: 'Focus' },
    { key: 'shortBreak', label: 'Short Break' },
    { key: 'longBreak', label: 'Long Break' },
  ];

  const handleJotSubmit = () => {
    if (jotText.trim()) {
      onCapture(jotText.trim());
      setJotText('');
    }
    setJotOpen(false);
  };

  const s = {
    root: {
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '3vh 4vw',
      boxSizing: 'border-box',
    },
    modeRow: {
      display: 'flex',
      justifyContent: 'center',
      gap: '2vw',
      marginBottom: '3vh',
    },
    modeBtn: (active) => ({
      padding: '1vh 3vw',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontSize: 'clamp(10px, 2.8vw, 14px)',
      fontWeight: 500,
      background: active ? 'rgba(16,185,129,0.12)' : 'transparent',
      color: active ? '#34d399' : '#94a3b8',
      transition: 'all 0.2s',
    }),
    timer: {
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
      fontSize: 'clamp(2.5rem, 18vw, 5rem)',
      fontWeight: 700,
      color: '#f1f5f9',
      lineHeight: 1,
      marginBottom: '3vh',
      letterSpacing: '-0.02em',
    },
    controlRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '3vw',
    },
    iconBtn: {
      width: 'clamp(32px, 8vw, 44px)',
      height: 'clamp(32px, 8vw, 44px)',
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      color: '#94a3b8',
      transition: 'all 0.2s',
    },
    mainBtn: {
      padding: '1.5vh 5vw',
      borderRadius: '9999px',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5em',
      background: '#10b981',
      color: 'white',
      fontSize: 'clamp(12px, 3.5vw, 18px)',
      fontWeight: 600,
      boxShadow: '0 4px 14px rgba(16,185,129,0.25)',
      transition: 'all 0.2s',
    },
    jotArea: {
      marginTop: 'auto',
      paddingTop: '2vh',
      display: 'flex',
      justifyContent: 'center',
      width: '100%',
    },
    jotBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 14px',
      borderRadius: '9999px',
      border: '1px solid #334155',
      background: 'rgba(30,41,59,0.8)',
      color: '#94a3b8',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: 500,
      transition: 'all 0.2s',
    },
    jotBadge: {
      fontSize: '10px',
      background: 'rgba(16,185,129,0.2)',
      color: '#34d399',
      padding: '1px 6px',
      borderRadius: '9999px',
      fontWeight: 500,
    },
    jotInputRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: 'rgba(30,41,59,0.9)',
      border: '1px solid #334155',
      borderRadius: '12px',
      padding: '6px 12px',
    },
    jotInput: {
      background: 'transparent',
      border: 'none',
      outline: 'none',
      color: '#e2e8f0',
      fontSize: '13px',
      flex: 1,
      minWidth: '160px',
    },
    jotSubmit: {
      width: '26px',
      height: '26px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(16,185,129,0.2)',
      color: '#34d399',
      transition: 'all 0.2s',
    },
  };

  // Simple SVG icons (avoid lucide dependency in PiP)
  const ResetIcon = () => (
    <svg width="clamp(14px,4vw,20px)" height="clamp(14px,4vw,20px)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
    </svg>
  );

  const PlayIcon = () => (
    <svg width="clamp(14px,3.5vw,20px)" height="clamp(14px,3.5vw,20px)" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  );

  const PauseIcon = () => (
    <svg width="clamp(14px,3.5vw,20px)" height="clamp(14px,3.5vw,20px)" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
    </svg>
  );

  const PipIcon = () => (
    <svg width="clamp(14px,4vw,20px)" height="clamp(14px,4vw,20px)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4.5v5H3m-1-6 6 6m13 0v-3c0-1.16-.84-2-2-2h-7m-9 9v3c0 1.16.84 2 2 2h7"/>
      <rect x="12" y="13.5" width="10" height="7" rx="2"/>
    </svg>
  );

  const PlusIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );

  const barColors = {
    focusing: '#10b981',
    break: '#0ea5e9',
    paused: '#f59e0b',
    idle: '#64748b',
  };

  const handleMinimize = () => {
    setMinimized(true);
  };

  const handleRestore = () => {
    setMinimized(false);
  };

  if (minimized) {
    const durations = getTimerDurations();
    const totalMap = { pomodoro: durations.pomodoro, shortBreak: durations.shortBreak, longBreak: durations.longBreak };
    const total = totalMap[timerMode] || durations.pomodoro;
    const elapsed = Math.max(0, total - timeRemaining);
    const pct = Math.min(100, (elapsed / total) * 100);

    return (
      <div
        onClick={handleRestore}
        style={{
          width: '100%',
          height: '100%',
          background: '#0f172a',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${pct}%`,
            background: barColors[appState] || barColors.idle,
            transition: 'width 1s linear, background 0.6s',
          }}
        />
      </div>
    );
  }

  return (
    <div style={s.root}>
      {/* Minimize button — top-right corner */}
      <button
        onClick={handleMinimize}
        title="Minimize"
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          color: '#475569',
          transition: 'color 0.2s',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Mode Tabs */}
      <div style={s.modeRow}>
        {modes.map(m => (
          <button
            key={m.key}
            onClick={() => onSetMode(m.key)}
            style={s.modeBtn(timerMode === m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Timer */}
      <div style={s.timer}>
        {formatTime(timeRemaining)}
      </div>

      {/* Controls */}
      <div style={s.controlRow}>
        <button onClick={onReset} style={s.iconBtn} title="Reset">
          <ResetIcon />
        </button>
        <button onClick={onStartPause} style={s.mainBtn}>
          {isTimerActive ? <PauseIcon /> : <PlayIcon />}
          <span>{isTimerActive ? 'Pause' : 'Start'}</span>
        </button>
        <button onClick={onTogglePip} style={s.iconBtn} title="Exit PiP">
          <PipIcon />
        </button>
      </div>

      {/* Jot / Quick Capture */}
      <div style={s.jotArea}>
        {!jotOpen ? (
          <button onClick={() => setJotOpen(true)} style={s.jotBtn}>
            <PlusIcon />
            <span>Jot</span>
            {capturedCount > 0 && <span style={s.jotBadge}>{capturedCount}</span>}
          </button>
        ) : (
          <div style={s.jotInputRow}>
            <input
              ref={inputRef}
              type="text"
              value={jotText}
              onChange={e => setJotText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); handleJotSubmit(); }
                if (e.key === 'Escape') { setJotText(''); setJotOpen(false); }
              }}
              onBlur={() => { if (!jotText.trim()) setJotOpen(false); }}
              placeholder="Jot down a task..."
              style={s.jotInput}
            />
            <button
              onClick={handleJotSubmit}
              disabled={!jotText.trim()}
              style={{ ...s.jotSubmit, opacity: jotText.trim() ? 1 : 0.3 }}
            >
              <PlusIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PipTimerView;
