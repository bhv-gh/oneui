import { useState, useEffect, useCallback, useRef } from 'react';
import { format, differenceInCalendarDays } from 'date-fns';
import { getUserHash } from '../utils/userHash';

function getStorageKey() {
  const hash = getUserHash();
  const scope = hash ? hash.slice(0, 12) : 'anon';
  return `flow-productivity-stats-${scope}`;
}

function loadStats() {
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (raw) return JSON.parse(raw);
  } catch {}
  return { dailyCompletions: {}, totalCompleted: 0, lastActiveDate: null };
}

function saveStats(stats) {
  localStorage.setItem(getStorageKey(), JSON.stringify(stats));
}

export function useProductivityStats(treeData, logs) {
  const [stats, setStats] = useState(loadStats);
  const prevTreeRef = useRef(null);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Count completed tasks in tree
  const countCompleted = useCallback((nodes) => {
    let count = 0;
    for (const node of nodes) {
      if (node.isCompleted) count++;
      if (node.children) count += countCompleted(node.children);
    }
    return count;
  }, []);

  // Detect new completions by comparing tree snapshots
  useEffect(() => {
    if (!treeData || treeData.length === 0) return;

    const currentCompleted = countCompleted(treeData);

    if (prevTreeRef.current !== null) {
      const prevCompleted = countCompleted(prevTreeRef.current);
      const delta = currentCompleted - prevCompleted;

      if (delta > 0) {
        setStats(prev => {
          const dailyCompletions = { ...prev.dailyCompletions };
          dailyCompletions[todayStr] = (dailyCompletions[todayStr] || 0) + delta;
          const updated = {
            ...prev,
            dailyCompletions,
            totalCompleted: prev.totalCompleted + delta,
            lastActiveDate: todayStr,
          };
          saveStats(updated);
          return updated;
        });
      }
    }

    prevTreeRef.current = JSON.parse(JSON.stringify(treeData));
  }, [treeData, countCompleted, todayStr]);

  // Derived stats
  const completionsToday = stats.dailyCompletions[todayStr] || 0;

  const focusSessionsToday = (logs || []).filter(log => {
    if (!(log.startTime instanceof Date) || isNaN(log.startTime)) return false;
    return format(log.startTime, 'yyyy-MM-dd') === todayStr;
  }).length;

  // Streak calculation
  let streakDays = 0;
  const checkDate = new Date();
  while (true) {
    const dateStr = format(checkDate, 'yyyy-MM-dd');
    if (stats.dailyCompletions[dateStr] > 0) {
      streakDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    completionsToday,
    focusSessionsToday,
    streakDays,
    totalCompleted: stats.totalCompleted,
    dailyCompletions: stats.dailyCompletions,
  };
}
