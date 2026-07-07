import React, { useContext, useRef, useState } from 'react';
import {
  X,
  UploadCloud,
  DownloadCloud,
  Volume2,
  LogOut,
  Music,
  Timer,
  Bell,
  Palette,
  Database,
  Bug,
  UserCircle,
  Sparkles,
  Film,
} from 'lucide-react';
import { SOUND_OPTIONS, playNotificationSound, getNotificationSound, setNotificationSound } from '../utils/notificationSounds';
import { getTimerDurations, setTimerDurations, getNudgeMinutes, setNudgeMinutes, getReminderMinutes, setReminderMinutes } from '../utils/timerSettings';
import { getBgMusicUrl, setBgMusicUrl, getBgMusicVolume, setBgMusicVolume } from '../utils/backgroundMusic';
import ThemeContext from '../contexts/ThemeContext';
import { PetSkinPicker } from './FlowPet';
import ClipGallery from './ClipGallery';

const SectionHeader = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 mb-3">
    <Icon size={14} className="text-accent" />
    <label className="text-xs font-semibold text-content-tertiary uppercase tracking-wider">{title}</label>
  </div>
);

const SettingsModal = ({ isOpen, onClose, onExport, onImport, simulatedToday, setSimulatedToday, onLogout }) => {
  const importFileRef = useRef(null);
  const [selectedSound, setSelectedSound] = useState(() => getNotificationSound());
  const [durations, setDurations] = useState(() => {
    const d = getTimerDurations();
    return { pomodoro: d.pomodoro / 60, shortBreak: d.shortBreak / 60, longBreak: d.longBreak / 60 };
  });
  const [nudge, setNudge] = useState(() => getNudgeMinutes());
  const [reminder, setReminder] = useState(() => getReminderMinutes());
  const [bgMusicUrl, setBgMusicUrlState] = useState(() => getBgMusicUrl());
  const [bgMusicVol, setBgMusicVol] = useState(() => getBgMusicVolume());
  const { theme, setTheme } = useContext(ThemeContext);
  const [bgEmojis, setBgEmojis] = useState(() => localStorage.getItem('flow-bg-emojis') || '');
  const [petEnabled, setPetEnabled] = useState(() => localStorage.getItem('flow-pet-enabled') !== 'false');

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
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-surface-primary border border-edge-primary rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 pb-4 border-b border-edge-secondary flex-shrink-0">
          <h3 className="text-lg font-semibold text-content-primary">Settings</h3>
          <button onClick={onClose} className="p-1.5 text-content-muted hover:text-content-primary hover:bg-surface-secondary rounded-lg transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
          {/* Theme */}
          <div>
            <SectionHeader icon={Palette} title="Theme" />
            <div className="flex bg-surface-secondary rounded-lg p-1">
              <button
                onClick={() => setTheme('work')}
                className={`flex-1 text-sm py-2 rounded-md font-medium transition-all ${
                  theme === 'work'
                    ? 'bg-accent-bold text-content-inverse shadow-sm'
                    : 'text-content-tertiary hover:text-content-primary'
                }`}
              >
                Work
              </button>
              <button
                onClick={() => setTheme('personal')}
                className={`flex-1 text-sm py-2 rounded-md font-medium transition-all ${
                  theme === 'personal'
                    ? 'bg-accent-bold text-content-inverse shadow-sm'
                    : 'text-content-tertiary hover:text-content-primary'
                }`}
              >
                Personal
              </button>
            </div>
          </div>

          {/* Fun */}
          <div>
            <SectionHeader icon={Sparkles} title="Vibes" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-content-secondary">Flow Pet (pixel cat companion)</span>
                <button
                  onClick={() => {
                    const next = !petEnabled;
                    setPetEnabled(next);
                    localStorage.setItem('flow-pet-enabled', String(next));
                    window.dispatchEvent(new Event('flow-vibes-changed'));
                  }}
                  className={`relative w-10 h-5 rounded-full transition-colors ${petEnabled ? 'bg-accent-bold' : 'bg-surface-secondary'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${petEnabled ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
              {petEnabled && (
                <div>
                  <label className="text-xs text-content-secondary block mb-1.5">Cat Skin</label>
                  <PetSkinPicker />
                </div>
              )}
              <div>
                <label className="text-xs text-content-secondary block mb-1.5">Background Emojis</label>
                <input
                  type="text"
                  value={bgEmojis}
                  onChange={(e) => {
                    setBgEmojis(e.target.value);
                    localStorage.setItem('flow-bg-emojis', e.target.value);
                    window.dispatchEvent(new Event('flow-vibes-changed'));
                  }}
                  placeholder="✨ 🌟 💫 🦋 🌸 (space separated)"
                  className="w-full bg-surface-secondary text-content-primary text-sm rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-accent-bold/50 placeholder:text-content-muted transition-all"
                />
                <p className="text-xs text-content-muted mt-1">Leave empty for defaults. Paste any emojis!</p>
              </div>
            </div>
          </div>

          {/* Timer */}
          <div>
            <SectionHeader icon={Timer} title="Timer Durations" />
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
                    className="w-full bg-surface-secondary text-content-primary text-sm rounded-lg p-2 text-center focus:outline-none focus:ring-1 focus:ring-accent-bold/50 transition-all"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-content-muted mt-1.5">Takes effect on the next timer start.</p>

            <div className="flex items-center gap-2 mt-3">
              <input
                type="number"
                min="0"
                max="480"
                value={nudge}
                onChange={(e) => handleNudgeChange(e.target.value)}
                className="w-20 bg-surface-secondary text-content-primary text-sm rounded-lg p-2 text-center focus:outline-none focus:ring-1 focus:ring-accent-bold/50 transition-all"
              />
              <span className="text-xs text-content-tertiary">min idle nudge <span className="text-content-disabled">(0 = off)</span></span>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <input
                type="number"
                min="0"
                max="60"
                value={reminder}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(60, parseInt(e.target.value, 10) || 0));
                  setReminder(val);
                  setReminderMinutes(val);
                }}
                className="w-20 bg-surface-secondary text-content-primary text-sm rounded-lg p-2 text-center focus:outline-none focus:ring-1 focus:ring-accent-bold/50 transition-all"
              />
              <span className="text-xs text-content-tertiary">min before scheduled time <span className="text-content-disabled">(0 = off)</span></span>
            </div>
            <p className="text-xs text-content-muted mt-1">Notifies you before tasks with a scheduled time.</p>
          </div>

          {/* Sound */}
          <div>
            <SectionHeader icon={Bell} title="Notification Sound" />
            <div className="flex items-center gap-2">
              <select
                value={selectedSound}
                onChange={(e) => {
                  setSelectedSound(e.target.value);
                  setNotificationSound(e.target.value);
                }}
                className="flex-1 bg-surface-secondary text-content-primary text-sm rounded-lg p-2.5 border-none focus:outline-none focus:ring-1 focus:ring-accent-bold/50 transition-all"
              >
                {SOUND_OPTIONS.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <button
                onClick={() => playNotificationSound(selectedSound)}
                disabled={selectedSound === 'none'}
                className="p-2.5 rounded-lg bg-surface-secondary hover:bg-accent-subtle hover:text-accent text-content-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Preview sound"
              >
                <Volume2 size={16} />
              </button>
            </div>
          </div>

          {/* Background Music */}
          <div>
            <SectionHeader icon={Music} title="Background Music" />
            <input
              type="text"
              placeholder="Paste audio URL (e.g. Supabase storage link)"
              value={bgMusicUrl}
              onChange={(e) => {
                setBgMusicUrlState(e.target.value);
                setBgMusicUrl(e.target.value);
              }}
              className="w-full bg-surface-secondary text-content-primary text-sm rounded-lg p-2.5 border-none focus:outline-none focus:ring-1 focus:ring-accent-bold/50 placeholder:text-content-muted transition-all"
            />
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-content-muted w-12">Vol</span>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(bgMusicVol * 100)}
                onChange={(e) => {
                  const vol = parseInt(e.target.value, 10) / 100;
                  setBgMusicVol(vol);
                  setBgMusicVolume(vol);
                }}
                className="flex-1 h-1 accent-accent-bold cursor-pointer"
              />
              <span className="text-xs text-content-muted w-8 text-right">{Math.round(bgMusicVol * 100)}%</span>
            </div>
            <p className="text-xs text-content-muted mt-1">Auto-plays during focus, pauses on break.</p>
          </div>

          {/* Timelapses */}
          <div>
            <SectionHeader icon={Film} title="Timelapses" />
            <ClipGallery />
          </div>

          {/* Data */}
          <div>
            <SectionHeader icon={Database} title="Data" />
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onExport}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-surface-secondary hover:bg-accent-subtle hover:text-accent border border-transparent hover:border-accent/20 text-content-primary transition-all text-sm"
              >
                <DownloadCloud size={15} />
                <span>Export</span>
              </button>
              <button
                onClick={handleImportClick}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-surface-secondary hover:bg-accent-subtle hover:text-accent border border-transparent hover:border-accent/20 text-content-primary transition-all text-sm"
              >
                <UploadCloud size={15} />
                <span>Import</span>
              </button>
            </div>
            <input
              type="file"
              ref={importFileRef}
              className="hidden"
              accept=".json"
              onChange={onImport}
            />
          </div>

          {/* Debug */}
          <div>
            <SectionHeader icon={Bug} title="Debug" />
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

          {/* Account */}
          <div>
            <SectionHeader icon={UserCircle} title="Account" />
            <button
              onClick={() => {
                if (window.confirm('Switch to a different secret? You can always come back by entering the same secret.')) {
                  onLogout();
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-surface-secondary hover:bg-danger-subtle hover:text-danger border border-transparent hover:border-danger/20 text-content-secondary transition-all text-sm"
            >
              <LogOut size={15} />
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
