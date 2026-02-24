import { useState, useEffect, useRef, useCallback } from 'react';
import { generateId } from '../utils/idGenerator';
import { getTodayDateString } from '../utils/dateUtils';
import { findNodeRecursive, findNodePath, findParentNode, isDescendantOf } from '../utils/treeUtils';
import { saveCache, loadCache, markDirty, clearDirty, isDirty, setLastSyncedAt } from '../utils/offlineStorage';
import { mergeTrees } from '../utils/treeMerge';
import * as api from '../api/client';

const CACHE_KEY = 'tree';

export function useTreeData() {
  const [treeData, setTreeData] = useState(() => {
    const cached = loadCache(CACHE_KEY);
    return Array.isArray(cached) ? cached : [];
  });
  const [isLoading, setIsLoading] = useState(() => {
    // If we have cached data, skip loading state
    const cached = loadCache(CACHE_KEY);
    return !Array.isArray(cached) || cached.length === 0;
  });
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const saveTimerRef = useRef(null);
  const savedTimerRef = useRef(null);
  const isInitialLoad = useRef(true);

  // Persist to localStorage on every treeData change (except initial)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    saveCache(CACHE_KEY, treeData);
  }, [treeData]);

  useEffect(() => {
    let aborted = false;

    // Safety timeout — if Supabase doesn't respond in 5s, stop loading
    const timeout = setTimeout(() => {
      if (!aborted) {
        aborted = true;
        setIsLoading(false);
        isInitialLoad.current = false;
      }
    }, 5000);

    const init = async () => {
      try {
        if (isDirty(CACHE_KEY)) {
          // Local has unsynced changes — fetch remote, merge, push merged
          const cached = loadCache(CACHE_KEY);
          const localData = (cached && Array.isArray(cached)) ? cached : [];
          const row = await api.getTree();
          const remoteData = (row && Array.isArray(row.data)) ? row.data : [];
          const merged = mergeTrees(localData, remoteData);
          if (!aborted) {
            setTreeData(merged);
            saveCache(CACHE_KEY, merged);
          }
          await api.putTree(merged);
          clearDirty(CACHE_KEY);
          setLastSyncedAt(new Date().toISOString());
        } else {
          // Local is clean — prefer Supabase data
          const row = await api.getTree();
          if (!aborted && row && Array.isArray(row.data)) {
            setTreeData(row.data);
            saveCache(CACHE_KEY, row.data);
            setLastSyncedAt(new Date().toISOString());
          }
        }
      } catch (err) {
        console.error('Failed to init tree:', err);
        // Supabase unreachable — keep cached data (already loaded via useState initializer)
      } finally {
        clearTimeout(timeout);
        if (!aborted) {
          setIsLoading(false);
          isInitialLoad.current = false;
        }
      }
    };
    init();

    return () => { clearTimeout(timeout); };
  }, []);

  // Debounced save to Supabase
  useEffect(() => {
    if (isInitialLoad.current) return;

    setSyncStatus('saving');
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      api.putTree(treeData)
        .then(() => {
          clearDirty(CACHE_KEY);
          setLastSyncedAt(new Date().toISOString());
          setSyncStatus('saved');
          savedTimerRef.current = setTimeout(() => setSyncStatus('idle'), 2000);
        })
        .catch(err => {
          console.error('Failed to save tree to Supabase:', err);
          markDirty(CACHE_KEY);
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

  const addNodeRecursive = (nodes, parentId, selectedDate, newNodeId) => {
    let found = false;
    const newNodes = nodes.map(node => {
      if (node.id === parentId) {
        found = true;
        const newNode = {
          id: newNodeId,
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
      if (node.children.length > 0) {
        const result = addNodeRecursive(node.children, parentId, selectedDate, newNodeId);
        if (result.found) {
          found = true;
        }
        return { ...node, children: result.nodes };
      }
      return node;
    });
    return { nodes: newNodes, found };
  };

  const deleteNodeRecursive = (nodes, id) => {
    return nodes
      .filter(node => node.id !== id)
      .map(node => ({ ...node, children: deleteNodeRecursive(node.children, id) }));
  };

  const handleUpdate = (id, updates, forDate) => {
    let newUpdates = { ...updates };

    const task = findNodeRecursive(treeData, id);

    // Recurrence/completion logic requires the task snapshot —
    // only run when the task is found in the current render's state.
    // (The task may exist in pending state from a queued setTreeData.)
    if (task) {
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
    }

    setTreeData(prevData => {
      return updateNodeRecursive(prevData, id, newUpdates);
    });
  };

  const handleAddSubtask = (parentId, selectedDate) => {
    const newNodeId = generateId();
    setTreeData(prev => {
      const result = addNodeRecursive(prev, parentId, selectedDate, newNodeId);
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

  // Bulk-add an entire tree of tasks in a single state update (used by Ramble)
  const handleAddTree = (rootTasks, selectedDate) => {
    const today = getTodayDateString();
    const isFuture = selectedDate > today;

    const buildNodes = (items) => items.map(task => ({
      id: generateId(),
      text: task.text || '',
      isCompleted: false,
      isExpanded: true,
      fields: [],
      children: task.children?.length > 0 ? buildNodes(task.children) : [],
      ...(isFuture ? { scheduledDate: selectedDate } : {}),
      ...(task.project ? { project: task.project } : {}),
      ...(task.tags?.length > 0 ? { tags: task.tags } : {}),
    }));

    const newNodes = buildNodes(rootTasks);
    setTreeData(prev => [...prev, ...newNodes]);
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

  const handleMoveNode = (nodeId, newParentId) => {
    setTreeData(prev => {
      // No-op: can't move to self
      if (newParentId === nodeId) return prev;

      const node = findNodeRecursive(prev, nodeId);
      if (!node) return prev;

      // No-op: circular move (can't drop parent onto its own descendant)
      if (newParentId !== null && isDescendantOf(prev, nodeId, newParentId)) return prev;

      // No-op: already at target position
      if (newParentId === null) {
        // Check if already a root node
        if (prev.some(n => n.id === nodeId)) return prev;
      } else {
        const targetParent = findNodeRecursive(prev, newParentId);
        if (targetParent && targetParent.children.some(c => c.id === nodeId)) return prev;
      }

      // Remove node from old position
      const treeWithout = deleteNodeRecursive(prev, nodeId);

      // Insert as last child of new parent (or at root level)
      if (newParentId === null) {
        return [...treeWithout, node];
      } else {
        const insertIntoParent = (nodes) => nodes.map(n => {
          if (n.id === newParentId) {
            return { ...n, isExpanded: true, children: [...n.children, node] };
          }
          if (n.children.length > 0) {
            return { ...n, children: insertIntoParent(n.children) };
          }
          return n;
        });
        return insertIntoParent(treeWithout);
      }
    });
  };

  const treeDataRef = useRef(treeData);
  treeDataRef.current = treeData;

  const forceSync = useCallback(async () => {
    setSyncStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    try {
      // Fetch remote and merge with local
      const row = await api.getTree();
      const remoteData = (row && Array.isArray(row.data)) ? row.data : [];
      const merged = mergeTrees(treeDataRef.current, remoteData);

      // Push merged result
      await api.putTree(merged);

      isInitialLoad.current = true;
      setTreeData(merged);
      saveCache(CACHE_KEY, merged);
      clearDirty(CACHE_KEY);
      setLastSyncedAt(new Date().toISOString());
      // Allow the state to settle before re-enabling saves
      setTimeout(() => { isInitialLoad.current = false; }, 50);

      setSyncStatus('saved');
      savedTimerRef.current = setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (err) {
      console.error('Force sync failed:', err);
      markDirty(CACHE_KEY);
      setSyncStatus('error');
      savedTimerRef.current = setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }, []);

  // Allow escaping the loading state when Supabase is unreachable but cache exists
  const skipLoading = useCallback(() => {
    setIsLoading(false);
    isInitialLoad.current = false;
  }, []);

  return {
    treeData,
    setTreeData,
    isLoading,
    skipLoading,
    syncStatus,
    forceSync,
    handleUpdate,
    handleAddSubtask,
    handleDelete,
    handleAddRoot,
    handleAddTree,
    handleUpdateField,
    handleAddField,
    handleMoveNode,
    expandBranch,
  };
}
