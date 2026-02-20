import * as api from '../api/client';

const DEFAULTS = {
  pomodoro: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

const MIGRATED_FLAG = 'flowMigratedToSupabase';

// On first load: push localStorage settings to Supabase, then clear them.
// On subsequent loads: pull from Supabase only.
export const initSettingsFromSupabase = async () => {
  try {
    const migrated = localStorage.getItem(MIGRATED_FLAG);

    if (!migrated) {
      // First time: push local settings to Supabase
      const localDurations = localStorage.getItem('flow-timer-durations');
      const localNudge = localStorage.getItem('flow-nudge-minutes');
      const localSound = localStorage.getItem('flow-notification-sound');
      const localViewMode = localStorage.getItem('flowAppViewMode');

      const updates = {};
      if (localDurations) {
        try { updates.timerDurations = JSON.parse(localDurations); } catch {}
      }
      if (localNudge !== null) updates.nudgeMinutes = parseInt(localNudge, 10) || 30;
      if (localSound) updates.notificationSound = localSound;
      if (localViewMode) updates.viewMode = localViewMode;

      if (Object.keys(updates).length > 0) {
        await api.updateSettings(updates);
      }

      // Clear local settings keys (migration flag is set by useTreeData)
      localStorage.removeItem('flow-timer-durations');
      localStorage.removeItem('flow-nudge-minutes');
      localStorage.removeItem('flow-notification-sound');
      localStorage.removeItem('flowAppViewMode');
    } else {
      // Already migrated: load from Supabase
      const settings = await api.getSettings();
      if (settings && settings.timerDurations) {
        localStorage.setItem('flow-timer-durations', JSON.stringify(settings.timerDurations));
      }
      if (settings && settings.nudgeMinutes !== undefined) {
        localStorage.setItem('flow-nudge-minutes', String(settings.nudgeMinutes));
      }
      if (settings && settings.notificationSound) {
        localStorage.setItem('flow-notification-sound', settings.notificationSound);
      }
      if (settings && settings.viewMode) {
        localStorage.setItem('flowAppViewMode', settings.viewMode);
      }
    }
  } catch (e) {
    // Supabase unavailable, use whatever is in localStorage
  }
};

export const getTimerDurations = () => {
  const stored = localStorage.getItem('flow-timer-durations');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return {
        pomodoro: parsed.pomodoro || DEFAULTS.pomodoro,
        shortBreak: parsed.shortBreak || DEFAULTS.shortBreak,
        longBreak: parsed.longBreak || DEFAULTS.longBreak,
      };
    } catch {
      return { ...DEFAULTS };
    }
  }
  return { ...DEFAULTS };
};

export const setTimerDurations = (durations) => {
  const value = {
    pomodoro: durations.pomodoro,
    shortBreak: durations.shortBreak,
    longBreak: durations.longBreak,
  };
  localStorage.setItem('flow-timer-durations', JSON.stringify(value));
  api.updateSettings({ timerDurations: value }).catch(console.error);
};

export const getNudgeMinutes = () => {
  const stored = localStorage.getItem('flow-nudge-minutes');
  if (stored !== null) {
    const val = parseInt(stored, 10);
    return isNaN(val) ? 30 : val;
  }
  return 30;
};

export const setNudgeMinutes = (minutes) => {
  localStorage.setItem('flow-nudge-minutes', String(minutes));
  api.updateSettings({ nudgeMinutes: minutes }).catch(console.error);
};
