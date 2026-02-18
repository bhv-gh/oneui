import React from 'react';
import TaskCard from './TaskCard';

// --- Component: Recursive Tree Node ---
const TreeNode = ({ node, onUpdate, onAdd, onRequestDelete, allFieldKeys, onStartFocus, focusedTaskId, isTimerActive, isSearching, highlightedTaskId, highlightedRef, treeData, selectedDate, newlyAddedTaskId, onFocusHandled, onOpenNotes }) => {
  const visibleChildren = node.hideCompleted
    ? node.children.filter(child => {
        if (child.recurrence) {
          return !child.completedOccurrences?.includes(selectedDate);
        }
        return !child.isCompleted;
      })
    : node.children;
  const hasChildren = visibleChildren.length > 0;

  return (
    <div className="flex flex-col items-center">
      <TaskCard
        node={node}
        onUpdate={onUpdate}
        onAdd={onAdd}
        onRequestDelete={onRequestDelete}
        allFieldKeys={allFieldKeys}
        onStartFocus={onStartFocus}
        focusedTaskId={focusedTaskId}
        isTimerActive={isTimerActive}
        isSearching={isSearching}
        isHighlighted={node.id === highlightedTaskId}
        highlightedRef={highlightedRef}
        treeData={treeData} // Pass down the full tree data
        selectedDate={selectedDate}
        newlyAddedTaskId={newlyAddedTaskId}
        onFocusHandled={onFocusHandled}
        onOpenNotes={onOpenNotes}
      />
      
      {/* Children Container */}
      {node.isExpanded && hasChildren && (
        <div className="flex items-start pt-0 relative">
          {/* Horizontal Connector Line */}
          {visibleChildren.length > 1 && (
            <div className="absolute top-0 left-0 right-0 h-px bg-slate-700 translate-y-0"></div>
          )}

          {visibleChildren.map((child, index) => (
            <div key={child.id} className="flex flex-col items-center relative px-[2vw]">
              {/* 1. Vertical line going UP from child to the horizontal bar */}
              <div className="w-px h-8 bg-slate-700 mb-0"></div>

              {/* 2. Horizontal Connectors (The "Arms") */}
              {visibleChildren.length > 1 && (
                <>
                  {/* Right arm (for all except last child) */}
                  {index !== visibleChildren.length - 1 && (
                    <div className="absolute top-0 right-0 w-1/2 h-px bg-slate-700"></div>
                  )}
                  {/* Left arm (for all except first child) */}
                  {index !== 0 && (
                    <div className="absolute top-0 left-0 w-1/2 h-px bg-slate-700"></div>
                  )}
                </>
              )}

              <TreeNode
                node={child}
                onUpdate={onUpdate}
                onAdd={onAdd}
                onRequestDelete={onRequestDelete}
                allFieldKeys={allFieldKeys}
                onStartFocus={onStartFocus}
                focusedTaskId={focusedTaskId}
                isTimerActive={isTimerActive}
                isSearching={isSearching}
                highlightedTaskId={highlightedTaskId}
                highlightedRef={highlightedRef}
                treeData={treeData} // And pass it down recursively
                selectedDate={selectedDate}
                newlyAddedTaskId={newlyAddedTaskId}
                onFocusHandled={onFocusHandled}
                onOpenNotes={onOpenNotes}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TreeNode;