import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Circle, Flag } from 'lucide-react';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import { getTodayDateString, getDeadlineStatus } from '../utils/dateUtils';

const DAY_WIDTH = 40;
const ROW_HEIGHT = 40;
const LABEL_WIDTH = 256; // w-64
const VISIBLE_DAYS = 28;

const TimelineView = ({ tasks, onUpdate, onStartFocus, onAdd, onRequestDelete, onAddRoot, selectedDate, onOpenNotes }) => {
  const todayStr = getTodayDateString();
  const [rangeStart, setRangeStart] = useState(() => {
    const today = parseISO(todayStr);
    return format(addDays(today, -7), 'yyyy-MM-dd');
  });

  const scrollContainerRef = useRef(null);
  const todayLineRef = useRef(null);

  // Generate date columns
  const dateColumns = useMemo(() => {
    const start = parseISO(rangeStart);
    return Array.from({ length: VISIBLE_DAYS }, (_, i) => {
      const d = addDays(start, i);
      return {
        date: format(d, 'yyyy-MM-dd'),
        dayLabel: format(d, 'EEE'),
        dayNum: format(d, 'd'),
        monthLabel: format(d, 'MMM'),
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isToday: format(d, 'yyyy-MM-dd') === todayStr,
      };
    });
  }, [rangeStart, todayStr]);

  // Flatten tree into rows
  const flattenedRows = useMemo(() => {
    const rows = [];
    const flatten = (nodes, path = [], depth = 0, parentHideCompleted = true) => {
      for (const node of nodes) {
        const nodeIsCompleted = node.recurrence
          ? node.completedOccurrences?.includes(selectedDate)
          : node.isCompleted;
        if (parentHideCompleted && nodeIsCompleted) continue;

        rows.push({ task: node, path, depth, isCompleted: nodeIsCompleted });
        if (node.children) {
          flatten(node.children, [...path, node.text || 'Untitled'], depth + 1, node.hideCompleted !== false);
        }
      }
    };
    flatten(tasks);
    return rows;
  }, [tasks, selectedDate]);

  // Scroll to today on mount
  useEffect(() => {
    if (todayLineRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const todayOffset = todayLineRef.current.offsetLeft;
      container.scrollLeft = todayOffset - container.clientWidth / 2;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNavWeek = (direction) => {
    const start = parseISO(rangeStart);
    setRangeStart(format(addDays(start, direction * 7), 'yyyy-MM-dd'));
  };

  const handleGoToToday = () => {
    const today = parseISO(todayStr);
    setRangeStart(format(addDays(today, -7), 'yyyy-MM-dd'));
  };

  // Get bar position for a task
  const getBarInfo = (task, isCompleted) => {
    const rangeStartDate = parseISO(rangeStart);
    const hasScheduled = !!task.scheduledDate;
    const hasDeadline = !!task.deadline;

    if (!hasScheduled && !hasDeadline) return null;

    if (hasScheduled && hasDeadline) {
      // Bar spanning scheduledDate → deadline
      const startDate = parseISO(task.scheduledDate);
      const endDate = parseISO(task.deadline);
      const barStart = differenceInDays(startDate, rangeStartDate);
      const barEnd = differenceInDays(endDate, rangeStartDate);
      // Skip if completely outside range
      if (barEnd < 0 || barStart >= VISIBLE_DAYS) return null;
      const clampedStart = Math.max(0, barStart);
      const clampedEnd = Math.min(VISIBLE_DAYS - 1, barEnd);
      return { type: 'bar', start: clampedStart, end: clampedEnd, isCompleted };
    }

    if (hasScheduled && !hasDeadline) {
      // Dot on scheduledDate
      const startDate = parseISO(task.scheduledDate);
      const dayIndex = differenceInDays(startDate, rangeStartDate);
      if (dayIndex < 0 || dayIndex >= VISIBLE_DAYS) return null;
      return { type: 'dot', day: dayIndex, isCompleted };
    }

    if (!hasScheduled && hasDeadline) {
      // Dashed bar from today to deadline
      const todayDate = parseISO(todayStr);
      const deadlineDate = parseISO(task.deadline);
      const barStart = differenceInDays(todayDate, rangeStartDate);
      const barEnd = differenceInDays(deadlineDate, rangeStartDate);
      if (barEnd < 0 || barStart >= VISIBLE_DAYS) return null;
      const clampedStart = Math.max(0, barStart);
      const clampedEnd = Math.min(VISIBLE_DAYS - 1, barEnd);
      return { type: 'dashed', start: clampedStart, end: clampedEnd, isCompleted };
    }

    return null;
  };

  const getBarColorClasses = (task, isCompleted) => {
    const status = getDeadlineStatus(task.deadline, todayStr, isCompleted);
    if (isCompleted) return 'bg-accent-subtle border-accent opacity-50';
    if (status?.urgency === 'overdue') return 'bg-danger/20 border-danger';
    if (status?.urgency === 'due-soon') return 'bg-warning/20 border-warning';
    return 'bg-accent-secondary-subtle border-accent-secondary';
  };

  const totalWidth = VISIBLE_DAYS * DAY_WIDTH;

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-300">
      {/* Navigation Controls */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-edge-secondary bg-surface-primary/80 backdrop-blur-sm">
        <button
          onClick={() => handleNavWeek(-1)}
          className="p-1.5 rounded-md text-content-tertiary hover:text-content-primary hover:bg-surface-secondary transition-colors"
          title="Previous week"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={handleGoToToday}
          className="px-3 py-1 text-xs font-medium rounded-md text-content-tertiary hover:text-content-primary hover:bg-surface-secondary transition-colors"
        >
          Today
        </button>
        <button
          onClick={() => handleNavWeek(1)}
          className="p-1.5 rounded-md text-content-tertiary hover:text-content-primary hover:bg-surface-secondary transition-colors"
          title="Next week"
        >
          <ChevronRight size={16} />
        </button>
        <span className="ml-2 text-xs text-content-muted">
          {dateColumns[0]?.monthLabel} {dateColumns[0]?.dayNum} — {dateColumns[VISIBLE_DAYS - 1]?.monthLabel} {dateColumns[VISIBLE_DAYS - 1]?.dayNum}
        </span>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Fixed Label Column */}
        <div className="flex-shrink-0 border-r border-edge-secondary bg-surface-primary" style={{ width: LABEL_WIDTH }}>
          {/* Header spacer */}
          <div className="h-10 border-b border-edge-secondary flex items-center px-3">
            <span className="text-xs font-medium text-content-muted">Tasks</span>
          </div>
          {/* Task labels */}
          <div className="overflow-y-auto" style={{ maxHeight: `calc(100vh - 200px)` }}>
            {flattenedRows.map(({ task, depth, isCompleted }) => (
              <div
                key={task.id}
                className={`flex items-center gap-2 px-3 border-b border-edge-secondary/50 truncate ${isCompleted ? 'opacity-50' : ''}`}
                style={{ height: ROW_HEIGHT, paddingLeft: `${12 + depth * 16}px` }}
                title={task.text}
              >
                <span className={`text-xs truncate ${isCompleted ? 'line-through text-content-muted' : 'text-content-primary'}`}>
                  {task.text || 'Untitled'}
                </span>
                {task.deadline && (() => {
                  const status = getDeadlineStatus(task.deadline, todayStr, isCompleted);
                  if (!status || status.urgency === 'normal' || status.urgency === 'completed') return null;
                  return (
                    <Flag size={10} className={status.urgency === 'overdue' ? 'text-danger flex-shrink-0' : 'text-warning flex-shrink-0'} />
                  );
                })()}
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Timeline Grid */}
        <div ref={scrollContainerRef} className="flex-1 overflow-auto">
          <div style={{ minWidth: totalWidth }}>
            {/* Date Headers */}
            <div className="flex h-10 border-b border-edge-secondary sticky top-0 bg-surface-primary/95 backdrop-blur-sm z-10">
              {dateColumns.map((col) => (
                <div
                  key={col.date}
                  className={`flex flex-col items-center justify-center border-r border-edge-secondary/30 ${col.isWeekend ? 'bg-surface-tertiary/50' : ''} ${col.isToday ? 'bg-accent-subtle' : ''}`}
                  style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}
                >
                  <span className={`text-[9px] leading-none ${col.isToday ? 'text-accent font-bold' : 'text-content-muted'}`}>{col.dayLabel}</span>
                  <span className={`text-[10px] leading-none mt-0.5 ${col.isToday ? 'text-accent font-bold' : 'text-content-tertiary'}`}>{col.dayNum}</span>
                </div>
              ))}
            </div>

            {/* Task Rows */}
            <div className="relative">
              {/* Today vertical line */}
              {(() => {
                const rangeStartDate = parseISO(rangeStart);
                const todayIndex = differenceInDays(parseISO(todayStr), rangeStartDate);
                if (todayIndex < 0 || todayIndex >= VISIBLE_DAYS) return null;
                return (
                  <div
                    ref={todayLineRef}
                    className="absolute top-0 bottom-0 w-px bg-danger z-10 pointer-events-none"
                    style={{ left: todayIndex * DAY_WIDTH + DAY_WIDTH / 2 }}
                  />
                );
              })()}

              {flattenedRows.map(({ task, isCompleted }) => {
                const barInfo = getBarInfo(task, isCompleted);

                return (
                  <div key={task.id} className="flex relative" style={{ height: ROW_HEIGHT }}>
                    {/* Background grid cells */}
                    {dateColumns.map((col) => (
                      <div
                        key={col.date}
                        className={`border-r border-b border-edge-secondary/20 ${col.isWeekend ? 'bg-surface-tertiary/30' : ''}`}
                        style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH, height: ROW_HEIGHT }}
                      />
                    ))}

                    {/* Bar / Dot overlay */}
                    {barInfo && barInfo.type === 'bar' && (
                      <div
                        className={`absolute top-2.5 rounded-full border h-4 ${getBarColorClasses(task, isCompleted)}`}
                        style={{
                          left: barInfo.start * DAY_WIDTH + 4,
                          width: (barInfo.end - barInfo.start + 1) * DAY_WIDTH - 8,
                        }}
                        title={`${task.scheduledDate} → ${task.deadline}`}
                      />
                    )}
                    {barInfo && barInfo.type === 'dot' && (
                      <div
                        className="absolute top-3 flex items-center justify-center"
                        style={{ left: barInfo.day * DAY_WIDTH + DAY_WIDTH / 2 - 5 }}
                        title={task.scheduledDate}
                      >
                        <Circle size={10} className={`fill-accent-secondary text-accent-secondary ${isCompleted ? 'opacity-50' : ''}`} />
                      </div>
                    )}
                    {barInfo && barInfo.type === 'dashed' && (
                      <div
                        className={`absolute top-2.5 rounded-full h-4 border border-dashed ${getBarColorClasses(task, isCompleted)}`}
                        style={{
                          left: barInfo.start * DAY_WIDTH + 4,
                          width: Math.max(DAY_WIDTH - 8, (barInfo.end - barInfo.start + 1) * DAY_WIDTH - 8),
                        }}
                        title={`→ ${task.deadline}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineView;
