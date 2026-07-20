import React, { useState, useEffect, useRef } from 'react';
import TaskCard from './TaskCard';
import { getPriorityColor } from '../utils/priorityUtils';

const TreeNode = ({ node, onUpdate, onAdd, onRequestDelete, allFieldKeys, onStartFocus, focusedTaskId, isTimerActive, isSearching, highlightedTaskId, highlightedRef, treeData, selectedDate, newlyAddedTaskId, onFocusHandled, onOpenNotes, activeDragId, filterMatchIds, depth = 0 }) => {
  const hideCompleted = node.hideCompleted !== false;
  const graceIdsRef = useRef(new Set());
  const prevStatesRef = useRef(null);
  const timersRef = useRef({});
  const [, forceUpdate] = useState(0);

  // Build current completion states
  const curStates = {};
  node.children.forEach(child => {
    curStates[child.id] = child.recurrence
      ? !!child.completedOccurrences?.includes(selectedDate)
      : !!child.isCompleted;
  });

  // Detect newly completed children and add to grace set (synchronous, during render)
  if (hideCompleted && prevStatesRef.current !== null) {
    node.children.forEach(child => {
      if (curStates[child.id] && !prevStatesRef.current[child.id]) {
        graceIdsRef.current.add(child.id);
        clearTimeout(timersRef.current[child.id]);
        timersRef.current[child.id] = setTimeout(() => {
          graceIdsRef.current.delete(child.id);
          forceUpdate(n => n + 1);
        }, 1500);
      }
    });
  }
  if (!hideCompleted) {
    graceIdsRef.current.clear();
    Object.values(timersRef.current).forEach(clearTimeout);
    timersRef.current = {};
  }
  prevStatesRef.current = curStates;

  useEffect(() => {
    return () => Object.values(timersRef.current).forEach(clearTimeout);
  }, []);

  const visibleChildren = hideCompleted
    ? node.children.filter(child => {
        if (graceIdsRef.current.has(child.id)) return true;
        if (child.recurrence) {
          return !child.completedOccurrences?.includes(selectedDate);
        }
        return !child.isCompleted;
      })
    : node.children;
  const hasChildren = visibleChildren.length > 0;
  const isFilterMatch = filterMatchIds ? filterMatchIds.has(node.id) : null;

  return (
    <div className={`cursor-default ${depth === 0 ? 'w-80 flex-shrink-0' : 'w-full'}`}>
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
        treeData={treeData}
        selectedDate={selectedDate}
        newlyAddedTaskId={newlyAddedTaskId}
        onFocusHandled={onFocusHandled}
        onOpenNotes={onOpenNotes}
        activeDragId={activeDragId}
        isFilterMatch={isFilterMatch}
      />

      {node.isExpanded && hasChildren && (() => {
        const isLightTheme = document.documentElement.getAttribute('data-theme') === 'personal';
        const connectorColor = getPriorityColor(node.priority || 'none', isLightTheme);
        return (
        <div className="relative ml-4 mt-2">
          {/* Vertical connector line spanning all children */}
          <div className="absolute left-0 top-0 bottom-2 w-px" style={{ backgroundColor: connectorColor.border }} />

          <div className="space-y-2">
            {visibleChildren.map((child) => (
              <div key={child.id} className="relative pl-5">
                {/* Horizontal branch connector */}
                <div className="absolute left-0 top-[22px] w-5 h-px" style={{ backgroundColor: connectorColor.border }} />
                {/* Dot at the junction */}
                <div className="absolute left-[-2px] top-[20px] w-[5px] h-[5px] rounded-full" style={{ backgroundColor: connectorColor.dot }} />

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
                  treeData={treeData}
                  selectedDate={selectedDate}
                  newlyAddedTaskId={newlyAddedTaskId}
                  onFocusHandled={onFocusHandled}
                  onOpenNotes={onOpenNotes}
                  activeDragId={activeDragId}
                  filterMatchIds={filterMatchIds}
                  depth={depth + 1}
                />
              </div>
            ))}
          </div>
        </div>
        );
      })()}
    </div>
  );
};

export default TreeNode;
