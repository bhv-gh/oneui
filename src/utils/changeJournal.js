// Pure logic for the Change Journal feature. No React, no I/O — unit-tested in
// changeJournal.test.js and consumed by useChangeJournal + ChangeView.

import { parseISO, subDays, format } from 'date-fns';
import { STEP_BY_ID, DEFAULT_PROGRAM_ORDER } from '../data/changeSteps';

export const JOURNAL_VERSION = 1;

// ── Shape helpers ──────────────────────────────────────────

export function createDefaultJournal() {
  return {
    version: JOURNAL_VERSION,
    updatedAt: null,
    program: {
      activeStepId: DEFAULT_PROGRAM_ORDER[0] || null,
      order: [...DEFAULT_PROGRAM_ORDER],
      steps: {},
    },
    entries: {},
  };
}

// Coerce arbitrary (possibly stale / partial) data into a valid journal shape so
// the UI never crashes on malformed input from the cache or the network.
export function normalizeJournal(data) {
  if (!data || typeof data !== 'object') return createDefaultJournal();
  const base = createDefaultJournal();
  const program = data.program && typeof data.program === 'object' ? data.program : {};
  const order = Array.isArray(program.order) && program.order.length > 0
    ? program.order.filter(id => STEP_BY_ID[id])
    : base.program.order;
  const steps = program.steps && typeof program.steps === 'object' ? program.steps : {};
  let activeStepId = program.activeStepId;
  if (activeStepId && !STEP_BY_ID[activeStepId]) activeStepId = null;
  if (!activeStepId) activeStepId = order[0] || null;
  return {
    version: JOURNAL_VERSION,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : null,
    program: { activeStepId, order, steps },
    entries: data.entries && typeof data.entries === 'object' ? data.entries : {},
  };
}

// Merge seed step content with the user's in-app overrides. Overrides win, so
// pasting the book's verbatim text later needs no code change.
export function getEffectiveStep(journal, stepId) {
  const seed = STEP_BY_ID[stepId];
  if (!seed) return null;
  const overrides = journal?.program?.steps?.[stepId]?.overrides || {};
  return { ...seed, ...overrides, id: stepId, config: { ...(seed.config || {}), ...(overrides.config || {}) } };
}

export function getStepState(journal, stepId) {
  return journal?.program?.steps?.[stepId] || {};
}

// ── Program transitions ────────────────────────────────────

export function setActiveStep(program, stepId, dateStr) {
  const steps = { ...(program.steps || {}) };
  const prev = steps[stepId] || {};
  steps[stepId] = {
    ...prev,
    status: prev.status === 'done' ? 'done' : 'active',
    startedOn: prev.startedOn || dateStr,
  };
  return { ...program, activeStepId: stepId, steps };
}

export function advanceStep(program, dateStr) {
  const order = program.order || [];
  const steps = { ...(program.steps || {}) };
  const currentId = program.activeStepId;
  if (currentId) {
    steps[currentId] = { ...(steps[currentId] || {}), status: 'done', completedOn: dateStr };
  }
  const idx = order.indexOf(currentId);
  // Next un-done step after the current one, else the first non-done step anywhere.
  let nextId = null;
  for (let i = idx + 1; i < order.length; i++) {
    if (steps[order[i]]?.status !== 'done') { nextId = order[i]; break; }
  }
  if (!nextId) {
    nextId = order.find(id => steps[id]?.status !== 'done') || null;
  }
  let program2 = { ...program, activeStepId: nextId, steps };
  if (nextId) program2 = setActiveStep(program2, nextId, dateStr);
  return program2;
}

export function addStepToProgram(program, stepId) {
  if (!STEP_BY_ID[stepId]) return program;
  if ((program.order || []).includes(stepId)) return program;
  return { ...program, order: [...(program.order || []), stepId] };
}

export function removeStepFromProgram(program, stepId) {
  const order = (program.order || []).filter(id => id !== stepId);
  let activeStepId = program.activeStepId;
  if (activeStepId === stepId) activeStepId = order[0] || null;
  return { ...program, order, activeStepId };
}

export function setStepOverride(program, stepId, overrides) {
  const steps = { ...(program.steps || {}) };
  const prev = steps[stepId] || {};
  steps[stepId] = { ...prev, overrides: { ...(prev.overrides || {}), ...overrides } };
  return { ...program, steps };
}

// Progress summary for the header ("Step 5 of 15", "day 2").
export function getProgramProgress(journal) {
  const order = journal?.program?.order || [];
  const steps = journal?.program?.steps || {};
  const activeId = journal?.program?.activeStepId;
  const doneCount = order.filter(id => steps[id]?.status === 'done').length;
  const position = activeId ? order.indexOf(activeId) + 1 : doneCount;
  return { total: order.length, doneCount, position: position > 0 ? position : doneCount };
}

// ── Daily entries ──────────────────────────────────────────

export function isEntryMeaningful(entry) {
  if (!entry || typeof entry !== 'object') return false;
  if (entry.practiced) return true;
  if (typeof entry.mood === 'number') return true;
  if (entry.reflection && entry.reflection.trim && entry.reflection.trim() !== '') return true;
  if (entry.stepData && Object.keys(entry.stepData).length > 0) {
    // stepData is meaningful only if it has a non-empty value
    const vals = Object.values(entry.stepData);
    if (vals.some(v => (Array.isArray(v) ? v.some(x => x && String(x).trim()) : v))) return true;
  }
  return false;
}

// Consecutive days (ending today, or yesterday if today isn't logged yet) that
// have a meaningful entry.
export function computeJournalStreak(entries, todayStr) {
  if (!entries) return 0;
  let cursor = parseISO(todayStr);
  if (!isEntryMeaningful(entries[todayStr])) {
    cursor = subDays(cursor, 1);
  }
  let streak = 0;
  // Safety bound: no journal streak realistically exceeds a few years.
  for (let i = 0; i < 3660; i++) {
    const key = format(cursor, 'yyyy-MM-dd');
    if (isEntryMeaningful(entries[key])) {
      streak++;
      cursor = subDays(cursor, 1);
    } else {
      break;
    }
  }
  return streak;
}

function toDateStr(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value) ? null : format(value, 'yyyy-MM-dd');
  if (typeof value === 'string') return value.slice(0, 10);
  return null;
}

// Tasks closed on `dateStr` + focus sessions that day. Source of the
// "suggestions from tasks closed" list.
export function extractWinsForDate(treeData, logs, dateStr) {
  const completedTasks = [];
  const walk = (nodes) => {
    for (const node of nodes || []) {
      const text = (node.text || '').trim();
      if (text) {
        if (!node.recurrence && node.isCompleted && node.completionDate === dateStr) {
          completedTasks.push({ taskId: node.id, text });
        } else if (node.recurrence && Array.isArray(node.completedOccurrences) && node.completedOccurrences.includes(dateStr)) {
          completedTasks.push({ taskId: node.id, text, recurring: true });
        }
      }
      if (node.children) walk(node.children);
    }
  };
  walk(treeData);

  const focusSessions = (logs || [])
    .filter(l => toDateStr(l.startTime) === dateStr)
    .map(l => ({ id: l.id, taskId: l.taskId || null, text: l.taskText || 'Focus session' }));

  return { completedTasks, focusSessions };
}

// ── Heatmap ────────────────────────────────────────────────

// Last `days` days (default 90) of journaling activity for the consistency grid.
export function buildHeatmap(entries, todayStr, days = 90) {
  const end = parseISO(todayStr);
  const cells = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(end, i);
    const key = format(date, 'yyyy-MM-dd');
    cells.push({ date: key, logged: isEntryMeaningful(entries?.[key]), dayOfWeek: date.getDay() });
  }
  return cells;
}

// ── Merge (offline / multi-device reconciliation) ──────────

function newer(a, b) {
  return (a || '') >= (b || '') ? a : b;
}

// Merge two journals per-key: entries by date (newer updatedAt wins), program
// taken whole from whichever journal was written more recently. Local-only
// entries are always preserved.
export function mergeChangeJournal(local, remote) {
  if (!remote) return local || createDefaultJournal();
  if (!local) return remote;
  const a = normalizeJournal(local);
  const b = normalizeJournal(remote);

  const entries = { ...a.entries };
  for (const [date, entry] of Object.entries(b.entries || {})) {
    const cur = entries[date];
    if (!cur || (entry.updatedAt || '') > (cur.updatedAt || '')) {
      entries[date] = entry;
    }
  }

  const program = (b.updatedAt || '') > (a.updatedAt || '') ? b.program : a.program;

  return {
    version: JOURNAL_VERSION,
    updatedAt: newer(a.updatedAt, b.updatedAt),
    program,
    entries,
  };
}
