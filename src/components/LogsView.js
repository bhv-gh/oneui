import React, { useState, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { Pencil, Trash } from 'lucide-react';

const getTodayDateString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
};
  

// --- Component: Logs View ---
const LogsView = ({ logs, selectedDate, onAddManualLog, onEditLog, onDeleteLog, onUpdateLogTime, onInteractionChange }) => {
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
    const dailyLogs = logs.filter(log => {
      const isValidLog = log.startTime instanceof Date && !isNaN(log.startTime) && log.endTime instanceof Date && !isNaN(log.endTime);
      if (!isValidLog) return false;
      return format(log.startTime, 'yyyy-MM-dd') === selectedDate;
    }).sort((a, b) => a.startTime - b.startTime);

    if (dailyLogs.length === 0) {
      setProcessedLogs([]);
      return;
    }

    // This algorithm determines how to stack overlapping logs side-by-side.
    const columns = [];
    const logsWithColumnData = [];

    dailyLogs.forEach(log => {
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
      ref={scrollContainerRef} // This ref is for scrolling to current time
      className="flex-1 h-0 px-8 md:px-12 pb-8 overflow-y-auto animate-in fade-in duration-300"
    >
      <h2 className="text-2xl font-bold text-slate-200 mb-6">
        Activity Log for {format(validDateForLogs, 'MMMM d, yyyy')}
      </h2>
      <div className="flex gap-4">
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

          {/* Log Entries */}
          {processedLogs.map(log => {
            const currentLog = tempLog && tempLog.id === log.id ? tempLog : log;
            const { top, height } = getPositionAndHeight(currentLog.startTime, currentLog.endTime);
            const { width, left } = log.display;
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
  );
};

export default LogsView;