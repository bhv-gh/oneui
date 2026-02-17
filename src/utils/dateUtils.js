import { parseISO, isToday, addDays, addWeeks, addMonths, addYears, differenceInDays, differenceInCalendarWeeks, differenceInMonths, format } from 'date-fns';

export const getTodayDateString = () => {
  return format(new Date(), 'yyyy-MM-dd');
};

export const isDateAnOccurrence = (task, targetDateStr) => {
  if (!task.recurrence) return false;
  
  const recurrenceStartDate = task.recurrenceStartDate || task.scheduledDate;
  if (!recurrenceStartDate) return false;

  const { frequency, interval, daysOfWeek } = task.recurrence;
  const startDate = parseISO(recurrenceStartDate);
  const targetDate = parseISO(targetDateStr);

  if (targetDate < startDate && format(targetDate, 'yyyy-MM-dd') !== format(startDate, 'yyyy-MM-dd')) return false;

  switch (frequency) {
    case 'daily': {
      const diff = differenceInDays(targetDate, startDate);
      return diff >= 0 && diff % interval === 0;
    }
    case 'weekly': {
      if (!daysOfWeek || !daysOfWeek.includes(targetDate.getDay())) {
        return false;
      }
      const diffWeeks = differenceInCalendarWeeks(targetDate, startDate, { weekStartsOn: 1 }); // Assuming Monday start
      return diffWeeks >= 0 && diffWeeks % interval === 0;
    }
    case 'monthly': {
      if (startDate.getDate() !== targetDate.getDate()) {
        return false;
      }
      const diffMonths = differenceInMonths(targetDate, startDate);
      return diffMonths >= 0 && diffMonths % interval === 0;
    }
    default:
      return false;
  }
};

export const calculateNextOccurrence = (task, completionDateStr) => {
  if (!task.recurrence) return null;

  const completionDate = completionDateStr ? parseISO(completionDateStr) : new Date();
  let potentialNextDate = addDays(completionDate, 1);

  for (let i = 0; i < 365 * 5; i++) { // 5-year safety limit
    if (isDateAnOccurrence(task, format(potentialNextDate, 'yyyy-MM-dd'))) {
      return potentialNextDate;
    }
    potentialNextDate = addDays(potentialNextDate, 1);
  }
  
  return null; // Return null if no occurrence is found within 5 years
};