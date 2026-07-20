// The 24 methods from the Leuchtturm1917 Change Journal ("24 steps to boost
// productivity"), adapted as editable seed data. The book's verbatim wording is
// proprietary, so these are faithful paraphrases — every field can be overridden
// in-app (stored in change_journal.program.steps[id].overrides), so you can paste
// the exact text later without any code change.
//
// `type` drives the step-specific daily input in the current-step card:
//   'checkin'  — just the "practiced today?" toggle + reflection (default)
//   'counter'  — a numeric tap-counter toward a daily target (e.g. Water)
//   'list'     — a few short text lines (e.g. Gratitude)
//   'focus'    — auto-reads today's focus sessions from focus_log (Pomodoro)

export const CHANGE_STEPS = [
  {
    id: 'goals',
    title: 'Goals',
    subtitle: 'Set actionable targets',
    method:
      'Turn vague wishes into concrete, actionable goals. Write down what you want, why it matters, and the first small step. Make each goal specific and measurable so you know when you have reached it.',
    prompt: 'What is one goal that matters most right now, and the very next action toward it?',
    category: 'Direction',
    type: 'checkin',
    defaultDurationDays: 5,
  },
  {
    id: 'eisenhower',
    title: 'Eisenhower Principle',
    subtitle: 'Urgent vs. important',
    method:
      'Sort tasks by urgency and importance. Do the important-and-urgent now, schedule the important-but-not-urgent, delegate the urgent-but-not-important, and drop the rest. Spend more time in the "important, not urgent" quadrant.',
    prompt: 'Which task today is important but not urgent — and are you protecting time for it?',
    category: 'Prioritizing',
    type: 'checkin',
    defaultDurationDays: 5,
  },
  {
    id: 'essentialism',
    title: 'Essentialism',
    subtitle: 'Only what truly matters',
    method:
      'Less but better. Identify the vital few tasks that create most of the value and deliberately let go of the trivial many. Say a wholehearted yes to what matters, and a clean no to the rest.',
    prompt: 'If you could only finish one thing today, what would it be?',
    category: 'Prioritizing',
    type: 'checkin',
    defaultDurationDays: 5,
  },
  {
    id: 'pareto',
    title: 'Pareto Principle (80/20)',
    subtitle: 'The vital few',
    method:
      'Roughly 80% of results come from 20% of the effort. Find the high-leverage 20% of your tasks and give them your best energy before anything else.',
    prompt: 'Which 20% of today’s work will produce most of the outcome?',
    category: 'Prioritizing',
    type: 'checkin',
    defaultDurationDays: 5,
  },
  {
    id: 'single-tasking',
    title: 'Single-Tasking',
    subtitle: 'One thing at a time',
    method:
      'Multitasking is task-switching in disguise, and it costs focus. Choose one task, remove distractions, and stay with it until it is done or you take a deliberate break.',
    prompt: 'What one task will you give your undivided attention to next?',
    category: 'Focus',
    type: 'checkin',
    defaultDurationDays: 5,
  },
  {
    id: 'pomodoro',
    title: 'Pomodoro Technique',
    subtitle: 'Focused time blocks',
    method:
      'Work in focused intervals (classically 25 minutes) followed by a short break. After several rounds, take a longer break. Each interval is a promise to protect your attention.',
    prompt: 'How did your focus sessions go today? What pulled you off track?',
    category: 'Focus',
    type: 'focus',
    defaultDurationDays: 7,
  },
  {
    id: 'habits',
    title: 'Habits',
    subtitle: 'Build new routines',
    method:
      'Behaviour change sticks through small, repeated actions tied to a cue. Make the good habit obvious, easy and satisfying — and let recurring tasks carry it day to day.',
    prompt: 'Which habit are you building, and did you show up for it today?',
    category: 'Consistency',
    type: 'checkin',
    defaultDurationDays: 14,
  },
  {
    id: 'marginal-gains',
    title: 'Marginal Gains',
    subtitle: 'Improve by 1% a day',
    method:
      'Small improvements compound. Aim to get one percent better at something each day; the gains are invisible at first and unmistakable over time.',
    prompt: 'What is one small thing you improved today?',
    category: 'Consistency',
    type: 'checkin',
    defaultDurationDays: 7,
  },
  {
    id: 'saying-no',
    title: 'Saying "No"',
    subtitle: 'Set boundaries',
    method:
      'Every yes is a no to something else. Practise declining requests that do not serve your priorities — politely, clearly, and without over-explaining.',
    prompt: 'What did you say no to today (or wish you had)?',
    category: 'Boundaries',
    type: 'checkin',
    defaultDurationDays: 5,
  },
  {
    id: 'clarity',
    title: 'Clarity',
    subtitle: 'Clear mental clutter',
    method:
      'A cluttered mind cannot focus. Do a brain-dump of everything on your mind, then decide for each item: do it, defer it, delegate it, or drop it.',
    prompt: 'What is taking up space in your head that you can offload right now?',
    category: 'Focus',
    type: 'checkin',
    defaultDurationDays: 5,
  },
  {
    id: 'digital-detox',
    title: 'Digital Detox',
    subtitle: 'Unplug from screens',
    method:
      'Constant notifications fragment attention. Carve out screen-free time each day, silence non-essential alerts, and notice how it feels to be unreachable for a while.',
    prompt: 'When were you off screens today, and what did you do instead?',
    category: 'Wellbeing',
    type: 'checkin',
    defaultDurationDays: 5,
  },
  {
    id: 'water',
    title: 'Water',
    subtitle: 'Stay hydrated',
    method:
      'Hydration supports energy and focus. Track your intake through the day and aim for a steady, consistent target rather than catching up all at once.',
    prompt: 'How is your energy today — and did hydration play a part?',
    category: 'Wellbeing',
    type: 'counter',
    defaultDurationDays: 7,
    config: { target: 8, unit: 'glasses' },
  },
  {
    id: 'gratitude',
    title: 'Gratitude',
    subtitle: 'Appreciate what you have',
    method:
      'Naming what you are grateful for shifts attention toward the good. Each day, write down a few specific things — small and ordinary counts.',
    prompt: 'List a few things you are grateful for today.',
    category: 'Wellbeing',
    type: 'list',
    defaultDurationDays: 7,
    config: { lines: 3, placeholder: 'I’m grateful for…' },
  },
  {
    id: 'rewards',
    title: 'Rewards',
    subtitle: 'Incentivize progress',
    method:
      'Positive reinforcement makes change enjoyable. Decide on a small, meaningful reward for hitting a goal — and actually give it to yourself when you do.',
    prompt: 'What progress did you make today, and how will you reward it?',
    category: 'Motivation',
    type: 'checkin',
    defaultDurationDays: 5,
  },
  {
    id: 'journaling',
    title: 'Journaling',
    subtitle: 'Daily reflection',
    method:
      'A few minutes of honest reflection each day builds self-awareness and momentum. Note what went well, what did not, and what you learned.',
    prompt: 'How did today go? What went well and what would you do differently?',
    category: 'Reflection',
    type: 'checkin',
    defaultDurationDays: 7,
  },

  // ── Library (not in the default program; add any with one tap) ──
  {
    id: 'pitch-yourself',
    title: 'Pitch Yourself',
    subtitle: 'Your brand and strengths',
    method:
      'Be able to describe who you are and what you offer in a sentence. Craft a short, confident pitch of your strengths and value.',
    prompt: 'How would you describe your strengths in one sentence?',
    category: 'Growth',
    type: 'checkin',
    defaultDurationDays: 3,
  },
  {
    id: 'compliments',
    title: 'Compliments',
    subtitle: 'Give and receive praise',
    method:
      'Genuine praise strengthens relationships and morale. Offer a sincere compliment to someone, and practise accepting one graciously.',
    prompt: 'Who did you (or could you) genuinely compliment today?',
    category: 'Relationships',
    type: 'checkin',
    defaultDurationDays: 3,
  },
  {
    id: 'reading',
    title: 'Reading',
    subtitle: 'Cultivate a reading habit',
    method:
      'Reading a little every day feeds ideas and focus. Keep a book within reach and read a few pages, however busy the day.',
    prompt: 'What did you read today, and what stuck with you?',
    category: 'Growth',
    type: 'checkin',
    defaultDurationDays: 7,
  },
  {
    id: 'decluttering',
    title: 'Decluttering',
    subtitle: 'Tidy your spaces',
    method:
      'Physical order supports mental order. Clear one small area at a time — a desk, a drawer, a folder — and keep only what serves you.',
    prompt: 'What one space did you (or will you) declutter today?',
    category: 'Environment',
    type: 'checkin',
    defaultDurationDays: 5,
  },
  {
    id: 'comfort-zone',
    title: 'Comfort Zone',
    subtitle: 'Push your boundaries',
    method:
      'Growth lives just past the familiar. Do one thing that feels slightly uncomfortable each day and watch your range expand.',
    prompt: 'What did you do today that stretched you a little?',
    category: 'Growth',
    type: 'checkin',
    defaultDurationDays: 5,
  },
  {
    id: 'strengths',
    title: 'Strengths',
    subtitle: 'Use what you are good at',
    method:
      'You do your best work from your strengths. Identify what energises you and find ways to spend more of your day there.',
    prompt: 'When did you use a genuine strength today?',
    category: 'Growth',
    type: 'checkin',
    defaultDurationDays: 5,
  },
  {
    id: 'circle-trick',
    title: 'The Circle Trick',
    subtitle: 'Control vs. concern',
    method:
      'Draw two circles: what you can control, and what you only worry about. Invest energy in the first circle and release the second.',
    prompt: 'What are you worrying about that is actually outside your control?',
    category: 'Wellbeing',
    type: 'checkin',
    defaultDurationDays: 3,
  },
  {
    id: 'emails',
    title: 'E-mails',
    subtitle: 'Tame the inbox',
    method:
      'Reactive inboxes eat the day. Batch email into set windows, process each message once (do, delegate, defer, delete), and keep the inbox near zero.',
    prompt: 'How did you handle email today — reactively or in batches?',
    category: 'Focus',
    type: 'checkin',
    defaultDurationDays: 5,
  },
  {
    id: 'saving',
    title: 'Saving',
    subtitle: 'Track and budget',
    method:
      'Small, consistent saving builds security. Track what you spend, decide on a saving target, and pay it first.',
    prompt: 'What did you spend and save today — any surprises?',
    category: 'Finance',
    type: 'checkin',
    defaultDurationDays: 7,
  },
];

// Default program: the 15 that fit a task/focus workflow, in order.
export const DEFAULT_PROGRAM_ORDER = [
  'goals',
  'eisenhower',
  'essentialism',
  'pareto',
  'single-tasking',
  'pomodoro',
  'habits',
  'marginal-gains',
  'saying-no',
  'clarity',
  'digital-detox',
  'water',
  'gratitude',
  'rewards',
  'journaling',
];

export const STEP_BY_ID = CHANGE_STEPS.reduce((acc, step) => {
  acc[step.id] = step;
  return acc;
}, {});
