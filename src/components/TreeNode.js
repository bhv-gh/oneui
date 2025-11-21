import React from 'react';
import TaskCard from './TaskCard';

// --- Component: Recursive Tree Node ---
const TreeNode = ({ node, onUpdate, onAdd, onRequestDelete, allFieldKeys, onStartFocus, focusedTaskId, isTimerActive, isSearching, highlightedTaskId, highlightedRef, treeData }) => {
  const hasChildren = node.children.length > 0;

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
      />
      
      {/* Children Container */}
      {node.isExpanded && hasChildren && (
        <div className="flex items-start pt-0 relative">
          {/* Horizontal Connector Line */}
          {node.children.length > 1 && (
            <div className="absolute top-0 left-0 right-0 h-px bg-slate-700 translate-y-0"></div>
          )}

          {node.children.map((child, index) => (
            <div key={child.id} className="flex flex-col items-center relative px-[2vw]">
              {/* 1. Vertical line going UP from child to the horizontal bar */}
              <div className="w-px h-8 bg-slate-700 mb-0"></div>
              
              {/* 2. Horizontal Connectors (The "Arms") */}
              {node.children.length > 1 && (
                <>
                  {/* Right arm (for all except last child) */}
                  {index !== node.children.length - 1 && (
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
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TreeNode;