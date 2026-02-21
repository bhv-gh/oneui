import React, { useMemo } from 'react';
import { subDays, format, eachDayOfInterval, getDay } from 'date-fns';
import { isDateAnOccurrence } from '../utils/dateUtils';

const RecurringTask = ({ task }) => {
  const { data, firstDayOffset } = useMemo(() => {
    const today = new Date();
    const ninetyDaysAgo = subDays(today, 89); // 90 days total
    const range = eachDayOfInterval({ start: ninetyDaysAgo, end: today });

    const dayData = range.map(date => {
      const dateString = format(date, 'yyyy-MM-dd');
      const isOccurrence = isDateAnOccurrence(task, dateString);
      const isCompleted = task.completedOccurrences?.includes(dateString);

      let status = 'inactive';
      if (isOccurrence) {
        if (isCompleted) {
          status = 'completed';
        } else if (date < today && date.setHours(0,0,0,0) < today.setHours(0,0,0,0)) {
          status = 'missed';
        } else {
          status = 'pending';
        }
      }

      return { date: dateString, status };
    });

    return { data: dayData, firstDayOffset: getDay(ninetyDaysAgo) };
  }, [task]);

  const statusColors = {
    inactive: 'bg-surface-secondary',
    completed: 'bg-accent-bold',
    missed: 'bg-danger',
    pending: 'bg-surface-secondary',
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Add blank days to the start of the grid to align the first day of the month
  const offsetDivs = Array.from({ length: firstDayOffset }).map((_, i) => <div key={`offset-${i}`} />);

  return (
    <div className="mb-8 p-4 bg-surface-secondary rounded-lg">
      <h2 className="text-lg font-semibold text-content-inverse">{task.text}</h2>
      <div className="flex gap-4 mt-4">
        <div className="grid grid-rows-7 grid-flow-col gap-1.5">
          {offsetDivs}
          {data.map(({ date, status }) => (
            <div
              key={date}
              className={`w-4 h-4 rounded-sm ${statusColors[status]}`}
              title={`${date}: ${status}`}
            />
          ))}
        </div>
        <div className="text-xs text-content-tertiary flex flex-col gap-2">
            <p className="font-bold">Last 90 Days</p>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-accent-bold"></div> Completed</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-danger"></div> Missed</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-surface-secondary"></div> Pending</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-surface-secondary"></div> Not an occurrence</div>
        </div>
      </div>
    </div>
  );
};

const InsightsView = ({ tasks }) => {
  const recurringTasks = useMemo(() => {
    const allTasks = [];
    const flatten = (nodes) => {
      for (const node of nodes) {
        allTasks.push(node);
        if (node.children) {
          flatten(node.children);
        }
      }
    };
    flatten(tasks);
    return allTasks.filter(task => task.recurrence);
  }, [tasks]);

  return (
    <div className="p-8 text-content-inverse animate-in fade-in duration-300">
      <h1 className="text-2xl font-bold mb-6">Recurring Task Consistency</h1>
      {recurringTasks.length > 0 ? (
        recurringTasks.map(task => (
          <RecurringTask key={task.id} task={task} />
        ))
      ) : (
        <p className="text-content-tertiary">No recurring tasks found.</p>
      )}
    </div>
  );
};

export default InsightsView;
