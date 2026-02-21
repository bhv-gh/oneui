import React, { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import TaskListItem from './TaskListItem';

const getTodayDateString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
};

// --- Component: List View ---
const ListView = ({ tasks, onUpdate, onStartFocus, onAdd, onRequestDelete, onAddRoot, selectedDate, newlyAddedTaskId, onFocusHandled, onOpenNotes, activeDragId }) => {
  const flattenedTasks = useMemo(() => {
    const flatten = (nodes, path = [], parentHideCompleted = false) => {
      let list = [];
      for (const node of nodes) {
        const nodeIsCompleted = node.recurrence
          ? node.completedOccurrences?.includes(selectedDate)
          : node.isCompleted;
        // Skip completed nodes if the parent has hideCompleted set
        if (parentHideCompleted && nodeIsCompleted) continue;

        list.push({ task: node, path });
        if (node.children) {
          list = list.concat(flatten(node.children, [...path, node.text || "Untitled"], node.hideCompleted));
        }
      }
      return list;
    };
    return flatten(tasks);
  }, [tasks, selectedDate]);

  const { setNodeRef: setRootDropRef, isOver: isRootOver } = useDroppable({ id: '__root__' });

  if (flattenedTasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        {selectedDate < getTodayDateString() ? (
          <div className="text-content-disabled">No tasks were completed on this day.</div>
        ) : (
          <button
            onClick={onAddRoot}
            className="w-64 h-24 rounded-2xl border-2 border-dashed border-edge-secondary flex items-center justify-center text-content-disabled hover:text-accent hover:border-edge-focus hover:bg-accent-subtler transition-all"
          >
            <div className="flex flex-col items-center gap-2">
              <Plus size={24} />
              <span className="font-medium">Add a Task</span>
            </div>
          </button>
        )}
      </div>
    );
  }

  return (
    <div data-list-view-container className="flex-1 overflow-y-auto p-8 animate-in fade-in duration-300">
      <div className="max-w-4xl mx-auto space-y-1">
        {flattenedTasks.map(({ task, path }) => (
          <TaskListItem
            key={task.id}
            task={task}
            path={path}
            onUpdate={onUpdate}
            onStartFocus={onStartFocus}
            onAdd={onAdd}
            onRequestDelete={onRequestDelete}
            selectedDate={selectedDate}
            newlyAddedTaskId={newlyAddedTaskId}
            onFocusHandled={onFocusHandled}
            onOpenNotes={onOpenNotes}
            activeDragId={activeDragId}
          />
        ))}
        {selectedDate >= getTodayDateString() && (
          <button onClick={onAddRoot} className="w-full mt-4 py-3 text-sm text-content-muted hover:text-accent border border-dashed border-edge-secondary hover:border-edge-focus rounded-lg flex items-center justify-center gap-2 transition-colors">
            <Plus size={16} />
            <span>Add New Task</span>
          </button>
        )}
        {activeDragId && (
          <div
            ref={setRootDropRef}
            className={`w-full mt-2 py-4 text-sm text-center rounded-lg border-2 border-dashed transition-all ${
              isRootOver
                ? 'border-accent-secondary bg-accent-secondary-subtle text-accent-secondary'
                : 'border-edge-primary text-content-muted'
            }`}
          >
            Drop here for root level
          </div>
        )}
      </div>
    </div>
  );
};

export default ListView;
