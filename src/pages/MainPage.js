import React, { useState, useEffect, useRef, useMemo, useContext, useCallback } from 'react';
import gsap from 'gsap';
import {
    Plus,
    CalendarDays,
    Settings2,
    GitMerge,
    LayoutGrid,
    GanttChart,
    Mic,
    RefreshCw,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, pointerWithin } from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';

import TreeDataContext from '../contexts/TreeDataContext';
import LogsContext from '../contexts/LogsContext';
import MemoryContext from '../contexts/MemoryContext';
import OnlineContext from '../contexts/OnlineContext';

import CustomDatePicker from '../components/CustomDatePicker';
import SearchOverlay from '../components/SearchOverlay';
import SuggestionBar from '../components/SuggestionBar';
import TreeNode from '../components/TreeNode';
import ListView from '../components/ListView';
import TimelineView from '../components/TimelineView';
import MemoryView from '../components/MemoryView';
import LogsView from '../components/LogsView';
import SettingsModal from '../components/SettingsModal';
import DeleteModal from '../components/DeleteModal';
import MemorySearchBar from '../components/MemorySearchBar';
import CollapsiblePanels from '../components/CollapsiblePanels';
import ChangeView from '../components/ChangeView';
import TaskNotesPanel from '../components/TaskNotesPanel';
import RambleModal, { isSpeechSupported } from '../components/RambleModal';
import QuickAddModal from '../components/QuickAddModal';
import FilterSidebar from '../components/FilterSidebar';
import PlacementPanel from '../components/PlacementPanel';

import { getTodayDateString, isDateAnOccurrence } from '../utils/dateUtils';
import { filterTreeByDate, filterForTodayView, filterTreeByExpression, collectFilterMatchIds } from '../utils/treeFilters';
import { migrateLegacyFilter } from '../components/FilterSidebar';
import { findNodeRecursive } from '../utils/treeUtils';
import RadialMenu from '../components/RadialMenu';
import ChangeJournalContext from '../contexts/ChangeJournalContext';
import * as api from '../api/client';
import Fuse from 'fuse.js';

// Small droppable wrapper for root drop zone in tree view
function RootDropZoneButton({ onClick, activeDragId }) {
    const { setNodeRef, isOver } = useDroppable({ id: '__root__' });
    const isDropTarget = isOver && activeDragId;
    return (
        <button
            ref={setNodeRef}
            onClick={onClick}
            className={`min-w-80 w-80 flex-shrink-0 h-20 rounded-2xl border-2 border-dashed flex items-center justify-center transition-all ${
                isDropTarget
                    ? 'border-accent-secondary bg-accent-subtle text-accent-secondary shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                    : 'border-edge-secondary text-content-disabled hover:text-accent hover:border-accent-bold hover:bg-accent-subtle'
            }`}
        >
            <div className="flex flex-col items-center gap-2">
                <Plus size={20} />
                <span className="text-sm font-medium">{isDropTarget ? 'Drop as Root' : 'New Root'}</span>
            </div>
        </button>
    );
}
export default function MainPage({
    focusedTask,
    handleStartFocus,
    appState,
    handleExport,
    handleImport,
    onLogout,
}) {
    const {
        treeData,
        handleUpdate,
        handleAddSubtask,
        handleDelete,
        handleAddRoot,
        handleAddTree,
        handleMoveNode,
        expandBranch,
        syncStatus,
        forceSync: forceSyncTree,
    } = useContext(TreeDataContext);
    const { logs, handleSaveLog, handleDeleteLog, handleUpdateLogTime, forceSync: forceSyncLogs } = useContext(LogsContext);
    const { memoryData, setMemoryData, forceSync: forceSyncMemory } = useContext(MemoryContext);
    const { journal: changeJournal, updateJournal: updateChangeJournal, forceSync: forceSyncChange } = useContext(ChangeJournalContext);
    const { isOnline, checkReachability } = useContext(OnlineContext);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [simulatedToday, setSimulatedToday] = useState(getTodayDateString);
    const [selectedDate, setSelectedDate] = useState(simulatedToday);
    const [activeTab, setActiveTab] = useState('today');
    const [viewMode, setViewMode] = useState(() => {
        return localStorage.getItem('flowAppViewMode') || 'tree';
    });

    useEffect(() => {
        localStorage.setItem('flowAppViewMode', viewMode);
        api.updateSettings({ viewMode }).catch(() => {});
    }, [viewMode]);
    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const [newlyAddedTaskId, setNewlyAddedTaskId] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isRambleOpen, setIsRambleOpen] = useState(false);
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [manualLogModal, setManualLogModal] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [highlightedTaskId, setHighlightedTaskId] = useState(null);
    const [searchIndex, setSearchIndex] = useState(0);
    const [isTimelineInteracting, setIsTimelineInteracting] = useState(false);
    const [notesTaskId, setNotesTaskId] = useState(null);
    const [activeDragId, setActiveDragId] = useState(null);
    const [pendingPlacement, setPendingPlacement] = useState([]);
    const [placementHighlightId, setPlacementHighlightId] = useState(null);
    const [radialMenu, setRadialMenu] = useState(null);
    const [activeFilter, setActiveFilter] = useState({ id: 'root', type: 'group', operator: 'AND', children: [] });
    const [savedFilters, setSavedFilters] = useState(() => {
        try {
            // Load from localStorage as fallback until DB loads
            const raw = JSON.parse(localStorage.getItem('flowAppSavedFilters') || '[]');
            return raw.map(f => {
                if (!f.expression && (f.project || (f.tags && f.tags.length > 0))) {
                    return { ...f, expression: migrateLegacyFilter(f) };
                }
                return f;
            });
        } catch { return []; }
    });

    // Load saved filters from DB on mount
    useEffect(() => {
        api.getSavedFilters().then(filters => {
            if (filters && filters.length > 0) {
                setSavedFilters(filters);
                localStorage.setItem('flowAppSavedFilters', JSON.stringify(filters));
            }
        }).catch(console.error);
    }, []);
    const highlightedNodeRef = useRef(null);
    const datePickerRef = useRef(null);
    const contentRef = useRef(null);
    const canvasRef = useRef(null);
    const highlightTimeoutRef = useRef(null);
    const lastTodayRef = useRef(getTodayDateString());
    const tabContentRef = useRef(null);

    // Canvas pan (click-drag) + zoom (Ctrl/Cmd + wheel) state
    const [zoom, setZoom] = useState(1);
    const zoomRef = useRef(1);
    const isPanningRef = useRef(false);
    const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

    // Start panning: left-drag on empty canvas background, or middle-mouse anywhere.
    const handleCanvasMouseDown = useCallback((e) => {
        const isBackground = e.target === canvasRef.current || e.target === contentRef.current;
        const isMiddle = e.button === 1;
        if (!(isMiddle || (e.button === 0 && isBackground))) return;
        if (isMiddle) e.preventDefault();
        isPanningRef.current = true;
        panStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            scrollLeft: canvasRef.current.scrollLeft,
            scrollTop: canvasRef.current.scrollTop,
        };
        // Force the grabbing cursor everywhere only while actively dragging.
        document.body.classList.add('user-select-none', 'canvas-panning');
    }, []);

    const resetZoom = useCallback(() => {
        zoomRef.current = 1;
        setZoom(1);
    }, []);

    // DnD sensors and handlers
    const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } });
    const dndSensors = useSensors(pointerSensor);

    const handleDragStart = useCallback((event) => {
        setActiveDragId(event.active.id);
    }, []);

    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            handleMoveNode(active.id, over.id === '__root__' ? null : over.id);
        }
        setActiveDragId(null);
    }, [handleMoveNode]);

    const handleDragCancel = useCallback(() => {
        setActiveDragId(null);
    }, []);

    // Drag-to-pan: update scroll offset while dragging, end on mouse up (listeners on window
    // so a drag that leaves the canvas still tracks / releases correctly).
    useEffect(() => {
        const handleMove = (e) => {
            if (!isPanningRef.current || !canvasRef.current) return;
            const dx = e.clientX - panStartRef.current.x;
            const dy = e.clientY - panStartRef.current.y;
            canvasRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
            canvasRef.current.scrollTop = panStartRef.current.scrollTop - dy;
        };
        const handleUp = () => {
            if (!isPanningRef.current) return;
            isPanningRef.current = false;
            document.body.classList.remove('user-select-none', 'canvas-panning');
        };
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };
    }, []);

    // Zoom with Ctrl/Cmd + wheel, anchored to the cursor. Uses a non-passive native listener
    // so we can preventDefault (which stops the browser's own page zoom).
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const handleWheel = (e) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const cursorX = e.clientX - rect.left;
            const cursorY = e.clientY - rect.top;
            const prevZoom = zoomRef.current;
            const delta = -e.deltaY * 0.0015;
            const newZoom = Math.min(2.5, Math.max(0.3, prevZoom * (1 + delta)));
            if (newZoom === prevZoom) return;
            const ratio = newZoom / prevZoom;
            // Keep the point under the cursor fixed while scaling.
            canvas.scrollLeft = (cursorX + canvas.scrollLeft) * ratio - cursorX;
            canvas.scrollTop = (cursorY + canvas.scrollTop) * ratio - cursorY;
            zoomRef.current = newZoom;
            setZoom(newZoom);
        };
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', handleWheel);
    }, [activeTab, viewMode]);

    // Reset zoom with Ctrl/Cmd + 0.
    useEffect(() => {
        const handleResetKey = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === '0') {
                e.preventDefault();
                resetZoom();
            }
        };
        window.addEventListener('keydown', handleResetKey);
        return () => window.removeEventListener('keydown', handleResetKey);
    }, [resetZoom]);

    useEffect(() => {
        const checkForDayChange = () => {
            const currentToday = getTodayDateString();
            if (currentToday !== lastTodayRef.current) {
                if (selectedDate === lastTodayRef.current) {
                    setSelectedDate(currentToday);
                }
                if (simulatedToday === lastTodayRef.current) {
                    setSimulatedToday(currentToday);
                }
                lastTodayRef.current = currentToday;
            }
        };

        window.addEventListener('focus', checkForDayChange);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') checkForDayChange();
        });
        const interval = setInterval(checkForDayChange, 60000);

        return () => {
            window.removeEventListener('focus', checkForDayChange);
            document.removeEventListener('visibilitychange', checkForDayChange);
            clearInterval(interval);
        };
    }, [selectedDate, simulatedToday]);

    const handleAddTaskAndFocus = (addFn) => {
        const newId = addFn();
        if (newId) {
            setNewlyAddedTaskId(newId);
        }
    };

    const handleOpenNotes = useCallback((taskId) => {
        setNotesTaskId(taskId);
    }, []);

    const handleCloseNotes = useCallback(() => {
        setNotesTaskId(null);
    }, []);

    const handleRambleAdd = useCallback((tasks) => {
        const flat = [];
        const flatten = (items) => {
            items.forEach(t => {
                flat.push({ text: t.text, project: t.project, tags: t.tags });
                if (t.children?.length > 0) flatten(t.children);
            });
        };
        flatten(tasks);
        if (flat.length > 0) {
            setPendingPlacement(flat);
            setActiveTab('today');
            setViewMode('tree');
        }
    }, []);

    const handlePlaceTask = useCallback((task, parentId) => {
        const newId = handleAddSubtask(parentId, selectedDate);
        const updates = { text: task.text };
        if (task.project) updates.project = task.project;
        if (task.tags?.length > 0) updates.tags = task.tags;
        handleUpdate(newId, updates, selectedDate);
        expandBranch(parentId);
    }, [handleAddSubtask, handleUpdate, selectedDate, expandBranch]);

    const handlePlaceAsRoot = useCallback((task) => {
        const newId = handleAddRoot(selectedDate);
        const updates = { text: task.text };
        if (task.project) updates.project = task.project;
        if (task.tags?.length > 0) updates.tags = task.tags;
        handleUpdate(newId, updates, selectedDate);
    }, [handleAddRoot, handleUpdate, selectedDate]);

    const handlePlacementDismiss = useCallback(() => {
        setPendingPlacement([]);
        setPlacementHighlightId(null);
    }, []);

    const handlePlacementHighlight = useCallback((nodeId) => {
        setPlacementHighlightId(nodeId);
        if (nodeId) expandBranch(nodeId);
    }, [expandBranch]);

    const handleSync = useCallback(async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        try {
            await Promise.all([forceSyncTree(), forceSyncLogs(), forceSyncMemory(), forceSyncChange()]);
        } finally {
            setIsSyncing(false);
        }
    }, [isSyncing, forceSyncTree, forceSyncLogs, forceSyncMemory, forceSyncChange]);

    // Radial menu — right-click on task cards
    useEffect(() => {
        const handleContextMenu = (e) => {
            const card = e.target.closest('[data-task-id]');
            if (!card) return;
            e.preventDefault();
            const taskId = card.getAttribute('data-task-id');
            setRadialMenu({ x: e.clientX, y: e.clientY, taskId });
        };
        document.addEventListener('contextmenu', handleContextMenu);
        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, []);

    const handleRadialAction = useCallback((action, value) => {
        if (!radialMenu) return;
        const { taskId } = radialMenu;
        if (action === 'priority') {
            handleUpdate(taskId, { priority: value }, selectedDate);
        } else if (action === 'schedule') {
            handleUpdate(taskId, { scheduledDate: value }, selectedDate);
        } else if (action === 'deadline') {
            handleUpdate(taskId, { deadline: value }, selectedDate);
        } else if (action === 'focus') {
            handleStartFocus(taskId);
        } else if (action === 'delete') {
            setDeleteTargetId(taskId);
        }
    }, [radialMenu, handleUpdate, selectedDate, handleStartFocus]);

    // Persist saved filters to localStorage
    useEffect(() => {
        localStorage.setItem('flowAppSavedFilters', JSON.stringify(savedFilters));
    }, [savedFilters]);

    const handleSaveFilter = useCallback((filter) => {
        setSavedFilters(prev => [...prev, filter]);
        api.createSavedFilter(filter).catch(console.error);
    }, []);

    const handleDeleteFilter = useCallback((filterId) => {
        setSavedFilters(prev => prev.filter(f => f.id !== filterId));
        api.deleteSavedFilter(filterId).catch(console.error);
    }, []);

      const displayedTreeData = useMemo(() => {
        const today = simulatedToday;
        let filtered;
        if (selectedDate === today) filtered = filterForTodayView(treeData, today);
        else filtered = filterTreeByDate(treeData, selectedDate, today);

        // Apply expression-based filter
        if (activeFilter.children && activeFilter.children.length > 0) {
          filtered = filterTreeByExpression(filtered, activeFilter);
        }
        return filtered;
      }, [treeData, selectedDate, simulatedToday, activeFilter]);

      // GSAP: staggered reveal of tree columns
      useEffect(() => {
        if (!contentRef.current || activeTab !== 'today' || viewMode !== 'tree') return;
        if (displayedTreeData.length === 0) return;
        const cols = contentRef.current.children;
        if (cols.length === 0) return;
        gsap.fromTo(cols,
          { opacity: 0, y: 30, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.08, ease: 'back.out(1.3)', clearProps: 'transform,opacity' }
        );
      }, [activeTab, viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

      // GSAP: tab content slide on tab change
      useEffect(() => {
        if (!tabContentRef.current) return;
        gsap.fromTo(tabContentRef.current,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
        );
      }, [activeTab]);

      // Timeline data: full tree with only expression filter applied (no date filtering)
      const timelineTreeData = useMemo(() => {
        if (activeFilter.children && activeFilter.children.length > 0) {
          return filterTreeByExpression(treeData, activeFilter);
        }
        return treeData;
      }, [treeData, activeFilter]);

      // IDs of nodes that directly match the active filter (vs ancestors shown for context)
      const filterMatchIds = useMemo(() => {
        if (!activeFilter.children || activeFilter.children.length === 0) return null;
        return collectFilterMatchIds(displayedTreeData, activeFilter);
      }, [displayedTreeData, activeFilter]);

      const allFieldKeys = useMemo(() => {
        const keys = new Set();
        const collectKeys = (nodes) => {
          for (const node of nodes) {
            if (node.fields) {
              for (const field of node.fields) {
                if (field.label) {
                  keys.add(field.label);
                }
              }
            }
            if (node.children && node.children.length > 0) {
              collectKeys(node.children);
            }
          }
        };
        collectKeys(treeData);
        return Array.from(keys);
      }, [treeData]);

      const suggestedTasks = useMemo(() => {
        const todayStr = simulatedToday;

        if (selectedDate < todayStr) {
          return [];
        }

        let tasksForSelectedDate = [];
        let deadlineTasks = [];
        let otherPendingTasks = [];

        const findTasksRecursive = (nodes) => {
          nodes.forEach(node => {
            if (node.isCompleted || !node.text || node.text.trim() === '') {
              // Skip
            } else if (node.scheduledDate === selectedDate || isDateAnOccurrence(node, selectedDate)) {
              tasksForSelectedDate.push(node);
            } else if (!node.recurrence && node.deadline && selectedDate <= node.deadline) {
              deadlineTasks.push(node);
            } else if (selectedDate === todayStr && !node.scheduledDate && !node.recurrence && !node.deadline) {
              otherPendingTasks.push(node);
            }

            if (node.children) {
              findTasksRecursive(node.children);
            }
          });
        };

        findTasksRecursive(treeData);

        if (selectedDate > todayStr) {
          return [...tasksForSelectedDate, ...deadlineTasks].slice(0, 3);
        }

        if (selectedDate === todayStr) {
          // Stable shuffle seeded by date so suggestions don't reshuffle on every treeData change
          const dateSeed = selectedDate.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
          const shuffledPending = otherPendingTasks.sort((a, b) => {
            const hashA = a.id.split('').reduce((s, c) => ((s << 5) - s + c.charCodeAt(0)) | 0, dateSeed);
            const hashB = b.id.split('').reduce((s, c) => ((s << 5) - s + c.charCodeAt(0)) | 0, dateSeed);
            return hashA - hashB;
          });

          const suggestions = [...tasksForSelectedDate, ...deadlineTasks, ...shuffledPending];
          return suggestions.slice(0, 3);
        }

        return [];
      }, [treeData, selectedDate]);

      const handleSuggestionClick = (taskId) => {
        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
        }
        setHighlightedTaskId(taskId);
        highlightTimeoutRef.current = setTimeout(() => {
          setHighlightedTaskId(null);
        }, 3000);
      };

      useEffect(() => {
        setSearchQuery('');
      }, [activeTab]);

      useEffect(() => {
        const handleClickOutside = (event) => {
          if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
            setIsDatePickerOpen(false);
          }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }, []);

      useEffect(() => {
        if (isTimelineInteracting) {
          document.body.classList.add('user-select-none');
        } else {
          document.body.classList.remove('user-select-none');
        }
        return () => {
          document.body.classList.remove('user-select-none');
        };
      }, [isTimelineInteracting]);

      const flattenedTree = useMemo(() => {
        const list = [];
        const traverse = (nodes) => {
          nodes.forEach(node => {
            const fieldsText = (node.fields || [])
              .map(field => `${field.label || ''} ${field.value || ''}`)
              .join(' ');
            const projectText = node.project ? `@${node.project}` : '';
            const tagsText = (node.tags || []).map(t => `#${t}`).join(' ');

            list.push({ id: node.id, text: node.text, searchableText: `${node.text || ''} ${fieldsText} ${projectText} ${tagsText}` });
            if (node.children) traverse(node.children);
          });
        };
        traverse(displayedTreeData);
        return list;
      }, [displayedTreeData]);

      const memorySearchCorpus = useMemo(() => {
        const notes = memoryData.notes.map(n => ({ type: 'note', id: n.id, text: n.text }));
        const qas = memoryData.qas.map(qa => ({ type: 'qa', id: qa.id, text: `${qa.question} ${qa.answer}` }));
        return [...notes, ...qas];
      }, [memoryData]);

      const fuse = useMemo(() => new Fuse(flattenedTree, {
        keys: ['searchableText'],
        includeScore: true,
        threshold: 0.4,
      }), [flattenedTree]);

      const memoryFuse = useMemo(() => new Fuse(memorySearchCorpus, {
        keys: ['text'],
        includeScore: true,
        threshold: 0.4,
      }), [memorySearchCorpus]);

      useEffect(() => {
        if (searchQuery) {
          let results;
          if (activeTab === 'memory') {
            results = memoryFuse.search(searchQuery);
          } else {
            results = fuse.search(searchQuery);
          }
          setSearchResults(results);
          setSearchIndex(0);
        } else {
          setSearchResults([]);
          setHighlightedTaskId(null);
        }
      }, [searchQuery, fuse, memoryFuse, activeTab]);

      useEffect(() => {
        if (highlightedTaskId) {
          const container = viewMode === 'list'
            ? document.querySelector('[data-list-view-container]')
            : canvasRef.current;
          const taskElement = container?.querySelector(`[data-task-id="${highlightedTaskId}"]`);
          if (taskElement) {
            taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, [highlightedTaskId, viewMode]);

      useEffect(() => {
        if (searchResults.length > 0) {
          const newHighlightedTaskId = searchResults[searchIndex]?.item.id;
          setHighlightedTaskId(newHighlightedTaskId);
          if (newHighlightedTaskId && viewMode === 'tree') {
            expandBranch(newHighlightedTaskId);
          }
        } else {
          setHighlightedTaskId(null);
        }
      }, [searchIndex, searchResults, expandBranch, viewMode]);

      useEffect(() => {
        const handleKeyDown = (e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setIsQuickAddOpen(true);
            return;
          }

          if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable) return;

          if (searchResults.length > 0) {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSearchIndex(prevIndex => (prevIndex + 1) % searchResults.length);
              return;
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSearchIndex(prevIndex => (prevIndex - 1 + searchResults.length) % searchResults.length);
              return;
            }
          }

          if (activeTab === 'today') {
            if (e.key === 'Backspace') setSearchQuery(q => q.slice(0, -1));
            else if (e.key === 'Escape') setSearchQuery('');
            else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) setSearchQuery(q => q + e.key);
          }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
      }, [searchResults, searchIndex, activeTab, viewMode, searchQuery]);

    const confirmDelete = () => {
        if (deleteTargetId) {
            handleDelete(deleteTargetId);
            setDeleteTargetId(null);
        }
    };

    const backgroundClasses = {
        idle: 'bg-surface-primary',
        focusing: 'bg-page-focus',
        break: 'bg-page-break',
        paused: 'bg-page-paused',
    };

    const isSearching = searchQuery.length > 0;

    return (
        <div className={`h-screen w-screen text-content-primary font-sans overflow-hidden flex flex-col transition-colors duration-1000 ${backgroundClasses[appState]}`}>
            {manualLogModal && (
                (() => {
                const isEditing = !!manualLogModal.logToEdit;
                const startTime = isEditing ? manualLogModal.logToEdit.startTime : manualLogModal.startTime;
                const endTime = isEditing ? manualLogModal.logToEdit.endTime : manualLogModal.endTime;
                const initialText = isEditing ? manualLogModal.logToEdit.taskText : '';

                if (!startTime || !endTime) return null;

                return (
                    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-surface-primary border border-edge-primary rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-semibold text-content-primary mb-2">{isEditing ? 'Edit Log Entry' : 'Add Manual Log Entry'}</h3>
                        <p className="text-sm text-content-tertiary mb-4">
                        For {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                        </p>
                        <form onSubmit={(e) => {
                        e.preventDefault();
                        const text = e.target.elements.description.value;
                        if (text) {
                            handleSaveLog({
                            id: isEditing ? manualLogModal.logToEdit.id : null,
                            text,
                            startTime,
                            endTime,
                            });
                            setManualLogModal(null);
                        }
                        }}>
                        <input
                            name="description"
                            type="text"
                            autoFocus
                            defaultValue={initialText}
                            placeholder="What were you working on?"
                            className="w-full bg-surface-secondary border border-edge-primary rounded-lg px-3 py-2 text-content-primary focus:outline-none focus:ring-2 focus:ring-edge-focus mb-4"
                        />
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setManualLogModal(null)} className="px-4 py-2 rounded-lg text-content-secondary hover:bg-surface-secondary transition-colors">Cancel</button>
                            <button type="submit" className="px-4 py-2 rounded-lg bg-accent-bolder text-content-inverse hover:bg-accent-boldest flex items-center gap-2">
                             Save Log
                            </button>
                        </div>
                        </form>
                    </div>
                    </div>
                );
                })()
            )}

            <DeleteModal
                isOpen={!!deleteTargetId}
                onClose={() => setDeleteTargetId(null)}
                onConfirm={confirmDelete}
            />

            <div className="absolute top-0 left-0 right-0 px-6 py-4 z-50 pointer-events-none flex justify-between items-center bg-gradient-to-b from-page-base via-page-base/80 to-transparent">
                <div className="flex items-center gap-6 pointer-events-auto">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-from to-brand-to bg-clip-text text-transparent">
                            Flow
                        </h1>
                    </div>
                    <div className="flex gap-1 rounded-lg bg-surface-primary/80 p-1 border border-edge-secondary backdrop-blur-sm">
                        {[
                            { id: 'today', label: 'Today' },
                            { id: 'logs', label: 'Logs' },
                            { id: 'memory', label: 'Memory' },
                            { id: 'change', label: 'Change' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-1.5 text-sm rounded-md transition-all font-medium ${
                                    activeTab === tab.id
                                        ? 'bg-accent-bold text-content-inverse shadow-sm'
                                        : 'text-content-tertiary hover:text-content-primary hover:bg-surface-secondary'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    {!isOnline && (
                        <button
                            onClick={() => checkReachability()}
                            className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md text-amber-400 hover:bg-amber-400/10 transition-colors"
                        >
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Offline — Go Online
                        </button>
                    )}
                    {syncStatus !== 'idle' && (
                        <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-all duration-300 ${
                            syncStatus === 'saving' ? 'text-content-tertiary' :
                            syncStatus === 'saved' ? 'text-accent' :
                            syncStatus === 'error' ? 'text-danger' : ''
                        }`}>
                            {syncStatus === 'saving' && (
                                <>
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-content-tertiary animate-pulse" />
                                    Saving
                                </>
                            )}
                            {syncStatus === 'saved' && (
                                <>
                                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    Saved
                                </>
                            )}
                            {syncStatus === 'error' && (
                                <>
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-danger" />
                                    Sync failed
                                </>
                            )}
                        </div>
                    )}
                    <button
                        onClick={() => setIsQuickAddOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-secondary/80 border border-edge-secondary transition-all text-xs"
                        title="Quick Add (Cmd+K)"
                    >
                        <Plus size={14} />
                        <span className="hidden sm:inline">Quick Add</span>
                        <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-surface-secondary text-content-disabled text-[10px] font-mono border border-edge-secondary">
                            {navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}K
                        </kbd>
                    </button>
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="p-2 rounded-lg text-content-tertiary hover:text-content-primary hover:bg-surface-secondary/80 disabled:opacity-50 transition-all"
                        title="Sync all data"
                    >
                        <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
                    </button>
                    {isSpeechSupported && (
                        <button
                            onClick={() => setIsRambleOpen(true)}
                            className="p-2 rounded-lg text-content-tertiary hover:text-content-primary hover:bg-surface-secondary/80 transition-all"
                            title="Ramble — voice input"
                        >
                            <Mic size={18} />
                        </button>
                    )}
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 rounded-lg text-content-tertiary hover:text-content-primary hover:bg-surface-secondary/80 transition-all"
                        title="Settings"
                    >
                        <Settings2 size={18} />
                    </button>
                </div>

                {/* Centered View Mode Toggle */}
                {activeTab === 'today' && (
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-lg bg-surface-primary/80 p-1 border border-edge-secondary backdrop-blur-sm pointer-events-auto">
                        {[
                            { mode: 'tree', icon: GitMerge, label: 'Tree View' },
                            { mode: 'list', icon: LayoutGrid, label: 'List View' },
                            { mode: 'timeline', icon: GanttChart, label: 'Timeline View' },
                        ].map(({ mode, icon: Icon, label }) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`p-2 rounded-md transition-all ${
                                    viewMode === mode
                                        ? 'bg-accent-bold text-content-inverse shadow-sm'
                                        : 'text-content-tertiary hover:text-content-primary hover:bg-surface-secondary'
                                }`}
                                title={label}
                            >
                                <Icon size={18} />
                            </button>
                        ))}
                    </div>
                )}

                {/* Right-aligned controls */}
                <div className="pointer-events-auto flex items-center justify-end gap-1 bg-surface-primary/90 backdrop-blur-md p-1.5 rounded-xl border border-edge-secondary shadow-lg">

                    {activeTab !== 'memory' && activeTab !== 'change' && (
                        <div className="relative" ref={datePickerRef}>
                        <button
                        onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                        className="flex items-center gap-2 cursor-pointer rounded-lg px-3 py-2 text-sm text-content-tertiary hover:text-content-primary hover:bg-surface-secondary transition-all"
                        >
                        <CalendarDays size={16} />
                        <span>{selectedDate === simulatedToday ? 'Today' : selectedDate}</span>
                        </button>
                        {isDatePickerOpen && (
                        <div className="absolute top-full right-0 mt-2 z-30 animate-in fade-in duration-100">
                            <CustomDatePicker
                            selected={selectedDate ? parseISO(selectedDate) : undefined}
                            onSelect={(date) => {
                                if (date) setSelectedDate(format(date, 'yyyy-MM-dd'));
                                setIsDatePickerOpen(false);
                            }}
                            />
                        </div>
                        )}
                        </div>
                    )}
                </div>
            </div>

            {activeTab === 'today' && <SuggestionBar suggestions={suggestedTasks} onSuggestionClick={handleSuggestionClick} />}

            <div className="pt-24 flex-1 flex flex-col min-h-0">
              {activeTab === 'today' && (viewMode === 'tree' || viewMode === 'list') && (
                <FilterSidebar
                    treeData={treeData}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                    savedFilters={savedFilters}
                    onSaveFilter={handleSaveFilter}
                    onDeleteFilter={handleDeleteFilter}
                />
              )}
              <DndContext sensors={dndSensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
              <div ref={tabContentRef} className="flex-1 flex flex-col min-h-0 relative">
                {activeTab === 'today' && viewMode === 'tree' && zoom !== 1 && (
                <button
                    onClick={resetZoom}
                    title="Reset zoom (Ctrl/Cmd + 0)"
                    className="absolute bottom-4 right-4 z-10 px-3 py-1.5 rounded-full bg-surface-secondary/90 backdrop-blur border border-edge-secondary text-content-secondary text-xs font-medium hover:text-accent hover:border-accent-bold transition-all shadow-lg"
                >
                    {Math.round(zoom * 100)}% · Reset
                </button>
                )}
                {activeTab === 'today' && viewMode === 'tree' && (
                <div
                    data-canvas-area
                    ref={canvasRef}
                    onMouseDown={handleCanvasMouseDown}
                    className="flex-1 overflow-auto animate-in fade-in duration-300"
                >
                    <div ref={contentRef} style={{ zoom }} className="flex gap-8 items-start p-8 min-h-full cursor-grab">
                        {displayedTreeData.length > 0 ? (
                        <>
                            {displayedTreeData.map(node => (
                            <TreeNode
                                key={node.id}
                                node={node}
                                onUpdate={(id, updates) => handleUpdate(id, updates, selectedDate)}
                                onAdd={(parentId) => handleAddTaskAndFocus(() => handleAddSubtask(parentId, selectedDate))}
                                onRequestDelete={setDeleteTargetId}
                                allFieldKeys={allFieldKeys}
                                onStartFocus={handleStartFocus}
                                focusedTaskId={focusedTask?.id}
                                isTimerActive={false}
                                isSearching={isSearching}
                                highlightedTaskId={radialMenu?.taskId || placementHighlightId || highlightedTaskId}
                                treeData={treeData}
                                highlightedRef={highlightedNodeRef}
                                selectedDate={selectedDate}
                                newlyAddedTaskId={newlyAddedTaskId}
                                onFocusHandled={() => setNewlyAddedTaskId(null)}
                                onOpenNotes={handleOpenNotes}
                                activeDragId={activeDragId}
                                filterMatchIds={filterMatchIds}
                            />
                            ))}
                            {selectedDate >= simulatedToday && (
                            <RootDropZoneButton onClick={() => handleAddTaskAndFocus(() => handleAddRoot(selectedDate))} activeDragId={activeDragId} />
                            )}
                        </>
                        ) : (
                        <div className="flex-1 flex items-center justify-center">
                        {selectedDate < simulatedToday ? (
                            <div className="flex flex-col items-center gap-3 text-center">
                                <div className="w-12 h-12 rounded-2xl bg-surface-secondary flex items-center justify-center">
                                    <CalendarDays size={24} className="text-content-disabled" />
                                </div>
                                <p className="text-content-disabled text-sm">No tasks were scheduled for this day.</p>
                            </div>
                        ) : (
                            <button
                            onClick={() => handleAddTaskAndFocus(() => handleAddRoot(selectedDate))}
                            className="w-64 h-24 rounded-2xl border-2 border-dashed border-edge-secondary flex items-center justify-center text-content-disabled hover:text-accent hover:border-accent-bold hover:bg-accent-subtle transition-all"
                            >
                            <div className="flex flex-col items-center gap-2">
                                <Plus size={24} />
                                <span className="font-medium">Add a Task</span>
                            </div>
                            </button>
                        )}
                        </div>
                        )}
                    </div>
                </div>
                )}
                {activeTab === 'today' && viewMode === 'list' && (
                (() => {
                    const listTasks = isSearching
                    ? searchResults.map(result => findNodeRecursive(displayedTreeData, result.item.id)).filter(Boolean)
                    : displayedTreeData;

                    return (
                    <ListView
                        tasks={listTasks}
                        onUpdate={(id, updates) => handleUpdate(id, updates, selectedDate)}
                        onStartFocus={handleStartFocus}
                        onAdd={(parentId) => handleAddTaskAndFocus(() => handleAddSubtask(parentId, selectedDate))}
                        onRequestDelete={setDeleteTargetId}
                        onAddRoot={() => handleAddTaskAndFocus(() => handleAddRoot(selectedDate))}
                        selectedDate={selectedDate}
                        newlyAddedTaskId={newlyAddedTaskId}
                        onFocusHandled={() => setNewlyAddedTaskId(null)}
                        onOpenNotes={handleOpenNotes}
                        activeDragId={activeDragId}
                    />
                    );
                })()
                )}
                {activeTab === 'today' && viewMode === 'timeline' && (
                  <TimelineView
                    tasks={timelineTreeData}
                    onUpdate={(id, updates) => handleUpdate(id, updates, selectedDate)}
                    onStartFocus={handleStartFocus}
                    onAdd={(parentId) => handleAddTaskAndFocus(() => handleAddSubtask(parentId, selectedDate))}
                    onRequestDelete={setDeleteTargetId}
                    onAddRoot={() => handleAddTaskAndFocus(() => handleAddRoot(selectedDate))}
                    selectedDate={selectedDate}
                    onOpenNotes={handleOpenNotes}
                  />
                )}
                {activeTab === 'memory' && (() => {
                const isSearching = searchQuery.length > 0;
                const memoryResults = isSearching ? memoryFuse.search(searchQuery).map(r => r.item) : [...memoryData.notes, ...memoryData.qas];
                const filteredNotes = memoryResults.filter(item => 'text' in item && !('question' in item));
                const filteredQAs = memoryResults.filter(item => 'question' in item);

                const notesContent = (
                    <MemoryView
                        searchQuery={searchQuery}
                        memoryData={{
                            notes: isSearching ? filteredNotes : memoryData.notes,
                            qas: [],
                        }}
                        onUpdate={(newMemory) => setMemoryData({ ...memoryData, ...newMemory })}
                        viewType="notes"
                    />
                );

                const qaContent = (
                    <MemoryView
                        searchQuery={searchQuery}
                        memoryData={{
                            notes: [],
                            qas: isSearching ? filteredQAs : memoryData.qas,
                        }}
                        onUpdate={(newMemory) => setMemoryData({ ...memoryData, ...newMemory })}
                        viewType="qas"
                    />
                );

                return (
                    <div className="flex flex-col h-full">
                        <MemorySearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
                        <CollapsiblePanels
                            leftPanelContent={notesContent}
                            leftTitle="Notes"
                            rightPanelContent={qaContent}
                            rightTitle="Q&A"
                        />
                    </div>
                );
                })()}
                {activeTab === 'logs' && <LogsView
                logs={logs}
                treeData={treeData}
                selectedDate={selectedDate}
                onAddManualLog={(times) => setManualLogModal(times)}
                onEditLog={(log) => setManualLogModal({ logToEdit: log })}
                onDeleteLog={handleDeleteLog}
                onUpdateLogTime={handleUpdateLogTime}
                onInteractionChange={setIsTimelineInteracting}
                />}
                {activeTab === 'change' && (
                  <ChangeView
                    journal={changeJournal}
                    updateJournal={updateChangeJournal}
                    treeData={treeData}
                    logs={logs}
                  />
                )}
              </div>
              <DragOverlay dropAnimation={null}>
                {activeDragId ? (() => {
                    const dragNode = findNodeRecursive(treeData, activeDragId);
                    return dragNode ? (
                        <div className="px-4 py-2 bg-surface-secondary border border-accent-secondary rounded-lg shadow-lg text-sm text-content-primary max-w-[200px] truncate">
                            {dragNode.text || 'Untitled Task'}
                        </div>
                    ) : null;
                })() : null}
              </DragOverlay>
              </DndContext>
            </div>

            {notesTaskId && (() => {
                const notesTask = findNodeRecursive(treeData, notesTaskId);
                if (!notesTask) return null;
                return (
                    <TaskNotesPanel
                        taskId={notesTaskId}
                        taskTitle={notesTask.text}
                        initialNotes={notesTask.notes || ''}
                        onUpdate={handleUpdate}
                        onClose={handleCloseNotes}
                        memoryData={memoryData}
                        onMemoryUpdate={(newMemory) => setMemoryData({ ...memoryData, ...newMemory })}
                        treeData={treeData}
                    />
                );
            })()}

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onExport={handleExport}
                onImport={handleImport}
                simulatedToday={simulatedToday}
                setSimulatedToday={setSimulatedToday}
                onLogout={onLogout}
            />
            <RambleModal
                isOpen={isRambleOpen}
                onClose={() => setIsRambleOpen(false)}
                onAddTasks={handleRambleAdd}
                treeData={treeData}
                onUpdate={(id, updates, forDate) => handleUpdate(id, updates, forDate || selectedDate)}
                onSaveLog={handleSaveLog}
                selectedDate={selectedDate}
            />
            <SearchOverlay query={searchQuery} resultCount={searchResults.length} currentIndex={searchIndex} />
            <QuickAddModal
                isOpen={isQuickAddOpen}
                onClose={() => setIsQuickAddOpen(false)}
                treeData={treeData}
                onAddSubtask={handleAddSubtask}
                onAddRoot={handleAddRoot}
                onUpdate={handleUpdate}
                selectedDate={selectedDate}
            />
            {pendingPlacement.length > 0 && (
                <PlacementPanel
                    pendingTasks={pendingPlacement}
                    treeData={treeData}
                    onPlace={handlePlaceTask}
                    onPlaceAsRoot={handlePlaceAsRoot}
                    onDismiss={handlePlacementDismiss}
                    onHighlightNode={handlePlacementHighlight}
                />
            )}
            {radialMenu && (
                <RadialMenu
                    x={radialMenu.x}
                    y={radialMenu.y}
                    taskId={radialMenu.taskId}
                    onAction={handleRadialAction}
                    onClose={() => setRadialMenu(null)}
                />
            )}
        </div>
    );
}
