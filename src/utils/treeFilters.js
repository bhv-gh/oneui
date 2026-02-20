import { isDateAnOccurrence } from './dateUtils';

export const filterTreeByCompletionDate = (nodes, date) => {
  return nodes.map(node => {
    const children = node.children ? filterTreeByCompletionDate(node.children, date) : [];
    const hasCompletedChildren = children.some(c => c !== null);

    const wasCompletedOnDate = node.recurrence
      ? node.completedOccurrences?.includes(date)
      : node.completionDate === date;

    if (wasCompletedOnDate || hasCompletedChildren) {
      return { ...node, children };
    }
    return null;
  }).filter(node => node !== null);
};

export const filterTreeByScheduledDate = (nodes, date) => {
  return nodes.map(node => {
    const originalChildrenCount = node.children?.length || 0;
    const children = node.children ? filterTreeByScheduledDate(node.children, date) : [];
    const hasScheduledChildren = children.some(c => c !== null);

    if ((node.scheduledDate === date || isDateAnOccurrence(node, date)) || hasScheduledChildren) {
      return { ...node, children, originalChildrenCount };
    }
    return null;
  }).filter(node => node !== null);
};

export const filterForTodayView = (nodes, today) => {
  return nodes.map(node => {
    const originalChildrenCount = node.children?.length || 0;
    const visibleChildren = node.children ? filterForTodayView(node.children, today) : [];

    const isCompletedForToday = node.recurrence
      ? node.completedOccurrences?.includes(today)
      : (node.isCompleted && node.completionDate === today);

    const isRelevantToday = (node.scheduledDate && node.scheduledDate <= today) || isDateAnOccurrence(node, today) || !node.scheduledDate;

    const isTaskActionable = isRelevantToday && !isCompletedForToday;
    const wasCompletedToday = node.recurrence
      ? node.completedOccurrences?.includes(today)
      : node.isCompleted && node.completionDate === today;
    const hasVisibleDescendants = visibleChildren.length > 0;

    if (isTaskActionable || wasCompletedToday || hasVisibleDescendants) {
      return { ...node, children: visibleChildren, originalChildrenCount };
    }
    return null;
  }).filter(node => node !== null);
};
