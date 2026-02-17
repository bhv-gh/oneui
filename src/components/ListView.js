import React, { useMemo } from 'react';
import { Plus } from 'lucide-react';
import TaskListItem from './TaskListItem';

const getTodayDateString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
};

// --- Component: List View ---
const ListView = ({ tasks, onUpdate, onStartFocus, onAdd, onRequestDelete, onAddRoot, selectedDate, newlyAddedTaskId, onFocusHandled }) => {
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

  if (flattenedTasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        {selectedDate < getTodayDateString() ? (
          <div className="text-slate-600">No tasks were completed on this day.</div>
        ) : (
          <button 
            onClick={onAddRoot}
            className="w-64 h-24 rounded-2xl border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-600 hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
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
          />
        ))}
        {selectedDate >= getTodayDateString() && (
          <button onClick={onAddRoot} className="w-full mt-4 py-3 text-sm text-slate-500 hover:text-emerald-400 border border-dashed border-slate-800 hover:border-emerald-500/30 rounded-lg flex items-center justify-center gap-2 transition-colors">
            <Plus size={16} />
            <span>Add New Task</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ListView;