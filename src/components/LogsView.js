import React, { useState, useEffect, useRef, useMemo } from 'react';
import { format, parseISO, startOfWeek, addDays } from 'date-fns';
import { Pencil, Trash, Clock, Flame, Trophy, TrendingUp } from 'lucide-react';
import { findNodePath } from '../utils/treeUtils';

const getTodayDateString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
};


// --- Component: Logs View ---
const LogsView = ({ logs, treeData, selectedDate, onAddManualLog, onEditLog, onDeleteLog, onUpdateLogTime, onInteractionChange }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i); // 0 to 23

  const snapTo15Minutes = (time) => {
    const msIn15Minutes = 15 * 60 * 1000;
    const msSinceEpoch = time.getTime();
    const roundedMs = Math.round(msSinceEpoch / msIn15Minutes) * msIn15Minutes;
    return new Date(roundedMs);
  };

  const dateForLogs = parseISO(selectedDate);
  const timelineRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [currentTimeTop, setCurrentTimeTop] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [interaction, setInteraction] = useState(null); // { type: 'move' | 'resize-top' | 'resize-bottom', logId: string, initialY: number, initialStartTime: Date, initialEndTime: Date }

  // This state will hold a temporary version of the log being dragged/resized for smooth UI feedback
  const [tempLog, setTempLog] = useState(null);

  const [dragStartTime, setDragStartTime] = useState(null);
  const [dragCurrentY, setDragCurrentY] = useState(null);
  const [processedLogs, setProcessedLogs] = useState([]);

  // Ensure dateForLogs is a valid Date object, falling back to today if invalid
  const validDateForLogs = isNaN(dateForLogs.getTime()) ? new Date() : dateForLogs;

  // --- Derived Data (useMemo) ---

  const dailyLogs = useMemo(() => {
    return logs.filter(log => {
      const isValidLog = log.startTime instanceof Date && !isNaN(log.startTime) && log.endTime instanceof Date && !isNaN(log.endTime);
      if (!isValidLog) return false;
      return format(log.startTime, 'yyyy-MM-dd') === selectedDate;
    });
  }, [logs, selectedDate]);

  // Stats Summary
  const stats = useMemo(() => {
    if (dailyLogs.length === 0) {
      return { totalFocus: 0, sessions: 0, longestSession: 0, peakHour: null };
    }

    let totalMs = 0;
    let longestMs = 0;
    const hourBuckets = {};

    dailyLogs.forEach(log => {
      const durationMs = log.endTime.getTime() - log.startTime.getTime();
      totalMs += durationMs;
      if (durationMs > longestMs) longestMs = durationMs;

      // Accumulate time per hour
      const startHour = log.startTime.getHours();
      const endHour = log.endTime.getHours();
      const startMin = log.startTime.getMinutes();
      const endMin = log.endTime.getMinutes();

      if (startHour === endHour) {
        hourBuckets[startHour] = (hourBuckets[startHour] || 0) + durationMs;
      } else {
        // First hour partial
        const firstHourMs = (60 - startMin) * 60 * 1000;
        hourBuckets[startHour] = (hourBuckets[startHour] || 0) + firstHourMs;
        // Full hours in between
        for (let h = startHour + 1; h < endHour; h++) {
          hourBuckets[h] = (hourBuckets[h] || 0) + 3600000;
        }
        // Last hour partial
        const lastHourMs = endMin * 60 * 1000;
        if (lastHourMs > 0) {
          hourBuckets[endHour] = (hourBuckets[endHour] || 0) + lastHourMs;
        }
      }
    });

    let peakHour = null;
    let peakMs = 0;
    Object.entries(hourBuckets).forEach(([hour, ms]) => {
      if (ms > peakMs) {
        peakMs = ms;
        peakHour = parseInt(hour);
      }
    });

    return {
      totalFocus: totalMs,
      sessions: dailyLogs.length,
      longestSession: longestMs,
      peakHour,
    };
  }, [dailyLogs]);

  const formatDuration = (ms) => {
    const totalMinutes = Math.round(ms / 60000);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const formatHour = (hour) => {
    if (hour === null || hour === undefined) return '--';
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  // Weekly Activity data
  const weekData = useMemo(() => {
    const selected = parseISO(selectedDate);
    const weekStart = startOfWeek(selected, { weekStartsOn: 1 }); // Monday
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const days = dayLabels.map((label, i) => {
      const day = addDays(weekStart, i);
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayLogs = logs.filter(log => {
        const isValidLog = log.startTime instanceof Date && !isNaN(log.startTime) && log.endTime instanceof Date && !isNaN(log.endTime);
        if (!isValidLog) return false;
        return format(log.startTime, 'yyyy-MM-dd') === dayStr;
      });
      const totalMs = dayLogs.reduce((sum, log) => sum + (log.endTime.getTime() - log.startTime.getTime()), 0);
      const totalHours = totalMs / 3600000;
      return { label, dateStr: dayStr, totalHours, isSelected: dayStr === selectedDate };
    });

    const maxHours = Math.max(...days.map(d => d.totalHours), 0.1); // avoid division by 0
    return { days, maxHours };
  }, [logs, selectedDate]);

  // Streak calculation
  const streak = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    let count = 0;
    let checkDate = today;

    // Build a set of dates that have logs
    const datesWithLogs = new Set();
    logs.forEach(log => {
      const isValidLog = log.startTime instanceof Date && !isNaN(log.startTime);
      if (isValidLog) {
        datesWithLogs.add(format(log.startTime, 'yyyy-MM-dd'));
      }
    });

    // Count consecutive days backward from today
    while (true) {
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      if (datesWithLogs.has(dateStr)) {
        count++;
        checkDate = addDays(checkDate, -1);
      } else {
        break;
      }
    }
    return count;
  }, [logs]);

  // Motivation quip
  const quip = useMemo(() => {
    if (dailyLogs.length === 0) return 'Ready to start your first session?';
    const totalHours = stats.totalFocus / 3600000;
    if (totalHours < 1) return 'Good start — keep it rolling.';
    if (totalHours <= 3) return 'Solid focus day.';
    return 'Deep work mode — impressive.';
  }, [dailyLogs, stats.totalFocus]);

  // Task breakdown grouped by root task (category/project)
  const taskBreakdown = useMemo(() => {
    if (dailyLogs.length === 0) return [];
    const categoryMap = {};
    dailyLogs.forEach(log => {
      let categoryName = 'Manual';
      let hasTaskId = false;
      if (log.taskId && treeData) {
        hasTaskId = true;
        const path = findNodePath(treeData, log.taskId);
        categoryName = path.length > 0 ? path[0].text : (log.taskText || 'Untitled');
      }
      if (!categoryMap[categoryName]) {
        categoryMap[categoryName] = { categoryName, totalMs: 0, hasTaskId, tasks: {} };
      }
      categoryMap[categoryName].totalMs += log.endTime.getTime() - log.startTime.getTime();
      // Track individual tasks within the category
      const taskKey = log.taskText || 'Untitled';
      if (!categoryMap[categoryName].tasks[taskKey]) {
        categoryMap[categoryName].tasks[taskKey] = 0;
      }
      categoryMap[categoryName].tasks[taskKey] += log.endTime.getTime() - log.startTime.getTime();
    });
    const sorted = Object.values(categoryMap).sort((a, b) => b.totalMs - a.totalMs);
    const maxMs = sorted[0]?.totalMs || 1;
    return sorted.map(c => ({ ...c, fraction: c.totalMs / maxMs }));
  }, [dailyLogs, treeData]);

  // Effect to calculate and update the current time indicator's position
  useEffect(() => {
    const calculateTop = () => {
      const now = new Date();
      const startOfDay = new Date(now).setHours(0, 0, 0, 0);
      const totalDayMilliseconds = 24 * 60 * 60 * 1000;
      const elapsedMilliseconds = now.getTime() - startOfDay;
      return (elapsedMilliseconds / totalDayMilliseconds) * 100;
    };

    setCurrentTimeTop(calculateTop());

    const interval = setInterval(() => {
      setCurrentTimeTop(calculateTop());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Effect to scroll the timeline to the current time on initial render
  useEffect(() => {
    if (scrollContainerRef.current && selectedDate === getTodayDateString()) {
      const container = scrollContainerRef.current;
      const scrollPosition = (currentTimeTop / 100) * container.scrollHeight;
      // Scroll to center the current time line in the viewport
      container.scrollTop = scrollPosition - (container.clientHeight / 2);
    }
  }, [currentTimeTop, selectedDate]); // Run when component mounts or date changes to today

  const getPositionAndHeight = (startTime, endTime) => {
    const startOfDay = new Date(startTime).setHours(0, 0, 0, 0);
    const totalDayMilliseconds = 24 * 60 * 60 * 1000;

    const startMilliseconds = startTime.getTime() - startOfDay;
    const endMilliseconds = endTime.getTime() - startOfDay;

    const top = (startMilliseconds / totalDayMilliseconds) * 100;
    const height = ((endMilliseconds - startMilliseconds) / totalDayMilliseconds) * 100;

    return { top: `${top}%`, height: `${height}%` };
  };

  // Helper to convert Y-coordinate to a Date object for the selected day
  const getTimeFromY = (yClient, timelineRect) => {
    const yRelative = yClient - timelineRect.top;
    const fractionOfDay = yRelative / timelineRect.height;
    const totalMillisecondsInDay = 24 * 60 * 60 * 1000;
    const timeMilliseconds = fractionOfDay * totalMillisecondsInDay;

    // Ensure dateForLogs is a valid date before using it.
    // Fallback to today if it's not, which prevents the error.
    const baseDate = (dateForLogs instanceof Date && !isNaN(dateForLogs)) ? dateForLogs : new Date();

    const finalDate = new Date(baseDate);
    finalDate.setHours(0, 0, 0, 0); // Start of the selected day
    finalDate.setTime(finalDate.getTime() + timeMilliseconds);
    return snapTo15Minutes(finalDate);
  };

  const handleTimelineMouseDown = (e) => {
    if (e.button !== 0 || !timelineRef.current) return; // Only left click
    const timelineRect = timelineRef.current.getBoundingClientRect();
    const time = getTimeFromY(e.clientY, timelineRect);
    setDragStartTime(time);
    setDragCurrentY(e.clientY);
    setIsDragging(true);
  };

  const handleTimelineMouseMove = (e) => {
    if (!isDragging) return;
    setDragCurrentY(e.clientY);
  };

  const handleTimelineMouseUp = (e) => {
    if (!isDragging || !timelineRef.current || !dragStartTime) return;
    setIsDragging(false);
    const timelineRect = timelineRef.current.getBoundingClientRect();
    const dragEndTime = getTimeFromY(e.clientY, timelineRect);

    // Ensure start time is before end time
    const finalStartTime = dragStartTime < dragEndTime ? dragStartTime : dragEndTime;
    const finalEndTime = dragStartTime < dragEndTime ? dragEndTime : dragStartTime;

    const durationMs = finalEndTime.getTime() - finalStartTime.getTime();

    if (durationMs > 5 * 60 * 1000) { // Only create log if duration > 5 mins
      onAddManualLog({ startTime: finalStartTime, endTime: finalEndTime });
    }
    setDragStartTime(null);
    setDragCurrentY(null);
  };

  // This effect will manage the user-select style during timeline interactions
  useEffect(() => {
    const isInteracting = isDragging || !!interaction;
    onInteractionChange(isInteracting);
    // The return function is a cleanup that runs when the component unmounts
    // or before the effect runs again.
    return () => {
      // Ensure we clean up the style if the component unmounts mid-drag
      onInteractionChange(false);
    };
  }, [isDragging, interaction, onInteractionChange]);

  // --- Interaction Handlers for Moving/Resizing Logs ---
  useEffect(() => {
    const handleInteractionMove = (e) => {
      if (!interaction || !timelineRef.current) return;

      const timelineRect = timelineRef.current.getBoundingClientRect();
      const deltaY = e.clientY - interaction.initialY;
      const totalDayMilliseconds = 24 * 60 * 60 * 1000;
      const timeDelta = (deltaY / timelineRect.height) * totalDayMilliseconds;

      let newStartTime = new Date(interaction.initialStartTime);
      let newEndTime = new Date(interaction.initialEndTime);

      if (interaction.type === 'move') {
        newStartTime.setTime(interaction.initialStartTime.getTime() + timeDelta);
        newEndTime.setTime(interaction.initialEndTime.getTime() + timeDelta);
      } else if (interaction.type === 'resize-top') {
        newStartTime.setTime(interaction.initialStartTime.getTime() + timeDelta);
        if (newStartTime >= newEndTime) newStartTime = new Date(newEndTime.getTime() - 1); // Prevent inverting
      } else if (interaction.type === 'resize-bottom') {
        newEndTime.setTime(interaction.initialEndTime.getTime() + timeDelta);
        if (newEndTime <= newStartTime) newEndTime = new Date(newStartTime.getTime() + 1); // Prevent inverting
      }

      // Snap the times during the drag for immediate visual feedback
      setTempLog({ ...tempLog, startTime: snapTo15Minutes(newStartTime), endTime: snapTo15Minutes(newEndTime) });
    };

    const handleInteractionEnd = () => {
      if (interaction && tempLog) {
        onUpdateLogTime(tempLog.id, tempLog.startTime, tempLog.endTime);
      }
      setInteraction(null);
      setTempLog(null);
    };

    if (interaction) {
      window.addEventListener('mousemove', handleInteractionMove);
      window.addEventListener('mouseup', handleInteractionEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleInteractionMove);
      window.removeEventListener('mouseup', handleInteractionEnd);
    };
  }, [interaction, tempLog, onUpdateLogTime]);

  const startInteraction = (e, log, type) => {
    e.stopPropagation(); // Prevent timeline drag from firing
    setInteraction({
      type,
      logId: log.id,
      initialY: e.clientY,
      initialStartTime: log.startTime,
      initialEndTime: log.endTime,
    });
    setTempLog(log); // Set the initial log for temporary updates
  };

  // This effect recalculates the layout of logs whenever the logs themselves or the selected date change.
  useEffect(() => {
    const filteredLogs = logs.filter(log => {
      const isValidLog = log.startTime instanceof Date && !isNaN(log.startTime) && log.endTime instanceof Date && !isNaN(log.endTime);
      if (!isValidLog) return false;
      return format(log.startTime, 'yyyy-MM-dd') === selectedDate;
    }).sort((a, b) => a.startTime - b.startTime);

    if (filteredLogs.length === 0) {
      setProcessedLogs([]);
      return;
    }

    // This algorithm determines how to stack overlapping logs side-by-side.
    const columns = [];
    const logsWithColumnData = [];

    filteredLogs.forEach(log => {
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        if (log.startTime >= columns[i]) {
          logsWithColumnData.push({ ...log, col: i });
          columns[i] = log.endTime;
          placed = true;
          break;
        }
      }
      if (!placed) {
        logsWithColumnData.push({ ...log, col: columns.length });
        columns.push(log.endTime);
      }
    });

    const finalProcessedLogs = logsWithColumnData.map(log => {
      const overlapping = logsWithColumnData.filter(otherLog =>
        log.id !== otherLog.id &&
        log.startTime < otherLog.endTime &&
        log.endTime > otherLog.startTime
      );

      const concurrentCols = overlapping.reduce((max, ol) => Math.max(max, ol.col), log.col) + 1;

      return {
        ...log,
        display: {
          width: `${100 / concurrentCols}%`,
          left: `${(log.col / concurrentCols) * 100}%`,
        }
      };
    });

    setProcessedLogs(finalProcessedLogs);
  }, [logs, selectedDate]);

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 h-0 px-8 md:px-12 pb-8 overflow-y-auto animate-in fade-in duration-300"
    >
      <h2 className="text-2xl font-bold text-slate-200 mb-6">
        Activity Log for {format(validDateForLogs, 'MMMM d, yyyy')}
      </h2>

      <div className="flex gap-6">
        {/* --- Left Sidebar: Stats, Chart, Streak, Breakdown --- */}
        <div className="w-64 flex-shrink-0 space-y-4 sticky top-0 self-start">

          {/* --- 1. Stats Summary --- */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Clock, label: 'Total Focus', value: stats.totalFocus > 0 ? formatDuration(stats.totalFocus) : '0m' },
              { icon: Flame, label: 'Sessions', value: stats.sessions },
              { icon: Trophy, label: 'Longest', value: stats.longestSession > 0 ? formatDuration(stats.longestSession) : '--' },
              { icon: TrendingUp, label: 'Peak Hour', value: formatHour(stats.peakHour) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2.5 flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-slate-700/50">
                  <Icon size={14} className="text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 leading-tight">{label}</p>
                  <p className="text-sm font-semibold text-slate-100 truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* --- 2. Weekly Activity Mini-Chart --- */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg px-3 py-3">
            <p className="text-[10px] text-slate-400 mb-2 font-medium">This Week</p>
            <div className="flex items-end justify-between gap-1.5" style={{ height: 64 }}>
              {weekData.days.map(day => {
                const barHeight = day.totalHours > 0 ? Math.max((day.totalHours / weekData.maxHours) * 100, 5) : 0;
                return (
                  <div key={day.dateStr} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full flex items-end justify-center" style={{ height: 48 }}>
                      {barHeight > 0 ? (
                        <div
                          className={`w-full max-w-[20px] rounded-t-sm transition-all ${day.isSelected ? 'bg-emerald-500' : 'bg-slate-700'}`}
                          style={{ height: `${barHeight}%` }}
                          title={`${day.totalHours.toFixed(1)}h`}
                        />
                      ) : (
                        <div className="w-full max-w-[20px] h-[2px] rounded bg-slate-800" />
                      )}
                    </div>
                    <span className={`text-[9px] ${day.isSelected ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* --- 3. Streak & Motivation --- */}
          <div className="space-y-1 text-xs">
            {streak > 0 && (
              <span className="flex items-center gap-1 text-amber-400 font-medium">
                <Flame size={12} className="text-amber-400" />
                {streak} day streak
              </span>
            )}
            <p className="text-slate-400 italic">{quip}</p>
          </div>

          {/* --- 5. Task Breakdown --- */}
          {taskBreakdown.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-400 font-medium mb-2">Task Breakdown</p>
              <div className="space-y-2.5">
                {taskBreakdown.map(category => (
                  <div key={category.categoryName}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${category.hasTaskId ? 'bg-emerald-400' : 'bg-sky-400'}`} />
                      <span className="text-xs text-slate-200 font-medium flex-1 truncate" title={category.categoryName}>{category.categoryName}</span>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">{formatDuration(category.totalMs)}</span>
                    </div>
                    {Object.keys(category.tasks).length > 1 && (
                      <div className="ml-3.5 space-y-0.5">
                        {Object.entries(category.tasks)
                          .sort(([,a], [,b]) => b - a)
                          .map(([taskName, ms]) => (
                            <div key={taskName} className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-500 flex-1 truncate" title={taskName}>{taskName}</span>
                              <span className="text-[10px] text-slate-600 flex-shrink-0">{formatDuration(ms)}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* --- Right: Timeline --- */}
        <div className="flex-1 flex gap-4 min-w-0">
          {/* Timeline Axis */}
          <div className="flex flex-col text-xs text-slate-500">
            {hours.map(hour => (
              <div key={hour} className="h-24 flex-shrink-0 -translate-y-2">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
            ))}
          </div>

          {/* Timeline Grid */}
          <div
            ref={timelineRef}
            className="relative flex-1 bg-slate-900/50 rounded-2xl"
            onMouseDown={handleTimelineMouseDown}
            onMouseMove={handleTimelineMouseMove}
            onMouseUp={handleTimelineMouseUp}
          >
            {/* Hour lines */}
            {hours.map(hour => (
              <div key={hour} className="h-24 border-t border-slate-800/80"></div>
            ))}

            {/* Current Time Indicator */}
            {selectedDate === getTodayDateString() && (
              <div
                className="absolute w-full h-px bg-rose-400 z-10"
                style={{ top: `${currentTimeTop}%` }}
              >
                <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-rose-400 rounded-full border-2 border-slate-900"></div>
              </div>
            )}

            {/* Empty State */}
            {processedLogs.length === 0 && !isDragging && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center px-6 py-8">
                  <div className="text-slate-600 text-4xl mb-3">○</div>
                  <p className="text-slate-500 text-sm">No sessions logged.</p>
                  <p className="text-slate-600 text-xs mt-1">Drag to create one, or start a Pomodoro.</p>
                </div>
              </div>
            )}

            {/* Log Entries */}
            {processedLogs.map(log => {
              const currentLog = tempLog && tempLog.id === log.id ? tempLog : log;
              const { top, height } = getPositionAndHeight(currentLog.startTime, currentLog.endTime);
              const { width, left } = log.display;
              const durationMs = currentLog.endTime.getTime() - currentLog.startTime.getTime();
              return (
                <div
                  key={log.id}
                  className="absolute px-1 transition-all duration-100"
                  style={{ top, height, width, left }}
                >
                  <div
                    onMouseDown={(e) => startInteraction(e, log, 'move')}
                    className={`group relative h-full border-l-2 rounded-lg p-2 flex flex-col justify-center cursor-move ${log.taskId ? 'bg-emerald-500/10 border-emerald-400' : 'bg-sky-500/10 border-sky-400/50'}`}
                  >
                    {/* Resize Handles */}
                    <div onMouseDown={(e) => startInteraction(e, log, 'resize-top')} className="absolute -top-1 left-0 w-full h-2 cursor-row-resize" />
                    <div onMouseDown={(e) => startInteraction(e, log, 'resize-bottom')} className="absolute -bottom-1 left-0 w-full h-2 cursor-row-resize" />

                    <p className={`text-sm font-medium truncate ${log.taskId ? 'text-emerald-300' : 'text-sky-300'}`}>{log.taskText}</p>
                    <p className={`text-xs ${log.taskId ? 'text-emerald-500' : 'text-sky-500'}`}>
                      {format(currentLog.startTime, 'h:mm a')} - {format(currentLog.endTime, 'h:mm a')}
                    </p>

                    {/* Duration Badge */}
                    <span className={`absolute bottom-1 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${log.taskId ? 'bg-emerald-500/20 text-emerald-400' : 'bg-sky-500/20 text-sky-400'}`}>
                      {formatDuration(durationMs)}
                    </span>

                    {/* Hover controls for Edit/Delete */}
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEditLog(log)}
                        className="p-1 rounded bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white"
                        title="Edit Log"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => onDeleteLog(log.id)}
                        className="p-1 rounded bg-slate-800/50 text-rose-400/70 hover:bg-rose-500/50 hover:text-white"
                        title="Delete Log"
                      >
                        <Trash size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Manual Selection Box */}
            {isDragging && dragStartTime && dragCurrentY !== null && (() => {
              const timelineRect = timelineRef.current.getBoundingClientRect();
              const currentDragTime = getTimeFromY(dragCurrentY, timelineRect);
              const start = dragStartTime < currentDragTime ? dragStartTime : currentDragTime;
              const end = dragStartTime < currentDragTime ? currentDragTime : dragStartTime;
              const { top, height } = getPositionAndHeight(start, end);
              return (
                <div
                  className="absolute w-full bg-sky-500/30 rounded-r-lg pointer-events-none"
                  style={{ top, height }}
                ></div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogsView;
