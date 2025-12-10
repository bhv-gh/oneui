import { useState, useEffect, useMemo } from 'react';
import { generateId } from '../utils/idGenerator';
import { getTodayDateString, isDateAnOccurrence, calculateNextOccurrence } from '../utils/dateUtils';
import { findParentNode, findNodeRecursive, findNodePath } from '../utils/treeUtils';
import { format } from 'date-fns';

const initialData = [
  {
    id: 'root-welcome',
    text: 'Welcome to Flow!',
    isCompleted: false,
    isExpanded: true,
    fields: [],
    children: [
      {
        id: 'sub-1',
        text: 'Click on me to edit',
        isCompleted: false,
        isExpanded: false,
        children: []
      },
    ]
  }
];

export function useTreeData() {
  const [treeData, setTreeData] = useState(() => {
    try {
      const savedJSON = localStorage.getItem('taskTreeGraphDataV2');
      if (!savedJSON) {
        return initialData;
      }

      const savedData = JSON.parse(savedJSON);
      const savedRootIds = new Set(savedData.map(node => node.id));
      const newNodesToAdd = initialData.filter(node => !savedRootIds.has(node.id));

      return [...savedData, ...newNodesToAdd];
    } catch (e) {
      console.error("Failed to load or merge data from localStorage:", e);
      return initialData;
    }
  });

  useEffect(() => {
    localStorage.setItem('taskTreeGraphDataV2', JSON.stringify(treeData));
  }, [treeData]);

  const updateNodeRecursive = (nodes, id, updates) => {
    return nodes.map(node => {
      if (node.id === id) return { ...node, ...updates };
      if (node.children.length > 0) return { ...node, children: updateNodeRecursive(node.children, id, updates) };
      return node;
    });
  };

  const addNodeRecursive = (nodes, parentId, selectedDate) => {
    let newNodeId = null;
    const newNodes = nodes.map(node => {
      if (node.id === parentId) {
        const newNode = {
          id: generateId(),
          text: '',
          isCompleted: false,
          isExpanded: true,
          fields: [],
          children: [],
          scheduledDate: node.scheduledDate || null
        };
        newNodeId = newNode.id;
        if (selectedDate > getTodayDateString() && !newNode.scheduledDate) {
          newNode.scheduledDate = selectedDate;
        }
        return { ...node, isExpanded: true, children: [...node.children, newNode] };
      }
      if (node.children.length > 0) {
        const result = addNodeRecursive(node.children, parentId, selectedDate);
        if (result.newNodeId) {
          newNodeId = result.newNodeId;
        }
        return { ...node, children: result.nodes };
      }
      return node;
    });
    return { nodes: newNodes, newNodeId };
  };

  const deleteNodeRecursive = (nodes, id) => {
    return nodes
      .filter(node => node.id !== id)
      .map(node => ({ ...node, children: deleteNodeRecursive(node.children, id) }));
  };

  const handleUpdate = (id, updates, forDate) => {
    let newUpdates = { ...updates };

    const task = findNodeRecursive(treeData, id);
    if (!task) return;

    // If recurrence is being set for the first time, establish a stable start date.
    if (newUpdates.recurrence && !task.recurrence) {
      newUpdates.recurrenceStartDate = task.scheduledDate || forDate || getTodayDateString();
    }
    // If recurrence is being removed, also remove the start date.
    if (newUpdates.recurrence === null) {
      newUpdates.recurrenceStartDate = null;
    }

    if (task.recurrence) {
      const completed = new Set(task.completedOccurrences || []);
      if (newUpdates.isCompleted === true) {
        completed.add(forDate);
      } else if (newUpdates.isCompleted === false) {
        completed.delete(forDate);
      }
      newUpdates.completedOccurrences = Array.from(completed);
      delete newUpdates.isCompleted; // Not used for recurring tasks
      delete newUpdates.completionDate; // Not used for recurring tasks
    
    } else {
      // Non-recurring task logic
      if (newUpdates.isCompleted === true) {
        newUpdates.completionDate = forDate;
      } else if (newUpdates.isCompleted === false) {
        newUpdates.completionDate = null;
      }
    }

    setTreeData(prevData => {
      return updateNodeRecursive(prevData, id, newUpdates);
    });
  };

  const handleAddSubtask = (parentId, selectedDate) => {
    let newNodeId = null;
    setTreeData(prev => {
      const result = addNodeRecursive(prev, parentId, selectedDate);
      newNodeId = result.newNodeId;
      const treeWithNewNode = result.nodes;
      return updateNodeRecursive(treeWithNewNode, parentId, { isCompleted: false, completionDate: null });
    });
    return newNodeId;
  };

  const handleDelete = (id) => {
    setTreeData(prev => deleteNodeRecursive(prev, id));
  };
  
  const handleAddRoot = (selectedDate) => {
    const newRootTask = {
      id: generateId(),
      text: 'New Project',
      isCompleted: false,
      isExpanded: true,
      fields: [],
      children: []
    };
    if (selectedDate > getTodayDateString()) {
      newRootTask.scheduledDate = selectedDate;
    }
    setTreeData(prev => [...prev, newRootTask]);
  };
  
  const handleUpdateField = (nodeId, fieldId, key, newValue) => {
    setTreeData(prevTreeData => {
      const targetNode = findNodeRecursive(prevTreeData, nodeId);
      if (!targetNode) return prevTreeData;
      const updatedFields = (targetNode.fields || []).map(f => f.id === fieldId ? { ...f, [key]: newValue } : f);
      return updateNodeRecursive(prevTreeData, nodeId, { fields: updatedFields });
    });
  };

  const handleAddField = (nodeId, newFieldData) => {
    setTreeData(prevTreeData => {
      const newField = { id: generateId(), ...newFieldData };
      const targetNode = findNodeRecursive(prevTreeData, nodeId);
      if (!targetNode) return prevTreeData;
      const updatedFields = [...(targetNode.fields || []), newField];
      return updateNodeRecursive(prevTreeData, nodeId, { fields: updatedFields });
    });
  };

  const expandBranch = (nodeId) => {
    setTreeData(prevData => {
      const path = findNodePath(prevData, nodeId);
      if (path.length > 0) {
        let updatedTree = prevData;
        for (const node of path) {
          if (!node.isExpanded) {
            updatedTree = updateNodeRecursive(updatedTree, node.id, { isExpanded: true });
          }
        }
        return updatedTree;
      }
      return prevData;
    });
  };

  return { 
    treeData, 
    handleUpdate, 
    handleAddSubtask, 
    handleDelete, 
    handleAddRoot,
    handleUpdateField,
    handleAddField,
    expandBranch,
  };
}

