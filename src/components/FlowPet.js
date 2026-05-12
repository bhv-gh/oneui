import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { differenceInCalendarDays, parseISO, format } from 'date-fns';

const SPRITE_SETS = {
  idle: [[-3, -3]],
  alert: [[-7, -3]],
  scratchSelf: [[-5, 0], [-6, 0], [-7, 0]],
  tired: [[-3, -2]],
  sleeping: [[-2, 0], [-2, -1]],
  N: [[-1, -2], [-1, -3]],
  NE: [[0, -2], [0, -3]],
  E: [[-3, 0], [-3, -1]],
  SE: [[-5, -1], [-5, -2]],
  S: [[-6, -3], [-7, -2]],
  SW: [[-5, -3], [-6, -1]],
  W: [[-4, -2], [-4, -3]],
  NW: [[-1, 0], [-1, -1]],
};

const SKINS = ['default', 'calico', 'black', 'gray', 'tora', 'silver', 'kina', 'spirit', 'ghost', 'fox', 'bunny', 'eevee', 'valentine', 'maia'];
const SKIN_BASE = 'https://raw.githubusercontent.com/raynecloudy/oneko_db/refs/heads/master';

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function plural(n, word) { return `${n} ${word}${n === 1 ? '' : 's'}`; }

function generateTaskMessage(task, pomodoroCount) {
  const msgs = [];
  const now = new Date();
  const name = task.text?.length > 22 ? task.text.slice(0, 22) + '…' : (task.text || 'this task');
  const age = task.createdAt ? differenceInCalendarDays(now, parseISO(task.createdAt)) : null;
  const log = task.activityLog || [];

  // ── Age-based ──
  if (age === 0) msgs.push(`"${name}" — fresh out the oven! ✨`);
  else if (age !== null && age <= 2) msgs.push(`"${name}" is ${plural(age, 'day')} young 🌱`);
  else if (age !== null && age > 14 && !task.isCompleted) msgs.push(`"${name}" has been waiting ${plural(age, 'day')}… 🥺`);
  else if (age !== null && age > 7) msgs.push(`"${name}" — ${plural(age, 'day')} and counting 🤔`);

  // ── Focus history ──
  const focusCount = task.focusCount || 0;
  if (focusCount >= 5) msgs.push(`${focusCount} focus sessions on "${name}"! Deep work champ! 🧠`);
  else if (focusCount >= 2) msgs.push(`You've focused on "${name}" ${focusCount} times 💪`);
  else if (focusCount === 1) msgs.push(`One focus session on "${name}" — keep it going! 🍅`);
  else if (focusCount === 0 && !task.isCompleted && age > 1) msgs.push(`"${name}" hasn't had a focus session yet. Try one? 🎯`);

  // ── Pomodoro count from logs ──
  if (pomodoroCount >= 5) msgs.push(`${plural(pomodoroCount, 'pomodoro')} logged for "${name}"! 🔥`);
  else if (pomodoroCount >= 2) msgs.push(`${plural(pomodoroCount, 'pomodoro')} on "${name}" — solid! 🍅`);

  // ── Priority ──
  if (task.priority === 'urgent') msgs.push(`🚨 "${name}" is URGENT — on it?`);
  else if (task.priority === 'high') msgs.push(`"${name}" is high priority 📌`);

  // ── Deadline pressure ──
  if (task.deadline && !task.isCompleted) {
    const daysLeft = differenceInCalendarDays(parseISO(task.deadline), now);
    if (daysLeft < 0) msgs.push(`⚠️ "${name}" is ${plural(Math.abs(daysLeft), 'day')} overdue!`);
    else if (daysLeft === 0) msgs.push(`"${name}" is due TODAY! 🏃`);
    else if (daysLeft <= 3) msgs.push(`"${name}" — ${plural(daysLeft, 'day')} left! ⏰`);
    else if (daysLeft <= 7) msgs.push(`"${name}" is due in ${plural(daysLeft, 'day')} 📅`);
  }

  // ── Rescheduling patterns ──
  const reschedules = log.filter(e => e.type === 'scheduled').length;
  if (reschedules >= 3) msgs.push(`"${name}" rescheduled ${reschedules} times… today's the day? 🗓️`);

  // ── Priority changes ──
  const prioChanges = log.filter(e => e.type === 'priority').length;
  if (prioChanges >= 3) msgs.push(`"${name}" changed priority ${prioChanges} times — make up your mind! 😸`);

  // ── Reopened tasks ──
  const reopens = log.filter(e => e.type === 'reopened').length;
  if (reopens >= 2) msgs.push(`"${name}" was reopened ${reopens} times — stubborn one! 🔄`);

  // ── Last focused long ago ──
  if (task.lastFocusedAt && !task.isCompleted) {
    const daysSinceFocus = differenceInCalendarDays(now, parseISO(task.lastFocusedAt));
    if (daysSinceFocus > 7) msgs.push(`Last focused on "${name}" ${plural(daysSinceFocus, 'day')} ago… revisit? 👀`);
  }

  // ── Completion ──
  if (task.isCompleted) {
    msgs.push(`"${name}" — done! ✅`);
    if (task.completionDate) {
      const daysAgo = differenceInCalendarDays(now, parseISO(task.completionDate));
      if (daysAgo === 0) msgs.push(`Finished "${name}" today! 🏆`);
    }
  }

  // ── Subtask progress ──
  if (task.children?.length > 0) {
    const done = task.children.filter(c => c.isCompleted).length;
    const total = task.children.length;
    if (done === total) msgs.push(`All ${total} subtasks of "${name}" done! 🎉`);
    else if (done > 0) msgs.push(`${done}/${total} subtasks done on "${name}" — ${total - done} to go! 📊`);
    else msgs.push(`"${name}" has ${total} subtasks waiting to start 📋`);
  }

  // ── Meaningful interaction count ──
  const ic = task.interactionCount || 0;
  if (ic >= 15) msgs.push(`"${name}" — ${ic} actions taken! You're invested 💜`);
  else if (ic >= 5) msgs.push(`${ic} actions on "${name}" — making progress ✏️`);
  else if (ic === 0 && !task.isCompleted && task.text) msgs.push(`"${name}" — no actions yet. Shall we begin? 🐾`);

  return msgs.length > 0 ? randomFrom(msgs) : null;
}

const COMPLETION_MSGS = [
  "Nicely done! 🎉", "Crushed it!", "Another one down!", "Purrfect! ✨",
  "Keep going!", "You're on fire! 🔥", "Meow-velous! 😸",
];
const STREAK_MSGS = ["Unstoppable! ⚡", "You're a machine!", "Legendary focus! 🏆"];
const FOCUS_MSGS = ["Deep focus 🧠", "Genius at work...", "You got this! 💪", "In the zone!"];
const IDLE_MSGS = [
  "Pick a task! 📋", "I believe in you~", "Let's go!", "*purrs*",
  "Ready?", "One task at a time 🐾", "*stretches*",
];

const FlowPet = ({ appState, completionCount, focusSessionsToday, streakDays, treeData, logs }) => {
  const [message, setMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const [bubblePos, setBubblePos] = useState({ x: 0, y: 0 });
  const prevCompletionRef = useRef(completionCount);
  const msgTimeoutRef = useRef(null);
  const animFrameRef = useRef(null);

  const pomodorosPerTask = useMemo(() => {
    const counts = {};
    (logs || []).forEach(log => {
      if (log.taskId) counts[log.taskId] = (counts[log.taskId] || 0) + 1;
    });
    return counts;
  }, [logs]);
  const pomodorosRef = useRef(pomodorosPerTask);
  pomodorosRef.current = pomodorosPerTask;

  const findTaskById = useCallback((id) => {
    const search = (nodes) => {
      for (const n of nodes) {
        if (n.id === id) return n;
        if (n.children) { const f = search(n.children); if (f) return f; }
      }
      return null;
    };
    return search(treeData || []);
  }, [treeData]);
  const findTaskRef = useRef(findTaskById);
  findTaskRef.current = findTaskById;

  const showBubble = useCallback((msg, duration = 5000) => {
    clearTimeout(msgTimeoutRef.current);
    setMessage(msg);
    setShowMessage(true);
    msgTimeoutRef.current = setTimeout(() => setShowMessage(false), duration);
  }, []);
  const showBubbleRef = useRef(showBubble);
  showBubbleRef.current = showBubble;

  // Core neko — pure cursor follower
  useEffect(() => {
    const size = 32;
    const speed = 10;
    const skin = localStorage.getItem('flow-pet-skin') || 'default';

    const el = document.createElement('div');
    el.id = 'flow-pet-neko';
    Object.assign(el.style, {
      width: `${size}px`, height: `${size}px`,
      position: 'fixed',
      imageRendering: 'pixelated',
      backgroundImage: `url(${SKIN_BASE}/${skin}.png)`,
      backgroundSize: `${size * 8}px ${size * 4}px`,
      zIndex: '9998',
      pointerEvents: 'auto',
      cursor: 'pointer',
      left: '0px', top: '0px',
    });
    document.body.appendChild(el);

    let nekoX = window.innerWidth / 2;
    let nekoY = window.innerHeight - 100;
    let targetX = nekoX;
    let targetY = nekoY;
    let frameCount = 0;
    let idleTime = 0;
    let idleAnim = null;
    let idleFrame = 0;

    const setSprite = (name, frame) => {
      const set = SPRITE_SETS[name];
      if (!set) return;
      const sp = set[frame % set.length];
      el.style.backgroundPosition = `${sp[0] * size}px ${sp[1] * size}px`;
    };

    // Always follow cursor
    const onMouseMove = (e) => {
      targetX = e.clientX - size / 2;
      targetY = e.clientY - size / 2;
    };
    window.addEventListener('mousemove', onMouseMove);

    // Click cat
    el.addEventListener('click', () => {
      const msgs = [...IDLE_MSGS, "Meow!", "*purrs louder*", "That tickles! 😹", "Hey! 🐱"];
      showBubbleRef.current(randomFrom(msgs));
    });

    // Hover on task cards — cat calls out facts (no movement change, just speech)
    let hoverDebounce = null;
    const onCardEnter = (e) => {
      const card = e.target.closest('[data-task-id]');
      if (!card) return;
      clearTimeout(hoverDebounce);
      hoverDebounce = setTimeout(() => {
        const taskId = card.getAttribute('data-task-id');
        const task = findTaskRef.current(taskId);
        if (!task || !task.text) return;
        const msg = generateTaskMessage(task, pomodorosRef.current[taskId] || 0);
        if (msg) showBubbleRef.current(msg, 5000);
      }, 600);
    };
    const onCardLeave = (e) => {
      if (e.target.closest('[data-task-id]')) clearTimeout(hoverDebounce);
    };
    document.addEventListener('mouseover', onCardEnter);
    document.addEventListener('mouseout', onCardLeave);

    // Animation loop
    let lastTs = 0;
    const animate = (ts) => {
      if (ts - lastTs < 100) { animFrameRef.current = requestAnimationFrame(animate); return; }
      lastTs = ts;
      frameCount++;

      const dx = nekoX - targetX;
      const dy = nekoY - targetY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < speed || dist < 48) {
        idleTime++;
        if (idleTime > 10 && Math.random() < 0.005 && !idleAnim) {
          idleAnim = randomFrom(['sleeping', 'scratchSelf']);
        }
        if (idleAnim === 'sleeping') {
          if (idleFrame < 8) setSprite('tired', 0);
          else setSprite('sleeping', Math.floor(idleFrame / 4));
          if (idleFrame > 192) { idleAnim = null; idleFrame = 0; }
        } else if (idleAnim === 'scratchSelf') {
          setSprite('scratchSelf', idleFrame);
          if (idleFrame > 9) { idleAnim = null; idleFrame = 0; }
        } else {
          setSprite('idle', 0);
        }
        if (idleAnim) idleFrame++;
      } else {
        idleAnim = null; idleFrame = 0; idleTime = 0;
        let dir = dy / dist > 0.5 ? 'N' : dy / dist < -0.5 ? 'S' : '';
        dir += dx / dist > 0.5 ? 'W' : dx / dist < -0.5 ? 'E' : '';
        setSprite(dir || 'idle', frameCount);
        nekoX -= (dx / dist) * speed;
        nekoY -= (dy / dist) * speed;
      }

      el.style.left = `${Math.round(nekoX)}px`;
      el.style.top = `${Math.round(nekoY)}px`;
      setBubblePos({ x: Math.round(nekoX) + size / 2, y: Math.round(nekoY) });
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseover', onCardEnter);
      document.removeEventListener('mouseout', onCardLeave);
      cancelAnimationFrame(animFrameRef.current);
      clearTimeout(hoverDebounce);
      if (el.parentNode) el.parentNode.removeChild(el);
    };
  }, []);

  // React to completions
  useEffect(() => {
    if (completionCount > prevCompletionRef.current) {
      showBubble(randomFrom(completionCount >= 3 ? STREAK_MSGS : COMPLETION_MSGS));
    }
    prevCompletionRef.current = completionCount;
  }, [completionCount, showBubble]);

  // React to app state
  useEffect(() => {
    if (appState === 'focusing') showBubble(randomFrom(FOCUS_MSGS));
    else if (appState === 'break') showBubble("Break time! ☕ You earned it!");
  }, [appState, showBubble]);

  // Streak
  useEffect(() => {
    if (streakDays >= 7) showBubble(`🔥 ${streakDays}-day streak! Incredible!`, 6000);
    else if (streakDays >= 3) showBubble(`${streakDays}-day streak! ⚡`, 5000);
  }, [streakDays, showBubble]);

  return showMessage ? (
    <div
      className="fixed pointer-events-none z-[10000] animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{ left: bubblePos.x, top: bubblePos.y - 8, transform: 'translate(-50%, -100%)' }}
    >
      <div className="bg-surface-primary/95 backdrop-blur-md border border-edge-secondary rounded-xl px-3 py-2 shadow-lg max-w-[280px]">
        <p className="text-xs text-content-primary font-medium leading-relaxed">{message}</p>
      </div>
      <div className="w-2 h-2 bg-surface-primary/95 border-r border-b border-edge-secondary rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
    </div>
  ) : null;
};

export const PetSkinPicker = () => {
  const [currentSkin, setCurrentSkin] = useState(() => localStorage.getItem('flow-pet-skin') || 'default');

  const handleSkinClick = (skin) => {
    setCurrentSkin(skin);
    localStorage.setItem('flow-pet-skin', skin);
    window.dispatchEvent(new Event('flow-vibes-changed'));
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {SKINS.map(skin => (
        <button
          key={skin}
          onClick={() => handleSkinClick(skin)}
          className={`px-2 py-1 text-[10px] rounded-lg capitalize transition-all ${
            currentSkin === skin
              ? 'bg-accent-bold text-content-inverse font-medium'
              : 'bg-surface-secondary text-content-tertiary hover:text-content-primary hover:bg-surface-tertiary'
          }`}
        >
          {skin}
        </button>
      ))}
    </div>
  );
};

export default FlowPet;
