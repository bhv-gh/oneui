import React, { useMemo } from 'react';
import { subDays, format, eachDayOfInterval, getDay } from 'date-fns';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { isDateAnOccurrence } from '../utils/dateUtils';

// Per-recurring-task 90-day adherence heatmap. (Previously the body of the
// standalone Insights tab; now embedded in the Change tab.)
const RecurringTask = ({ task }) => {
  const { data, firstDayOffset, stats } = useMemo(() => {
    const today = new Date();
    const ninetyDaysAgo = subDays(today, 89);
    const range = eachDayOfInterval({ start: ninetyDaysAgo, end: today });

    let completed = 0;
    let missed = 0;
    let pending = 0;
    let total = 0;

    const dayData = range.map(date => {
      const dateString = format(date, 'yyyy-MM-dd');
      const isOccurrence = isDateAnOccurrence(task, dateString);
      const isCompleted = task.completedOccurrences?.includes(dateString);

      let status = 'inactive';
      if (isOccurrence) {
        total++;
        if (isCompleted) {
          status = 'completed';
          completed++;
        } else if (date < today && date.setHours(0, 0, 0, 0) < today.setHours(0, 0, 0, 0)) {
          status = 'missed';
          missed++;
        } else {
          status = 'pending';
          pending++;
        }
      }

      return { date: dateString, status };
    });

    const rate = total > 0 ? Math.round((completed / (completed + missed)) * 100) : 0;

    return {
      data: dayData,
      firstDayOffset: getDay(ninetyDaysAgo),
      stats: { completed, missed, pending, total, rate },
    };
  }, [task]);

  const statusColors = {
    inactive: 'bg-surface-secondary/50',
    completed: 'bg-accent-bold',
    missed: 'bg-danger/80',
    pending: 'bg-warning/40',
  };

  const offsetDivs = Array.from({ length: firstDayOffset }).map((_, i) => <div key={`offset-${i}`} />);

  return (
    <div className="p-5 bg-surface-secondary/60 border border-edge-secondary rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-content-primary truncate">{task.text}</h3>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-sm font-bold ${stats.rate >= 80 ? 'text-accent' : stats.rate >= 50 ? 'text-warning' : 'text-danger'}`}>
            {stats.rate}%
          </span>
          <span className="text-xs text-content-muted">adherence</span>
        </div>
      </div>

      <div className="flex gap-4 items-start">
        <div className="grid grid-rows-7 grid-flow-col gap-[3px]">
          {offsetDivs}
          {data.map(({ date, status }) => (
            <div
              key={date}
              className={`w-3.5 h-3.5 rounded-sm transition-colors ${statusColors[status]}`}
              title={`${date}: ${status}`}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-edge-secondary">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-accent" />
          <span className="text-xs text-content-tertiary">{stats.completed} done</span>
        </div>
        <div className="flex items-center gap-1.5">
          <XCircle size={12} className="text-danger" />
          <span className="text-xs text-content-tertiary">{stats.missed} missed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={12} className="text-warning" />
          <span className="text-xs text-content-tertiary">{stats.pending} upcoming</span>
        </div>
      </div>
    </div>
  );
};

// Embeddable "Habit consistency" section: overall adherence stats + a heatmap
// per recurring task. Renders a compact hint when there are no recurring tasks.
const RecurringAdherence = ({ tasks }) => {
  const recurringTasks = useMemo(() => {
    const allTasks = [];
    const flatten = (nodes) => {
      for (const node of nodes || []) {
        allTasks.push(node);
        if (node.children) flatten(node.children);
      }
    };
    flatten(tasks);
    return allTasks.filter(task => task.recurrence);
  }, [tasks]);

  const overallStats = useMemo(() => {
    let totalCompleted = 0;
    let totalMissed = 0;
    const today = new Date();
    const ninetyDaysAgo = subDays(today, 89);
    const range = eachDayOfInterval({ start: ninetyDaysAgo, end: today });

    recurringTasks.forEach(task => {
      range.forEach(date => {
        const dateString = format(date, 'yyyy-MM-dd');
        if (isDateAnOccurrence(task, dateString)) {
          if (task.completedOccurrences?.includes(dateString)) {
            totalCompleted++;
          } else if (date < today) {
            totalMissed++;
          }
        }
      });
    });

    const rate = (totalCompleted + totalMissed) > 0
      ? Math.round((totalCompleted / (totalCompleted + totalMissed)) * 100)
      : 0;

    return { totalCompleted, totalMissed, rate, taskCount: recurringTasks.length };
  }, [recurringTasks]);

  return (
    <div>
      <h2 className="text-sm font-semibold text-content-tertiary uppercase tracking-wider mb-4">Habit consistency</h2>

      {recurringTasks.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-surface-secondary/60 border border-edge-secondary rounded-xl px-4 py-3" style={{ borderLeft: '3px solid #818cf8' }}>
              <p className="text-[10px] text-content-muted uppercase tracking-wider mb-1">Habits Tracked</p>
              <p className="text-2xl font-bold" style={{ color: '#818cf8' }}>{overallStats.taskCount}</p>
            </div>
            <div className="bg-surface-secondary/60 border border-edge-secondary rounded-xl px-4 py-3" style={{ borderLeft: `3px solid ${overallStats.rate >= 80 ? '#4ade80' : overallStats.rate >= 50 ? '#eab308' : '#f43f5e'}` }}>
              <p className="text-[10px] text-content-muted uppercase tracking-wider mb-1">Overall Adherence</p>
              <p className={`text-2xl font-bold ${overallStats.rate >= 80 ? 'text-accent' : overallStats.rate >= 50 ? 'text-warning' : 'text-danger'}`}>
                {overallStats.rate}%
              </p>
            </div>
            <div className="bg-surface-secondary/60 border border-edge-secondary rounded-xl px-4 py-3" style={{ borderLeft: '3px solid #4ade80' }}>
              <p className="text-[10px] text-content-muted uppercase tracking-wider mb-1">Completed (90d)</p>
              <p className="text-2xl font-bold" style={{ color: '#4ade80' }}>{overallStats.totalCompleted}</p>
            </div>
            <div className="bg-surface-secondary/60 border border-edge-secondary rounded-xl px-4 py-3" style={{ borderLeft: '3px solid #f43f5e' }}>
              <p className="text-[10px] text-content-muted uppercase tracking-wider mb-1">Missed (90d)</p>
              <p className="text-2xl font-bold" style={{ color: '#f43f5e' }}>{overallStats.totalMissed}</p>
            </div>
          </div>

          <div className="space-y-4">
            {recurringTasks.map(task => (
              <RecurringTask key={task.id} task={task} />
            ))}
          </div>
        </>
      ) : (
        <div className="bg-surface-secondary/60 border border-edge-secondary rounded-xl p-5 text-sm text-content-muted">
          Add recurrence to a task (daily, weekly, monthly) to track its adherence heatmap here.
        </div>
      )}
    </div>
  );
};

export default RecurringAdherence;
