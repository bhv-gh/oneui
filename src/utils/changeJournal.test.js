import {
  createDefaultJournal,
  normalizeJournal,
  getEffectiveStep,
  setActiveStep,
  advanceStep,
  addStepToProgram,
  removeStepFromProgram,
  setStepOverride,
  getProgramProgress,
  isEntryMeaningful,
  computeJournalStreak,
  extractWinsForDate,
  buildHeatmap,
  mergeChangeJournal,
} from './changeJournal';
import { DEFAULT_PROGRAM_ORDER } from '../data/changeSteps';

describe('createDefaultJournal / normalizeJournal', () => {
  test('default journal starts on the first program step', () => {
    const j = createDefaultJournal();
    expect(j.program.activeStepId).toBe(DEFAULT_PROGRAM_ORDER[0]);
    expect(j.program.order).toEqual(DEFAULT_PROGRAM_ORDER);
    expect(j.entries).toEqual({});
  });

  test('normalize repairs malformed input', () => {
    expect(normalizeJournal(null).program.order.length).toBeGreaterThan(0);
    expect(normalizeJournal('garbage').entries).toEqual({});
    const bad = { program: { order: ['goals', 'not-a-real-step'], activeStepId: 'nope' } };
    const n = normalizeJournal(bad);
    expect(n.program.order).toEqual(['goals']); // unknown ids dropped
    expect(n.program.activeStepId).toBe('goals'); // invalid active falls back to first
  });
});

describe('getEffectiveStep', () => {
  test('returns seed content when no overrides', () => {
    const j = createDefaultJournal();
    expect(getEffectiveStep(j, 'goals').title).toBe('Goals');
  });

  test('overrides win over seed', () => {
    const j = createDefaultJournal();
    j.program.steps = { goals: { overrides: { title: 'My Goals', prompt: 'Custom?' } } };
    const step = getEffectiveStep(j, 'goals');
    expect(step.title).toBe('My Goals');
    expect(step.prompt).toBe('Custom?');
    expect(step.method).toContain('actionable'); // untouched fields still from seed
  });

  test('returns null for unknown step', () => {
    expect(getEffectiveStep(createDefaultJournal(), 'xyz')).toBeNull();
  });

  test('includes mood presets, overridable per key', () => {
    const j = createDefaultJournal();
    const water = getEffectiveStep(j, 'water');
    expect(Object.keys(water.presets)).toEqual(
      expect.arrayContaining(['best', 'good', 'decent', 'bad', 'worst'])
    );
    expect(water.presets.best).toMatch(/hydration|target|drank/i);

    j.program.steps = { water: { overrides: { presets: { best: 'Custom best' } } } };
    const edited = getEffectiveStep(j, 'water');
    expect(edited.presets.best).toBe('Custom best');       // override wins
    expect(edited.presets.worst.length).toBeGreaterThan(0); // untouched keys keep defaults
  });
});

describe('program transitions', () => {
  test('setActiveStep marks step active and records start date', () => {
    const p = setActiveStep(createDefaultJournal().program, 'pomodoro', '2026-07-17');
    expect(p.activeStepId).toBe('pomodoro');
    expect(p.steps.pomodoro.status).toBe('active');
    expect(p.steps.pomodoro.startedOn).toBe('2026-07-17');
  });

  test('advanceStep completes current and activates the next undone step', () => {
    const p0 = createDefaultJournal().program; // active = goals
    const p1 = advanceStep(p0, '2026-07-17');
    expect(p1.steps.goals.status).toBe('done');
    expect(p1.steps.goals.completedOn).toBe('2026-07-17');
    expect(p1.activeStepId).toBe(DEFAULT_PROGRAM_ORDER[1]);
    expect(p1.steps[DEFAULT_PROGRAM_ORDER[1]].status).toBe('active');
  });

  test('advanceStep at the end leaves no active step when all done', () => {
    let p = createDefaultJournal().program;
    for (let i = 0; i < DEFAULT_PROGRAM_ORDER.length + 2; i++) {
      p = advanceStep(p, '2026-07-17');
    }
    expect(p.activeStepId).toBeNull();
    expect(DEFAULT_PROGRAM_ORDER.every(id => p.steps[id].status === 'done')).toBe(true);
  });

  test('add / remove step from program', () => {
    let p = createDefaultJournal().program;
    p = addStepToProgram(p, 'saving');
    expect(p.order).toContain('saving');
    // no-op on duplicate / unknown
    expect(addStepToProgram(p, 'saving').order.filter(id => id === 'saving').length).toBe(1);
    expect(addStepToProgram(p, 'nope').order).not.toContain('nope');

    p = removeStepFromProgram(p, 'goals'); // goals was active
    expect(p.order).not.toContain('goals');
    expect(p.activeStepId).toBe(p.order[0]);
  });

  test('setStepOverride merges overrides', () => {
    let p = createDefaultJournal().program;
    p = setStepOverride(p, 'goals', { title: 'A' });
    p = setStepOverride(p, 'goals', { prompt: 'B' });
    expect(p.steps.goals.overrides).toEqual({ title: 'A', prompt: 'B' });
  });

  test('getProgramProgress counts done and position', () => {
    let p = createDefaultJournal();
    expect(getProgramProgress(p)).toEqual({ total: 15, doneCount: 0, position: 1 });
    p = { ...p, program: advanceStep(p.program, '2026-07-17') };
    const prog = getProgramProgress(p);
    expect(prog.doneCount).toBe(1);
    expect(prog.position).toBe(2);
  });
});

describe('isEntryMeaningful', () => {
  test('detects meaningful vs empty entries', () => {
    expect(isEntryMeaningful(null)).toBe(false);
    expect(isEntryMeaningful({})).toBe(false);
    expect(isEntryMeaningful({ reflection: '   ' })).toBe(false);
    expect(isEntryMeaningful({ practiced: true })).toBe(true);
    expect(isEntryMeaningful({ mood: 3 })).toBe(true);
    expect(isEntryMeaningful({ reflection: 'good day' })).toBe(true);
    expect(isEntryMeaningful({ stepData: { glasses: 5 } })).toBe(true);
    expect(isEntryMeaningful({ stepData: { gratitude: ['', ' '] } })).toBe(false);
    expect(isEntryMeaningful({ stepData: { gratitude: ['coffee'] } })).toBe(true);
  });
});

describe('computeJournalStreak', () => {
  const entries = {
    '2026-07-17': { practiced: true },
    '2026-07-16': { reflection: 'x' },
    '2026-07-15': { mood: 4 },
    '2026-07-13': { practiced: true }, // gap on the 14th
  };

  test('counts consecutive days ending today', () => {
    expect(computeJournalStreak(entries, '2026-07-17')).toBe(3);
  });

  test('streak from yesterday when today empty', () => {
    // today (18th) empty -> start from 17th: 17,16,15 = 3
    expect(computeJournalStreak(entries, '2026-07-18')).toBe(3);
  });

  test('gap breaks the streak', () => {
    // from 15th back: 15 yes, 14 no -> 1
    expect(computeJournalStreak(entries, '2026-07-15')).toBe(1);
  });

  test('empty entries -> 0', () => {
    expect(computeJournalStreak({}, '2026-07-17')).toBe(0);
  });
});

describe('extractWinsForDate', () => {
  const tree = [
    { id: 'a', text: 'Ship feature', isCompleted: true, completionDate: '2026-07-17' },
    { id: 'b', text: 'Old task', isCompleted: true, completionDate: '2026-07-10' },
    {
      id: 'c', text: 'Parent', children: [
        { id: 'c1', text: 'Subtask done', isCompleted: true, completionDate: '2026-07-17' },
        { id: 'c2', text: '   ', isCompleted: true, completionDate: '2026-07-17' }, // blank text ignored
      ],
    },
    { id: 'r', text: 'Meditate', recurrence: { frequency: 'daily', interval: 1 }, completedOccurrences: ['2026-07-17', '2026-07-16'] },
  ];
  const logs = [
    { id: 'l1', taskId: 'a', taskText: 'Ship feature', startTime: new Date('2026-07-17T09:00:00') },
    { id: 'l2', taskId: null, taskText: 'Deep work', startTime: '2026-07-17T11:00:00Z' },
    { id: 'l3', taskId: 'x', taskText: 'Yesterday', startTime: new Date('2026-07-16T09:00:00') },
  ];

  test('collects completed tasks (incl. recurring occurrences) for the date', () => {
    const { completedTasks } = extractWinsForDate(tree, logs, '2026-07-17');
    const ids = completedTasks.map(t => t.taskId).sort();
    expect(ids).toEqual(['a', 'c1', 'r']);
    expect(completedTasks.find(t => t.taskId === 'r').recurring).toBe(true);
  });

  test('collects focus sessions for the date (Date or ISO string)', () => {
    const { focusSessions } = extractWinsForDate(tree, logs, '2026-07-17');
    expect(focusSessions.map(f => f.id).sort()).toEqual(['l1', 'l2']);
  });

  test('empty inputs are safe', () => {
    expect(extractWinsForDate(null, null, '2026-07-17')).toEqual({ completedTasks: [], focusSessions: [] });
  });
});

describe('buildHeatmap', () => {
  test('produces N cells ending today, logged flag set correctly', () => {
    const entries = { '2026-07-17': { practiced: true }, '2026-07-10': { mood: 2 } };
    const cells = buildHeatmap(entries, '2026-07-17', 30);
    expect(cells).toHaveLength(30);
    expect(cells[cells.length - 1]).toMatchObject({ date: '2026-07-17', logged: true });
    expect(cells.find(c => c.date === '2026-07-10').logged).toBe(true);
    expect(cells.find(c => c.date === '2026-07-11').logged).toBe(false);
  });
});

describe('mergeChangeJournal', () => {
  test('unions entries, newer updatedAt wins per date', () => {
    const local = {
      updatedAt: '2026-07-17T10:00:00Z',
      program: createDefaultJournal().program,
      entries: {
        '2026-07-17': { reflection: 'local', updatedAt: '2026-07-17T10:00:00Z' },
        '2026-07-16': { reflection: 'only-local', updatedAt: '2026-07-16T10:00:00Z' },
      },
    };
    const remote = {
      updatedAt: '2026-07-17T12:00:00Z',
      program: createDefaultJournal().program,
      entries: {
        '2026-07-17': { reflection: 'remote-newer', updatedAt: '2026-07-17T12:00:00Z' },
        '2026-07-15': { reflection: 'only-remote', updatedAt: '2026-07-15T10:00:00Z' },
      },
    };
    const merged = mergeChangeJournal(local, remote);
    expect(merged.entries['2026-07-17'].reflection).toBe('remote-newer');
    expect(merged.entries['2026-07-16'].reflection).toBe('only-local');
    expect(merged.entries['2026-07-15'].reflection).toBe('only-remote');
  });

  test('null-safe', () => {
    const j = createDefaultJournal();
    expect(mergeChangeJournal(null, j)).toBe(j);
    expect(mergeChangeJournal(j, null)).toBe(j);
  });
});
