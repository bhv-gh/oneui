const DEFAULTS = {
  pomodoro: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
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
  localStorage.setItem('flow-timer-durations', JSON.stringify({
    pomodoro: durations.pomodoro,
    shortBreak: durations.shortBreak,
    longBreak: durations.longBreak,
  }));
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
};
