import { useState, useEffect, useRef } from 'react';
import { generateId } from '../utils/idGenerator';
import { getTodayDateString } from '../utils/dateUtils';
import { findNodeRecursive, findNodePath } from '../utils/treeUtils';
import * as api from '../api/client';

const MIGRATED_FLAG = 'flowMigratedToSupabase';

export function useTreeData() {
  const [treeData, setTreeData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const saveTimerRef = useRef(null);
  const savedTimerRef = useRef(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    const init = async () => {
      try {
        const migrated = localStorage.getItem(MIGRATED_FLAG);

        if (!migrated) {
          // First time: migrate localStorage data to Supabase
          const localJSON = localStorage.getItem('taskTreeGraphDataV2');
          const localData = localJSON ? JSON.parse(localJSON) : [];

          if (localData.length > 0) {
            await api.putTree(localData);
            setTreeData(localData);
          }

          localStorage.setItem(MIGRATED_FLAG, 'true');
          localStorage.removeItem('taskTreeGraphDataV2');
        } else {
          // Already migrated: load from Supabase only
          const row = await api.getTree();
          if (row && Array.isArray(row.data)) {
            setTreeData(row.data);
          }
        }
      } catch (err) {
        console.error('Failed to init tree:', err);
        // Last resort fallback: try localStorage if it still exists
        try {
          const fallback = localStorage.getItem('taskTreeGraphDataV2');
          if (fallback) setTreeData(JSON.parse(fallback));
        } catch {}
      } finally {
        setIsLoading(false);
        isInitialLoad.current = false;
      }
    };
    init();
  }, []);

  // Debounced save to Supabase only (no localStorage)
  useEffect(() => {
    if (isInitialLoad.current) return;

    setSyncStatus('saving');
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      api.putTree(treeData)
        .then(() => {
          setSyncStatus('saved');
          savedTimerRef.current = setTimeout(() => setSyncStatus('idle'), 2000);
        })
        .catch(err => {
          console.error('Failed to save tree to Supabase:', err);
          setSyncStatus('error');
          savedTimerRef.current = setTimeout(() => setSyncStatus('idle'), 3000);
        });
    }, 1000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
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

    if (newUpdates.recurrence && !task.recurrence) {
      newUpdates.recurrenceStartDate = task.scheduledDate || forDate || getTodayDateString();
    }
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
      delete newUpdates.isCompleted;
      delete newUpdates.completionDate;

    } else {
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
    let newNodeId;
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
      text: '',
      isCompleted: false,
      isExpanded: true,
      fields: [],
      children: []
    };
    if (selectedDate > getTodayDateString()) {
      newRootTask.scheduledDate = selectedDate;
    }
    setTreeData(prev => [...prev, newRootTask]);
    return newRootTask.id;
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
    setTreeData,
    isLoading,
    syncStatus,
    handleUpdate,
    handleAddSubtask,
    handleDelete,
    handleAddRoot,
    handleUpdateField,
    handleAddField,
    expandBranch,
  };
}
