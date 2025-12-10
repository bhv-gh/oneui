import React, { useState, useEffect, useRef, useMemo, useContext } from 'react';
import { 
    Plus, 
    Minimize,
    Maximize,
    CalendarDays,
    Settings2,
    GitMerge,
    LayoutGrid,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

import TreeDataContext from '../contexts/TreeDataContext';
import LogsContext from '../contexts/LogsContext';
import MemoryContext from '../contexts/MemoryContext';

import CustomDatePicker from '../components/CustomDatePicker';
import SearchOverlay from '../components/SearchOverlay';
import SuggestionBar from '../components/SuggestionBar';
import TreeNode from '../components/TreeNode';
import ListView from '../components/ListView';
import MemoryView from '../components/MemoryView';
import LogsView from '../components/LogsView';
import SettingsModal from '../components/SettingsModal';
import DeleteModal from '../components/DeleteModal';
import MemorySearchBar from '../components/MemorySearchBar';
import CollapsiblePanels from '../components/CollapsiblePanels';
import InsightsView from '../components/InsightsView';

import { getTodayDateString, isDateAnOccurrence } from '../utils/dateUtils';
import { findNodeRecursive } from '../utils/treeUtils';
import Fuse from 'fuse.js';
const POMODORO_TIME = 25 * 60;
export default function MainPage({
    focusedTask,
    handleStartFocus,
    appState,
    handleExport,
    handleImport,
}) {
    const { 
        treeData, 
        handleUpdate, 
        handleAddSubtask, 
        handleDelete, 
        handleAddRoot,
        expandBranch, 
    } = useContext(TreeDataContext);
    const { logs, handleSaveLog, handleDeleteLog, handleUpdateLogTime } = useContext(LogsContext);
    const { memoryData, setMemoryData } = useContext(MemoryContext);
    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(getTodayDateString);
    const [activeTab, setActiveTab] = useState('today');
    const [viewMode, setViewMode] = useState(() => {
        return localStorage.getItem('flowAppViewMode') || 'tree';
    });
    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const [newlyAddedTaskId, setNewlyAddedTaskId] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [manualLogModal, setManualLogModal] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [highlightedTaskId, setHighlightedTaskId] = useState(null);
    const [searchIndex, setSearchIndex] = useState(0);
    const [isTimelineInteracting, setIsTimelineInteracting] = useState(false);
    const highlightedNodeRef = useRef(null);
    const datePickerRef = useRef(null);
    const contentRef = useRef(null);
    const canvasRef = useRef(null);
    const highlightTimeoutRef = useRef(null);

    const handleAddTaskAndFocus = (addFn) => {
        const newId = addFn();
        if (newId) {
            setNewlyAddedTaskId(newId);
        }
    };

    const filterTreeByCompletionDate = (nodes, date) => {
        return nodes.map(node => {
          const children = node.children ? filterTreeByCompletionDate(node.children, date) : [];
          const hasCompletedChildren = children.some(c => c !== null);
          
          const wasCompletedOnDate = node.recurrence
            ? node.completedOccurrences?.includes(date)
            : node.completionDate === date;

          if (wasCompletedOnDate || hasCompletedChildren) {
            return { ...node, children };
          }
          return null;
        }).filter(node => node !== null);
      };
    
      const filterTreeByScheduledDate = (nodes, date) => {
        return nodes.map(node => {
          const originalChildrenCount = node.children?.length || 0;
          const children = node.children ? filterTreeByScheduledDate(node.children, date) : [];
          const hasScheduledChildren = children.some(c => c !== null);
    
          if ((node.scheduledDate === date || isDateAnOccurrence(node, date)) || hasScheduledChildren) {
            return { ...node, children, originalChildrenCount };
          }
          return null;
        }).filter(node => node !== null);
      };
    
      const filterForTodayView = (nodes, today) => {
        return nodes.map(node => { 
          const originalChildrenCount = node.children?.length || 0;
          const visibleChildren = node.children ? filterForTodayView(node.children, today) : [];
          
          const isCompletedForToday = node.recurrence
            ? node.completedOccurrences?.includes(today)
            : (node.isCompleted && node.completionDate === today);

          const isRelevantToday = (node.scheduledDate && node.scheduledDate <= today) || isDateAnOccurrence(node, today) || !node.scheduledDate;

          const isTaskActionable = isRelevantToday && !isCompletedForToday;
          const wasCompletedToday = node.recurrence
            ? node.completedOccurrences?.includes(today)
            : node.isCompleted && node.completionDate === today;
          const hasVisibleDescendants = visibleChildren.length > 0;
    
          if (isTaskActionable || wasCompletedToday || hasVisibleDescendants) {
            return { ...node, children: visibleChildren, originalChildrenCount };
          }
          return null;
        }).filter(node => node !== null);
      };
    
      const displayedTreeData = useMemo(() => {
        const today = getTodayDateString();
        if (selectedDate < today) return filterTreeByCompletionDate(treeData, selectedDate);
        if (selectedDate > today) return filterTreeByScheduledDate(treeData, selectedDate);
        return filterForTodayView(treeData, today);
      }, [treeData, selectedDate]);
    
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
        const todayStr = getTodayDateString();
    
        if (selectedDate < todayStr) {
          return [];
        }
    
        let tasksForSelectedDate = [];
        let overdueTasks = [];
        let otherPendingTasks = [];
    
        const findTasksRecursive = (nodes) => {
          nodes.forEach(node => {
            if (node.isCompleted || !node.text || node.text.trim() === '') {
              // Skip
            } else if (node.scheduledDate === selectedDate || isDateAnOccurrence(node, selectedDate)) {
              tasksForSelectedDate.push(node);
            } else if (selectedDate === todayStr && node.scheduledDate && node.scheduledDate < todayStr) {
              overdueTasks.push(node);
            } else if (selectedDate === todayStr && !node.scheduledDate) {
              otherPendingTasks.push(node);
            }
    
            if (node.children) {
              findTasksRecursive(node.children);
            }
          });
        };
    
        findTasksRecursive(treeData);
    
        if (selectedDate > todayStr) {
          return tasksForSelectedDate.slice(0, 3);
        }
    
        if (selectedDate === todayStr) {
          overdueTasks.sort((a, b) => parseISO(a.scheduledDate) - parseISO(b.scheduledDate));
          const shuffledPending = otherPendingTasks.sort(() => 0.5 - Math.random());
    
          const suggestions = [...overdueTasks, ...tasksForSelectedDate, ...shuffledPending];
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
        const isAnyDragActive = isDragging || isTimelineInteracting;
        if (isAnyDragActive) {
          document.body.classList.add('user-select-none');
        } else {
          document.body.classList.remove('user-select-none');
        }
        return () => {
          document.body.classList.remove('user-select-none');
        };
      }, [isDragging, isTimelineInteracting]);
    
      const flattenedTree = useMemo(() => {
        const list = [];
        const traverse = (nodes) => {
          nodes.forEach(node => {
            const fieldsText = (node.fields || [])
              .map(field => `${field.label || ''} ${field.value || ''}`)
              .join(' ');
    
            list.push({ id: node.id, text: node.text, searchableText: `${node.text || ''} ${fieldsText}` });
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
        if (highlightedNodeRef.current) {
          const canvas = canvasRef.current;
          const nodeElement = highlightedNodeRef.current;
          const canvasRect = canvas.getBoundingClientRect();
          const nodeRect = nodeElement.getBoundingClientRect();
          
          const targetX = (canvasRect.width / 2) - (nodeRect.width / 2) - (nodeRect.left - canvasRect.left);
          const targetY = (canvasRect.height / 2) - (nodeRect.height / 2) - (nodeRect.top - canvasRect.top);
    
          setPan(prevPan => ({
            x: prevPan.x + targetX / scale,
            y: prevPan.y + targetY / scale,
          }));
        }
      }, [highlightedTaskId, scale]);
    
      useEffect(() => {
        if (viewMode === 'list' && highlightedTaskId) {
          const listContainer = document.querySelector('[data-list-view-container]');
          const taskElement = listContainer?.querySelector(`[data-task-id="${highlightedTaskId}"]`);
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
          if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
    
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

    const clampPan = (newPan, currentScale) => {
        if (!contentRef.current || !canvasRef.current) return newPan;

        const canvas = canvasRef.current;
        const content = contentRef.current;

        const canvasWidth = canvas.offsetWidth; 
        const canvasHeight = canvas.offsetHeight;
        const contentWidth = content.offsetWidth * currentScale; 
        const contentHeight = content.offsetHeight * currentScale; 
        const cardWidth = Math.max(250, Math.min(350, window.innerWidth * 0.15)); // Calculate card width based on vw, with min/max
        const padding = Math.min(canvasWidth, canvasHeight) * 0.2; // Allow 20% of the smaller canvas dimension as overscroll
        let minX, maxX, minY, maxY;

        if (contentWidth < canvasWidth) {
            minX = -contentWidth;
            maxX = canvasWidth;
        } else {
            minX = canvasWidth - contentWidth - padding;
            maxX = padding; 
        }

        if (contentHeight < canvasHeight) {
            minY = 0;
            maxY = canvasHeight - contentHeight;
        } else {
            minY = -(contentHeight - canvasHeight + padding);
            maxY = padding;
        }

        const clampedX = Math.max(minX / currentScale, Math.min(maxX / currentScale, newPan.x));
        const clampedY = Math.max(minY / currentScale, Math.min(maxY / currentScale, newPan.y));

        return { x: clampedX, y: clampedY };
    };

    const handleMouseDown = (e) => {
        if (e.target.closest('button, input, .cursor-text')) return;
        e.preventDefault();
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        setPan(clampPan({
            x: dragStartRef.current.panX + dx / scale,
            y: dragStartRef.current.panY + dy / scale,
        }, scale));
    };

    const handleMouseUpOrLeave = () => {
        setIsDragging(false);
    };

    const handleWheel = (e) => {
        if (e.altKey) {
            const zoomSpeed = 0.002;
            const minScale = 0.2;
            const maxScale = 2.5;

            const canvasRect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - canvasRect.left;
            const mouseY = e.clientY - canvasRect.top;

            const oldScale = scale;
            const newScale = Math.max(minScale, Math.min(maxScale, oldScale - e.deltaY * zoomSpeed));

            const worldX = (mouseX / oldScale) - pan.x;
            const worldY = (mouseY / oldScale) - pan.y;

            const newPanX = (mouseX / newScale) - worldX;
            const newPanY = (mouseY / newScale) - worldY;

            setScale(newScale);
            setPan(clampPan({ x: newPanX, y: newPanY }, newScale));

        } else {
            setPan(prevPan => clampPan({
                x: prevPan.x - e.deltaX / scale,
                y: prevPan.y - e.deltaY / scale,
            }, scale));
        }
    };

    const backgroundClasses = {
        idle: 'bg-slate-900',
        focusing: 'bg-emerald-950',
        break: 'bg-sky-950',
        paused: 'bg-slate-950',
    };

    const isSearching = searchQuery.length > 0;

    return (
        <div className={`h-screen w-screen text-slate-200 font-sans overflow-hidden flex flex-col transition-colors duration-1000 ${backgroundClasses[appState]}`}>
            {manualLogModal && (
                (() => {
                const isEditing = !!manualLogModal.logToEdit;
                const startTime = isEditing ? manualLogModal.logToEdit.startTime : manualLogModal.startTime;
                const endTime = isEditing ? manualLogModal.logToEdit.endTime : manualLogModal.endTime;
                const initialText = isEditing ? manualLogModal.logToEdit.taskText : '';

                if (!startTime || !endTime) return null;

                return (
                    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-semibold text-slate-100 mb-2">{isEditing ? 'Edit Log Entry' : 'Add Manual Log Entry'}</h3>
                        <p className="text-sm text-slate-400 mb-4">
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
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
                        />
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setManualLogModal(null)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors">Cancel</button>
                            <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
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

            <div className="absolute top-0 left-0 right-0 p-6 z-50 pointer-events-none flex justify-between items-start bg-gradient-to-b from-slate-950 to-transparent">
                <div className="flex items-center gap-6 pointer-events-auto">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                            Flow
                        </h1>
                    </div>
                    <div className="flex gap-1 rounded-lg bg-slate-900/80 p-1 border border-slate-800 backdrop-blur-sm">
                        <button onClick={() => setActiveTab('today')} className={`px-4 py-1.5 text-sm rounded-md transition-colors ${activeTab === 'today' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Today</button>
                        <button onClick={() => setActiveTab('logs')} className={`px-4 py-1.5 text-sm rounded-md transition-colors ${activeTab === 'logs' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Logs</button>
                        <button onClick={() => setActiveTab('memory')} className={`px-4 py-1.5 text-sm rounded-md transition-colors ${activeTab === 'memory' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Memory</button>
                        <button onClick={() => setActiveTab('insights')} className={`px-4 py-1.5 text-sm rounded-md transition-colors ${activeTab === 'insights' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Insights</button>
                    </div>
                    <button 
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 rounded-lg text-slate-400 hover:bg-white/10"
                    >
                        <Settings2 size={18} />
                    </button>
                </div>
                
                {/* Centered View Mode Toggle */}
                {activeTab === 'today' && (
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-lg bg-slate-900/80 p-1 border border-slate-800 backdrop-blur-sm pointer-events-auto">
                        <button onClick={() => setViewMode('tree')} className={`p-2 rounded-md transition-colors ${viewMode === 'tree' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`} title="Tree View">
                        <GitMerge size={18} />
                        </button>
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`} title="List View">
                        <LayoutGrid size={18} />
                        </button>
                    </div>
                )}

                {/* Right-aligned controls */}
                <div className="pointer-events-auto flex items-center justify-end gap-2 bg-slate-900/90 backdrop-blur p-2 rounded-xl border border-slate-800">
                    {activeTab === 'today' && viewMode === 'tree' && (
                        <div className="flex items-center gap-2 animate-in fade-in duration-200">
                            <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-2 hover:bg-white/10 rounded-lg" title="Zoom Out"><Minimize size={18} /></button>
                            <span className="flex items-center px-2 text-sm font-mono text-slate-400 w-12 text-center justify-center">{Math.round(scale * 100)}%</span>
                            <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-2 hover:bg-white/10 rounded-lg" title="Zoom In"><Maximize size={18} /></button>
                        </div>
                    )}

                    {activeTab !== 'memory' && (
                        <div className="relative" ref={datePickerRef}>
                        <button 
                        onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                        className="flex items-center gap-2 cursor-pointer rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/10 transition-colors"
                        >
                        <CalendarDays size={16} />
                        <span>{selectedDate === getTodayDateString() ? 'Today' : selectedDate}</span>
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
                {activeTab === 'today' && viewMode === 'tree' && (
                <div
                    data-canvas-area
                    ref={canvasRef}
                    className={`no-scrollbar flex-1 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:2vmin_2vmin] ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} animate-in fade-in duration-300 overflow-auto overscroll-x-contain`}
                    onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUpOrLeave}
                    onMouseLeave={handleMouseUpOrLeave} onWheel={handleWheel}
                >
                    <div
                    className="min-w-max min-h-full p-[5vmin] flex justify-center items-start origin-top-left"
                    style={{ transform: `scale(${scale}) translate(${pan.x}px, ${pan.y}px)`, transition: isDragging ? 'none' : 'transform 0.2s' }}
                    >
                    <div ref={contentRef} className="flex gap-16 items-start">
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
                                highlightedTaskId={highlightedTaskId}
                                treeData={treeData}
                                highlightedRef={highlightedNodeRef}
                                selectedDate={selectedDate}
                                newlyAddedTaskId={newlyAddedTaskId}
                                onFocusHandled={() => setNewlyAddedTaskId(null)}
                            />
                            ))}
                            {selectedDate >= getTodayDateString() && (
                            <button onClick={() => handleAddTaskAndFocus(() => handleAddRoot(selectedDate))} className="w-64 h-24 rounded-2xl border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-600 hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all">
                                <div className="flex flex-col items-center gap-2">
                                <Plus size={24} />
                                <span className="font-medium">New Root</span>
                                </div>
                            </button>
                            )}
                        </>
                        ) : (
                        selectedDate < getTodayDateString() ? (
                            <div className="text-slate-600">No tasks were completed on this day.</div>
                        ) : (
                            <button 
                            onClick={() => handleAddTaskAndFocus(() => handleAddRoot(selectedDate))}
                            className="w-64 h-24 rounded-2xl border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-600 hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
                            >
                            <div className="flex flex-col items-center gap-2">
                                <Plus size={24} />
                                <span className="font-medium">Add a Task</span>
                            </div>
                            </button>
                        )
                        )}
                    </div>
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
                    />
                    );
                })()
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
                selectedDate={selectedDate} 
                onAddManualLog={(times) => setManualLogModal(times)}
                onEditLog={(log) => setManualLogModal({ logToEdit: log })}
                onDeleteLog={handleDeleteLog}
                onUpdateLogTime={handleUpdateLogTime}
                onInteractionChange={setIsTimelineInteracting}
                />}
                {activeTab === 'insights' && <InsightsView tasks={treeData} />}
            </div>

            <SettingsModal 
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onExport={handleExport}
                onImport={handleImport}
            />
            <SearchOverlay query={searchQuery} resultCount={searchResults.length} currentIndex={searchIndex} />
        </div>
    );
}
