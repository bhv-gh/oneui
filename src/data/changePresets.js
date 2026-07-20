// Per-step reflection presets, keyed by mood level (worst → best). Clicking a
// mood in the Change tab prefills the Reflection with the matching preset, which
// the user can then edit. All are overridable per step via the step editor
// (stored in change_journal.program.steps[id].overrides.presets).

// Mood value (1..5) → preset key.
export const MOOD_KEY = { 1: 'worst', 2: 'bad', 3: 'decent', 4: 'good', 5: 'best' };

// Fallback used for any step without specific presets (e.g. brand-new steps).
export const GENERIC_PRESETS = {
  best: 'A great day for this — it really clicked.',
  good: 'A good day; solid effort here.',
  decent: 'A decent day; some room to improve.',
  bad: 'A rough day for this one.',
  worst: 'A bad day — this slipped completely.',
};

export const STEP_PRESETS = {
  goals: {
    best: 'Crystal clear on my top goal and took a real step toward it.',
    good: 'Made progress on what matters, even if not everything.',
    decent: 'Touched my goal but got pulled in other directions.',
    bad: 'Lost sight of my goal and drifted into busywork.',
    worst: 'No connection to my goals today — just reacting.',
  },
  eisenhower: {
    best: 'Spent my time on important-not-urgent work, not just fires.',
    good: 'Mostly prioritized well; a couple of urgent detours.',
    decent: 'Some important work, but urgency ran the day.',
    bad: 'Firefighting all day — little that actually mattered.',
    worst: 'Everything felt urgent and nothing was important.',
  },
  essentialism: {
    best: 'Did less, but the right things — cut the noise.',
    good: 'Focused on the vital few for most of the day.',
    decent: 'Mixed the essential with a lot of trivial.',
    bad: 'Spread too thin across things that did not matter.',
    worst: 'Said yes to everything and finished nothing that counts.',
  },
  pareto: {
    best: 'Nailed the 20% that drives most of the results.',
    good: 'Gave the high-leverage work real attention.',
    decent: 'Some high-impact work, lots of low-impact filler.',
    bad: 'Busy with the trivial many, missed the vital few.',
    worst: 'All effort, no leverage — spun my wheels.',
  },
  'single-tasking': {
    best: 'One thing at a time, deep and undistracted.',
    good: 'Mostly single-tasked; a few slips.',
    decent: 'Switched tasks more than I would like.',
    bad: 'Constant task-switching, shallow focus.',
    worst: 'Scattered all day, never settled on anything.',
  },
  pomodoro: {
    best: 'Strong focus blocks with real breaks — in the zone.',
    good: 'Got solid focus sessions in.',
    decent: 'A couple of sessions, interrupted.',
    bad: 'Struggled to start or stay in a block.',
    worst: 'No real focused work happened today.',
  },
  habits: {
    best: 'Showed up for my habit without thinking — automatic.',
    good: 'Kept the habit going today.',
    decent: 'Did it, but it took willpower.',
    bad: 'Almost skipped; barely kept the chain.',
    worst: 'Broke the chain today.',
  },
  'marginal-gains': {
    best: 'Clearly 1% better at something today.',
    good: 'Made a small improvement worth noting.',
    decent: 'Tiny progress, hard to point to.',
    bad: 'Stood still — no improvement.',
    worst: 'Went backwards today.',
  },
  'saying-no': {
    best: 'Protected my priorities and said no cleanly.',
    good: 'Held a boundary or two.',
    decent: 'Said yes to some things I should have declined.',
    bad: 'Overcommitted again.',
    worst: 'Could not say no to anything — ran on others agendas.',
  },
  clarity: {
    best: 'Cleared my head — everything captured and sorted.',
    good: 'Did a brain-dump and felt lighter.',
    decent: 'Still some mental clutter hanging around.',
    bad: 'Head full and noisy all day.',
    worst: 'Overwhelmed and foggy — could not think straight.',
  },
  'digital-detox': {
    best: 'Real screen-free time; felt present.',
    good: 'Cut back on screens today.',
    decent: 'Some unplugging, but reached for the phone a lot.',
    bad: 'Too much screen time and scrolling.',
    worst: 'Glued to screens all day.',
  },
  water: {
    best: 'Hit my hydration target and felt sharp.',
    good: 'Drank well today.',
    decent: 'Okay hydration, could be better.',
    bad: 'Barely drank water today.',
    worst: 'Ran on caffeine — dehydrated and foggy.',
  },
  gratitude: {
    best: 'Genuinely grateful — noticed a lot of good.',
    good: 'Found a few things to appreciate.',
    decent: 'Managed some gratitude, felt a bit forced.',
    bad: 'Struggled to see the good today.',
    worst: 'Stuck in negativity, grateful for nothing.',
  },
  rewards: {
    best: 'Made progress and rewarded myself well.',
    good: 'Acknowledged a win today.',
    decent: 'Progress, but forgot to celebrate it.',
    bad: 'Worked hard, no reward or recognition.',
    worst: 'All grind, no reward — running on empty.',
  },
  journaling: {
    best: 'Honest, useful reflection — learned something.',
    good: 'Took a few minutes to reflect.',
    decent: 'Quick journal, a bit surface-level.',
    bad: 'Rushed it, did not really reflect.',
    worst: 'Skipped real reflection today.',
  },

  // ── Library steps ──
  'pitch-yourself': {
    best: 'Spoke about my strengths with real confidence.',
    good: 'Comfortable owning what I am good at.',
    decent: 'A bit unsure describing my value.',
    bad: 'Downplayed myself today.',
    worst: 'Could not articulate my worth at all.',
  },
  compliments: {
    best: 'Gave and received praise genuinely.',
    good: 'Offered a sincere compliment.',
    decent: 'Meant to, but barely acknowledged others.',
    bad: 'Missed chances to lift someone up.',
    worst: 'Cold and disconnected from people today.',
  },
  reading: {
    best: 'Read something that stuck with me.',
    good: 'Got a few good pages in.',
    decent: 'Read a little, distracted.',
    bad: 'Meant to read, did not.',
    worst: 'No reading, no input today.',
  },
  decluttering: {
    best: 'Cleared a space and it feels great.',
    good: 'Tidied one area today.',
    decent: 'Minor tidying, still cluttered.',
    bad: 'Let the mess pile up.',
    worst: 'Chaos everywhere — could not find anything.',
  },
  'comfort-zone': {
    best: 'Stretched myself and grew from it.',
    good: 'Did one uncomfortable thing.',
    decent: 'Played it mostly safe.',
    bad: 'Avoided anything challenging.',
    worst: 'Hid in my comfort zone all day.',
  },
  strengths: {
    best: 'Spent the day in my strengths — energized.',
    good: 'Used a real strength today.',
    decent: 'Some strength work, lots outside it.',
    bad: 'Grinding on weaknesses, drained.',
    worst: 'Nothing today played to what I am good at.',
  },
  'circle-trick': {
    best: 'Focused only on what I control; let go of the rest.',
    good: 'Mostly stayed in my circle of control.',
    decent: 'Worried about some things I cannot change.',
    bad: 'Anxious over things outside my control.',
    worst: 'Consumed by worry I can do nothing about.',
  },
  emails: {
    best: 'Inbox handled in batches, near zero.',
    good: 'Kept email under control.',
    decent: 'Reactive on email, but survived.',
    bad: 'Inbox ran my day.',
    worst: 'Drowned in email, achieved nothing else.',
  },
  saving: {
    best: 'Spent intentionally and saved toward my goal.',
    good: 'Mindful with money today.',
    decent: 'Okay, a couple of loose spends.',
    bad: 'Overspent without thinking.',
    worst: 'Money leaked all day, no control.',
  },
};
