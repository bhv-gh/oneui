export const PRIORITIES = [
  { id: 'none',   label: 'None',   icon: '○', sortOrder: 4 },
  { id: 'low',    label: 'Low',    icon: '◔', sortOrder: 3 },
  { id: 'medium', label: 'Medium', icon: '◑', sortOrder: 2 },
  { id: 'high',   label: 'High',   icon: '◕', sortOrder: 1 },
  { id: 'urgent', label: 'Urgent', icon: '●', sortOrder: 0 },
];

const COLORS_DARK = {
  none:   { dot: '#64748b', border: 'rgba(100,116,139,0.3)', bg: 'rgba(100,116,139,0.08)', text: '#94a3b8' },
  low:    { dot: '#38bdf8', border: 'rgba(56,189,248,0.3)',  bg: 'rgba(56,189,248,0.10)',  text: '#38bdf8' },
  medium: { dot: '#fbbf24', border: 'rgba(251,191,36,0.3)',  bg: 'rgba(251,191,36,0.10)',  text: '#fbbf24' },
  high:   { dot: '#fb923c', border: 'rgba(251,146,60,0.3)',  bg: 'rgba(251,146,60,0.10)',  text: '#fb923c' },
  urgent: { dot: '#f43f5e', border: 'rgba(244,63,94,0.35)',  bg: 'rgba(244,63,94,0.12)',   text: '#fb7185' },
};

const COLORS_LIGHT = {
  none:   { dot: '#94a3b8', border: 'rgba(148,163,184,0.3)', bg: 'rgba(148,163,184,0.08)', text: '#64748b' },
  low:    { dot: '#0ea5e9', border: 'rgba(14,165,233,0.25)', bg: 'rgba(14,165,233,0.08)',  text: '#0284c7' },
  medium: { dot: '#eab308', border: 'rgba(234,179,8,0.25)',  bg: 'rgba(234,179,8,0.08)',   text: '#a16207' },
  high:   { dot: '#f97316', border: 'rgba(249,115,22,0.25)', bg: 'rgba(249,115,22,0.08)',  text: '#c2410c' },
  urgent: { dot: '#ef4444', border: 'rgba(239,68,68,0.3)',   bg: 'rgba(239,68,68,0.08)',   text: '#dc2626' },
};

export function getPriorityColor(priority, isLightTheme = false) {
  const palette = isLightTheme ? COLORS_LIGHT : COLORS_DARK;
  return palette[priority] || palette.none;
}

export function getNextPriority(current) {
  const order = ['none', 'low', 'medium', 'high', 'urgent'];
  const idx = order.indexOf(current || 'none');
  return order[(idx + 1) % order.length];
}

export function getPriorityLabel(priority) {
  const p = PRIORITIES.find(p => p.id === priority);
  return p ? p.label : 'None';
}
