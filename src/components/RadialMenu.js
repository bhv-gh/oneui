import React, { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { addDays, nextSaturday, nextMonday, addWeeks, addMonths, format } from 'date-fns';
import { Flag, CalendarPlus, CalendarClock, Play, Trash2, X } from 'lucide-react';
import { getPriorityColor } from '../utils/priorityUtils';

const SEGMENTS = [
  { id: 'priority', label: 'Priority', icon: Flag, color: '#fb923c' },
  { id: 'schedule', label: 'Schedule', icon: CalendarPlus, color: '#38bdf8' },
  { id: 'deadline', label: 'Deadline', icon: CalendarClock, color: '#fbbf24' },
  { id: 'focus', label: 'Focus', icon: Play, color: '#4ade80' },
  { id: 'delete', label: 'Delete', icon: Trash2, color: '#f43f5e' },
];

const PRIORITY_OPTIONS = [
  { id: 'urgent', label: 'Urgent', color: '#f43f5e' },
  { id: 'high', label: 'High', color: '#fb923c' },
  { id: 'medium', label: 'Medium', color: '#fbbf24' },
  { id: 'low', label: 'Low', color: '#38bdf8' },
  { id: 'none', label: 'None', color: '#64748b' },
];

function getScheduleOptions() {
  const today = new Date();
  return [
    { id: 'today', label: 'Today', date: format(today, 'yyyy-MM-dd') },
    { id: 'tomorrow', label: 'Tomorrow', date: format(addDays(today, 1), 'yyyy-MM-dd') },
    { id: 'weekend', label: 'Weekend', date: format(nextSaturday(today), 'yyyy-MM-dd') },
    { id: 'next-week', label: 'Next Mon', date: format(nextMonday(today), 'yyyy-MM-dd') },
    { id: 'next-2w', label: 'In 2 weeks', date: format(addWeeks(today, 2), 'yyyy-MM-dd') },
  ];
}

function getDeadlineOptions() {
  const today = new Date();
  return [
    { id: 'tomorrow', label: 'Tomorrow', date: format(addDays(today, 1), 'yyyy-MM-dd') },
    { id: 'this-week', label: 'This Fri', date: format(addDays(nextSaturday(today), -1), 'yyyy-MM-dd') },
    { id: 'next-week', label: 'Next Fri', date: format(addDays(addWeeks(nextSaturday(today), 1), -1), 'yyyy-MM-dd') },
    { id: 'next-month', label: 'In a month', date: format(addMonths(today, 1), 'yyyy-MM-dd') },
    { id: 'none', label: 'Remove', date: null },
  ];
}

const RING_RADIUS = 120;
const SUB_RADIUS = 100;
const ITEM_SIZE = 72;

const RadialMenu = ({ x, y, taskId, onAction, onClose }) => {
  const [activeSegment, setActiveSegment] = useState(null);
  const [subOptions, setSubOptions] = useState(null);
  const containerRef = useRef(null);
  const itemsRef = useRef([]);
  const [cardRect, setCardRect] = useState(null);

  // Find the target card and spotlight it
  useEffect(() => {
    const card = document.querySelector(`[data-task-id="${taskId}"]`);
    if (card) {
      const rect = card.getBoundingClientRect();
      setCardRect({ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12, borderRadius: 16 });
      card.style.position = 'relative';
      card.style.zIndex = '301';
      return () => { card.style.zIndex = ''; card.style.position = ''; };
    }
  }, [taskId]);

  // Animate in — all items burst from center simultaneously
  useEffect(() => {
    if (!containerRef.current) return;
    const els = containerRef.current.querySelectorAll('[data-radial-item]');

    // Each item is positioned at its final spot via inline style.
    // We animate FROM the center by calculating the reverse offset.
    els.forEach((el) => {
      const finalLeft = parseFloat(el.style.left);
      const finalTop = parseFloat(el.style.top);
      const dx = finalLeft + ITEM_SIZE / 2;
      const dy = finalTop + ITEM_SIZE / 2;
      gsap.fromTo(el,
        { x: dx, y: dy, scale: 0.3, opacity: 0 },
        { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.7)', clearProps: 'transform' }
      );
    });

    // Center button pop
    const center = containerRef.current.querySelector('[data-radial-center]');
    if (center) {
      gsap.fromTo(center, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: 'back.out(2)', clearProps: 'transform' });
    }

    // Lines fade in
    const lines = containerRef.current.querySelectorAll('[data-radial-line]');
    gsap.fromTo(lines,
      { opacity: 0 },
      { opacity: 0.5, duration: 0.3, delay: 0.1, ease: 'power2.out' }
    );
  }, [subOptions]);

  // Close on escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose();
      }
    };
    setTimeout(() => window.addEventListener('mousedown', handleClick), 50);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const handleSegmentClick = useCallback((segment) => {
    if (segment.id === 'focus') {
      onAction('focus');
      onClose();
      return;
    }
    if (segment.id === 'delete') {
      onAction('delete');
      onClose();
      return;
    }
    if (segment.id === 'priority') {
      setSubOptions({ type: 'priority', items: PRIORITY_OPTIONS });
      setActiveSegment(segment.id);
      return;
    }
    if (segment.id === 'schedule') {
      setSubOptions({ type: 'schedule', items: getScheduleOptions() });
      setActiveSegment(segment.id);
      return;
    }
    if (segment.id === 'deadline') {
      setSubOptions({ type: 'deadline', items: getDeadlineOptions() });
      setActiveSegment(segment.id);
      return;
    }
  }, [onAction, onClose]);

  const handleSubClick = useCallback((item) => {
    if (subOptions.type === 'priority') {
      onAction('priority', item.id);
    } else if (subOptions.type === 'schedule') {
      onAction('schedule', item.date);
    } else if (subOptions.type === 'deadline') {
      onAction('deadline', item.date);
    }
    onClose();
  }, [subOptions, onAction, onClose]);

  const handleBack = useCallback(() => {
    setSubOptions(null);
    setActiveSegment(null);
  }, []);

  // Clamp position to keep menu on screen
  const menuX = Math.max(RING_RADIUS + 20, Math.min(window.innerWidth - RING_RADIUS - 20, x));
  const menuY = Math.max(RING_RADIUS + 20, Math.min(window.innerHeight - RING_RADIUS - 20, y));

  const items = subOptions ? subOptions.items : SEGMENTS;
  const radius = subOptions ? SUB_RADIUS : RING_RADIUS;

  return (
    <div className="fixed inset-0 z-[300]" style={{ cursor: 'default' }}>
      {/* Dark blurred backdrop with cutout for the target card */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200"
        style={cardRect ? {
          maskImage: `radial-gradient(ellipse ${cardRect.width * 0.7}px ${cardRect.height * 0.8}px at ${cardRect.left + cardRect.width / 2}px ${cardRect.top + cardRect.height / 2}px, transparent 60%, black 100%)`,
          WebkitMaskImage: `radial-gradient(ellipse ${cardRect.width * 0.7}px ${cardRect.height * 0.8}px at ${cardRect.left + cardRect.width / 2}px ${cardRect.top + cardRect.height / 2}px, transparent 60%, black 100%)`,
        } : {}}
      />
      <div
        ref={containerRef}
        className="absolute"
        style={{ left: menuX, top: menuY }}
      >
        {/* Center dot */}
        <button
          data-radial-center
          onClick={subOptions ? handleBack : onClose}
          className="absolute w-12 h-12 rounded-full bg-surface-primary border border-edge-primary shadow-xl flex items-center justify-center z-10 hover:bg-surface-secondary transition-colors"
          style={{ left: -24, top: -24 }}
        >
          <X size={16} className="text-content-muted" />
        </button>

        {/* Radial items */}
        {items.map((item, i) => {
          const angle = (2 * Math.PI * i) / items.length - Math.PI / 2;
          const ix = Math.cos(angle) * radius;
          const iy = Math.sin(angle) * radius;

          const isLightTheme = document.documentElement.getAttribute('data-theme') === 'personal';
          const itemColor = item.color || (subOptions?.type === 'priority' ? getPriorityColor(item.id, isLightTheme).dot : '#94a3b8');

          return (
            <button
              key={item.id}
              data-radial-item
              onClick={() => subOptions ? handleSubClick(item) : handleSegmentClick(item)}
              className="absolute flex flex-col items-center justify-center rounded-xl border shadow-xl transition-all duration-150 hover:scale-110 active:scale-95 bg-surface-primary"
              style={{
                left: ix - ITEM_SIZE / 2,
                top: iy - ITEM_SIZE / 2,
                width: ITEM_SIZE,
                height: ITEM_SIZE,
                borderColor: `${itemColor}60`,
                boxShadow: `0 4px 12px ${itemColor}20`,
              }}
            >
              {item.icon && <item.icon size={22} style={{ color: itemColor }} />}
              <span className="text-[11px] font-semibold mt-1 text-content-primary leading-tight">{item.label}</span>
            </button>
          );
        })}

        {/* Connecting lines */}
        <svg className="absolute pointer-events-none" style={{ left: -radius - 10, top: -radius - 10, width: (radius + 10) * 2, height: (radius + 10) * 2 }}>
          {items.map((item, i) => {
            const angle = (2 * Math.PI * i) / items.length - Math.PI / 2;
            const endX = Math.cos(angle) * (radius - ITEM_SIZE / 2 - 4);
            const endY = Math.sin(angle) * (radius - ITEM_SIZE / 2 - 4);
            const cx = radius + 10;
            const cy = radius + 10;
            const itemColor = item.color || '#94a3b8';
            return (
              <line
                key={item.id}
                data-radial-line
                x1={cx} y1={cy}
                x2={cx + endX} y2={cy + endY}
                stroke={itemColor}
                strokeWidth="2"
                opacity="0.5"
                strokeLinecap="round"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default RadialMenu;
