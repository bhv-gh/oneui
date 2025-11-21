import { parseISO, isToday, addDays, addWeeks, addMonths, differenceInDays, differenceInCalendarWeeks, differenceInMonths, format } from 'date-fns';

export const getTodayDateString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0]; // YYYY-MM-DD format
};

export const isDateAnOccurrence = (task, targetDateStr) => {
  if (!task.recurrence || !task.scheduledDate) return false;

  const { frequency, interval, daysOfWeek } = task.recurrence;
  const startDate = parseISO(task.scheduledDate);
  const targetDate = parseISO(targetDateStr);

  if (targetDate < startDate) return false;

  switch (frequency) {
    case 'daily': {
      const diff = differenceInDays(targetDate, startDate);
      return diff >= 0 && diff % interval === 0;
    }
    case 'weekly': {
      if (!daysOfWeek || !daysOfWeek.includes(targetDate.getDay())) {
        return false;
      }
      // Check if the week difference is a multiple of the interval
      const diffWeeks = differenceInCalendarWeeks(targetDate, startDate, { weekStartsOn: 1 }); // Assuming Monday start
      return diffWeeks >= 0 && diffWeeks % interval === 0;
    }
    case 'monthly': {
      if (targetDate.getDate() !== startDate.getDate()) {
        return false; // Must be same day of the month
      }
      const diffMonths = differenceInMonths(targetDate, startDate);
      return diffMonths >= 0 && diffMonths % interval === 0;
    }
    default:
      return false;
  }
};

export const calculateNextOccurrence = (task, completionDateStr) => {
  if (!task.recurrence || !task.scheduledDate) return null;

  const { frequency, interval, daysOfWeek } = task.recurrence;
  const completionDate = completionDateStr ? parseISO(completionDateStr) : new Date();
  let nextDate = parseISO(task.scheduledDate);

  // This loop "catches up" the task by advancing its date until it's past the completion date.
  while (nextDate <= completionDate) {
    switch (frequency) {
      case 'daily':
        nextDate = addDays(nextDate, interval);
        break;
      case 'weekly': {
        if (!daysOfWeek || daysOfWeek.length === 0) {
          nextDate = addWeeks(nextDate, interval);
          break;
        }
        
        let potentialNextDate = new Date(nextDate);
        const sortedDays = [...daysOfWeek].sort();
        let foundNext = false;

        // Look for the next valid day, starting from the day after the current `nextDate`
        for (let i = 1; i <= 7; i++) {
          potentialNextDate = addDays(nextDate, i);
          if (sortedDays.includes(potentialNextDate.getDay())) {
            nextDate = potentialNextDate;
            foundNext = true;
            break;
          }
        }
        // If no valid day is found in the next 7 days, jump by the interval
        if (!foundNext) {
          nextDate = addWeeks(nextDate, interval);
        }
        break;
      }
      case 'monthly':
        nextDate = addMonths(nextDate, interval);
        break;
      default:
        // If frequency is unknown, break the loop to prevent an infinite loop
        return null;
    }
  }
  return nextDate;
};