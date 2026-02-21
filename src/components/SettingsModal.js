import React, { useContext, useRef, useState } from 'react';
import {
  X,
  UploadCloud,
  DownloadCloud,
  Volume2,
  LogOut,
} from 'lucide-react';
import { SOUND_OPTIONS, playNotificationSound, getNotificationSound, setNotificationSound } from '../utils/notificationSounds';
import { getTimerDurations, setTimerDurations, getNudgeMinutes, setNudgeMinutes } from '../utils/timerSettings';
import ThemeContext from '../contexts/ThemeContext';

// --- Component: Settings Modal ---
const SettingsModal = ({ isOpen, onClose, onExport, onImport, simulatedToday, setSimulatedToday, onLogout }) => {
  const importFileRef = useRef(null);
  const [selectedSound, setSelectedSound] = useState(() => getNotificationSound());
  const [durations, setDurations] = useState(() => {
    const d = getTimerDurations();
    return { pomodoro: d.pomodoro / 60, shortBreak: d.shortBreak / 60, longBreak: d.longBreak / 60 };
  });
  const [nudge, setNudge] = useState(() => getNudgeMinutes());
  const { theme, setTheme } = useContext(ThemeContext);

  if (!isOpen) return null;

  const handleImportClick = () => {
    importFileRef.current.click();
  };

  const handleDurationChange = (key, value) => {
    const minutes = Math.max(1, Math.min(120, parseInt(value, 10) || 1));
    const next = { ...durations, [key]: minutes };
    setDurations(next);
    setTimerDurations({
      pomodoro: next.pomodoro * 60,
      shortBreak: next.shortBreak * 60,
      longBreak: next.longBreak * 60,
    });
  };

  const handleNudgeChange = (value) => {
    const minutes = Math.max(0, Math.min(480, parseInt(value, 10) || 0));
    setNudge(minutes);
    setNudgeMinutes(minutes);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-primary border border-edge-primary rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-content-primary">Settings</h3>
          <button onClick={onClose} className="p-1 text-content-muted hover:text-content-inverse rounded-full">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          {/* Theme Toggle */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-content-tertiary uppercase tracking-wider mb-2">Theme</label>
            <div className="flex bg-surface-secondary rounded-lg p-1">
              <button
                onClick={() => setTheme('work')}
                className={`flex-1 text-sm py-2 rounded-md font-medium transition-colors ${
                  theme === 'work'
                    ? 'bg-accent-bold text-content-inverse shadow-sm'
                    : 'text-content-tertiary hover:text-content-primary'
                }`}
              >
                Work
              </button>
              <button
                onClick={() => setTheme('personal')}
                className={`flex-1 text-sm py-2 rounded-md font-medium transition-colors ${
                  theme === 'personal'
                    ? 'bg-accent-bold text-content-inverse shadow-sm'
                    : 'text-content-tertiary hover:text-content-primary'
                }`}
              >
                Personal
              </button>
            </div>
          </div>

          <button
            onClick={onExport}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-surface-secondary hover:bg-surface-secondary text-content-primary transition-colors"
          >
            <DownloadCloud size={18} />
            <span>Export Data</span>
          </button>
          <button
            onClick={handleImportClick}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-surface-secondary hover:bg-surface-secondary text-content-primary transition-colors"
          >
            <UploadCloud size={18} />
            <span>Import Data</span>
          </button>
          <input
            type="file"
            ref={importFileRef}
            className="hidden"
            accept=".json"
            onChange={onImport}
          />

          <div className="pt-4 border-t border-edge-secondary">
            <label className="block text-sm font-medium text-content-tertiary mb-3">Timer Durations (minutes)</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'pomodoro', label: 'Focus' },
                { key: 'shortBreak', label: 'Short Break' },
                { key: 'longBreak', label: 'Long Break' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs text-content-muted mb-1">{label}</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={durations[key]}
                    onChange={(e) => handleDurationChange(key, e.target.value)}
                    className="w-full bg-surface-secondary text-content-primary text-sm rounded-lg p-2 text-center focus:outline-none focus:ring-1 focus:ring-edge-focus"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-content-muted mt-1.5">Takes effect on the next timer start.</p>
          </div>

          <div className="pt-4 border-t border-edge-secondary">
            <label className="block text-sm font-medium text-content-tertiary mb-2">Idle Nudge</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="480"
                value={nudge}
                onChange={(e) => handleNudgeChange(e.target.value)}
                className="w-20 bg-surface-secondary text-content-primary text-sm rounded-lg p-2.5 text-center focus:outline-none focus:ring-1 focus:ring-edge-focus"
              />
              <span className="text-sm text-content-tertiary">minutes of inactivity</span>
            </div>
            <p className="text-xs text-content-muted mt-1">Nudge notification when no timer is running. 0 to disable.</p>
          </div>

          <div className="pt-4 border-t border-edge-secondary">
            <label className="block text-sm font-medium text-content-tertiary mb-2">Notification Sound</label>
            <div className="flex items-center gap-2">
              <select
                value={selectedSound}
                onChange={(e) => {
                  setSelectedSound(e.target.value);
                  setNotificationSound(e.target.value);
                }}
                className="flex-1 bg-surface-secondary text-content-primary text-sm rounded-lg p-2.5 border-none focus:outline-none focus:ring-1 focus:ring-edge-focus"
              >
                {SOUND_OPTIONS.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <button
                onClick={() => playNotificationSound(selectedSound)}
                disabled={selectedSound === 'none'}
                className="p-2.5 rounded-lg bg-surface-secondary hover:bg-surface-secondary text-content-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Preview sound"
              >
                <Volume2 size={16} />
              </button>
            </div>
            <p className="text-xs text-content-muted mt-1">Plays when a pomodoro or break ends.</p>
          </div>

          <div className="pt-4 border-t border-edge-secondary">
            <label className="block text-sm font-medium text-content-tertiary mb-2">Time Travel (Debug)</label>
            <div className="flex items-center gap-2 bg-surface-secondary rounded-lg p-2">
                <input
                    type="date"
                    value={simulatedToday}
                    onChange={(e) => setSimulatedToday(e.target.value)}
                    className="bg-transparent text-content-primary text-sm focus:outline-none w-full"
                />
            </div>
            <p className="text-xs text-content-muted mt-1">Simulate "Today" for testing logic.</p>
          </div>

          <div className="pt-4 border-t border-edge-secondary">
            <label className="block text-sm font-medium text-content-tertiary mb-2">Account</label>
            <button
              onClick={() => {
                if (window.confirm('Switch to a different secret? You can always come back by entering the same secret.')) {
                  onLogout();
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-surface-secondary hover:bg-surface-secondary text-content-secondary transition-colors text-sm"
            >
              <LogOut size={16} />
              <span>Change Secret</span>
            </button>
            <p className="text-xs text-content-muted mt-1">Switch to a different workspace.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
