import { useState, useEffect, useMemo } from 'react';
import { generateId } from '../utils/idGenerator';
import { getTodayDateString, isDateAnOccurrence, calculateNextOccurrence } from '../utils/dateUtils';
import { findParentNode, findNodeRecursive } from '../utils/treeUtils';
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
    return nodes.map(node => {
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
        if (selectedDate > getTodayDateString() && !newNode.scheduledDate) {
          newNode.scheduledDate = selectedDate;
        }
        return { ...node, isExpanded: true, children: [...node.children, newNode] };
      }
      if (node.children.length > 0) return { ...node, children: addNodeRecursive(node.children, parentId, selectedDate) };
      return node;
    });
  };

  const deleteNodeRecursive = (nodes, id) => {
    return nodes
      .filter(node => node.id !== id)
      .map(node => ({ ...node, children: deleteNodeRecursive(node.children, id) }));
  };

  const handleUpdate = (id, updates) => {
    let newUpdates = { ...updates };
    let shouldResetChildren = false;

    if (newUpdates.isCompleted === true) {
      newUpdates.completionDate = getTodayDateString();
      const task = findNodeRecursive(treeData, id);

      if (task?.recurrence) {
        const nextDate = calculateNextOccurrence(task, getTodayDateString());
        newUpdates = { ...newUpdates, isCompleted: false, scheduledDate: nextDate ? format(nextDate, 'yyyy-MM-dd') : null };
        
        if (task.children && task.children.length > 0) {
          shouldResetChildren = true;
        }
      }
    }

    setTreeData(prevData => {
      let updatedTree = updateNodeRecursive(prevData, id, newUpdates);

      if (shouldResetChildren) {
        const parentNode = findNodeRecursive(updatedTree, id);
        if (parentNode && parentNode.children) {
          for (const child of parentNode.children) {
            updatedTree = updateNodeRecursive(updatedTree, child.id, { isCompleted: false, completionDate: null });
          }
        }
      }

      if (newUpdates.isCompleted) {
        const parent = findParentNode(updatedTree, id);
        if (parent && !parent.isCompleted) {
          const updatedParent = findNodeRecursive(updatedTree, parent.id);
          const allChildrenCompleted = updatedParent.children.every(child => child.isCompleted);
          if (allChildrenCompleted) {
            updatedTree = updateNodeRecursive(updatedTree, parent.id, { isCompleted: true, completionDate: getTodayDateString(), isExpanded: false });
          }
        }
      }
      return updatedTree;
    });
  };

  const handleAddSubtask = (parentId, selectedDate) => {
    setTreeData(prev => {
      const treeWithNewNode = addNodeRecursive(prev, parentId, selectedDate);
      return updateNodeRecursive(treeWithNewNode, parentId, { isCompleted: false, completionDate: null });
    });
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

  return { 
    treeData, 
    handleUpdate, 
    handleAddSubtask, 
    handleDelete, 
    handleAddRoot,
    handleUpdateField,
    handleAddField,
  };
}
