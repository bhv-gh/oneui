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

// Unified date filter for any non-today date.
// Shows tasks that are scheduled for, recur on, or were completed on the given date.
export const filterTreeByDate = (nodes, date, today) => {
  const isPastOrPresent = date <= today;
  return nodes.map(node => {
    const originalChildrenCount = node.children?.length || 0;
    const children = node.children ? filterTreeByDate(node.children, date, today) : [];
    const hasMatchingChildren = children.length > 0;

    // Task is scheduled for this exact date
    const isScheduledForDate = node.scheduledDate === date;

    // Task is a recurring occurrence on this date
    const isOccurrenceOnDate = isDateAnOccurrence(node, date);

    // Task has an active deadline covering this date (non-recurrent only)
    const hasActiveDeadline = !node.recurrence && node.deadline && !node.isCompleted && date <= node.deadline;

    // Task was completed on this date (only relevant for past/present)
    const wasCompletedOnDate = isPastOrPresent && (
      node.recurrence
        ? node.completedOccurrences?.includes(date)
        : (node.isCompleted && node.completionDate === date)
    );

    if (isScheduledForDate || isOccurrenceOnDate || wasCompletedOnDate || hasActiveDeadline || hasMatchingChildren) {
      return { ...node, children, originalChildrenCount };
    }
    return null;
  }).filter(Boolean);
};

export const filterTreeByProjectAndTags = (treeData, project, tags) => {
  if (!project && (!tags || tags.length === 0)) return treeData;

  const nodeMatches = (node) => {
    if (project && node.project !== project) return false;
    if (tags && tags.length > 0 && !tags.every(t => (node.tags || []).includes(t))) return false;
    return true;
  };

  const filterNode = (node) => {
    // If this node matches, include it with all its children intact
    if (nodeMatches(node)) return node;

    // Otherwise check if any descendant matches
    const filteredChildren = (node.children || [])
      .map(filterNode)
      .filter(Boolean);

    if (filteredChildren.length > 0) {
      return { ...node, children: filteredChildren };
    }

    return null;
  };

  return treeData.map(filterNode).filter(Boolean);
};

// --- Expression-based filter system ---

export const evaluateFilterExpression = (node, expression) => {
  if (!expression) return true;

  if (expression.type === 'condition') {
    if (expression.field === 'project') {
      return node.project === expression.value;
    }
    if (expression.field === 'tag') {
      return (node.tags || []).includes(expression.value);
    }
    return true;
  }

  if (expression.type === 'group') {
    if (!expression.children || expression.children.length === 0) return true;

    if (expression.operator === 'AND') {
      return expression.children.every(child => evaluateFilterExpression(node, child));
    }
    // OR
    return expression.children.some(child => evaluateFilterExpression(node, child));
  }

  return true;
};

export const filterTreeByExpression = (treeData, expression) => {
  if (!expression || (expression.type === 'group' && (!expression.children || expression.children.length === 0))) {
    return treeData;
  }

  const filterNode = (node) => {
    if (evaluateFilterExpression(node, expression)) return node;

    const filteredChildren = (node.children || [])
      .map(filterNode)
      .filter(Boolean);

    if (filteredChildren.length > 0) {
      return { ...node, children: filteredChildren };
    }

    return null;
  };

  return treeData.map(filterNode).filter(Boolean);
};

// Collect IDs of nodes that directly match the filter (not just included as ancestors)
export const collectFilterMatchIds = (treeData, expression) => {
  const matchIds = new Set();
  if (!expression || (expression.type === 'group' && (!expression.children || expression.children.length === 0))) {
    return matchIds;
  }

  const traverse = (nodes) => {
    for (const node of nodes) {
      if (evaluateFilterExpression(node, expression)) {
        matchIds.add(node.id);
      }
      if (node.children) traverse(node.children);
    }
  };
  traverse(treeData);
  return matchIds;
};

export const filterForTodayView = (nodes, today) => {
  return nodes.map(node => {
    const originalChildrenCount = node.children?.length || 0;
    const visibleChildren = node.children ? filterForTodayView(node.children, today) : [];

    const isCompletedForToday = node.recurrence
      ? node.completedOccurrences?.includes(today)
      : (node.isCompleted && node.completionDate === today);

    // Recurrent: show on occurrence dates
    const isOccurrenceToday = isDateAnOccurrence(node, today);
    // Scheduled (non-recurrent): show only on the exact scheduled date
    const isScheduledForToday = node.scheduledDate === today;
    // Deadline (non-recurrent): show every day until deadline, unless completed
    const hasActiveDeadline = !node.recurrence && node.deadline && !node.isCompleted && today <= node.deadline;
    // Unscheduled: tasks with no date info still show in today view
    const isUnscheduled = !node.scheduledDate && !node.recurrence && !node.deadline;
    const isRelevantToday = isScheduledForToday || isOccurrenceToday || hasActiveDeadline || isUnscheduled;

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
