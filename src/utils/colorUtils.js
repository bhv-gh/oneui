const PALETTE = [
  { bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.3)', text: '#f472b6', dot: '#ec4899' },  // pink
  { bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.3)',  text: '#fb923c', dot: '#f97316' },  // orange
  { bg: 'rgba(250,204,21,0.12)',  border: 'rgba(250,204,21,0.3)',  text: '#eab308', dot: '#eab308' },  // yellow
  { bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.3)',  text: '#4ade80', dot: '#22c55e' },  // green
  { bg: 'rgba(45,212,191,0.12)',  border: 'rgba(45,212,191,0.3)',  text: '#2dd4bf', dot: '#14b8a6' },  // teal
  { bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.3)',  text: '#38bdf8', dot: '#0ea5e9' },  // sky
  { bg: 'rgba(129,140,248,0.12)', border: 'rgba(129,140,248,0.3)', text: '#818cf8', dot: '#6366f1' },  // indigo
  { bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.3)', text: '#c084fc', dot: '#a855f7' },  // purple
  { bg: 'rgba(251,113,133,0.12)', border: 'rgba(251,113,133,0.3)', text: '#fb7185', dot: '#f43f5e' },  // rose
  { bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)',  text: '#34d399', dot: '#10b981' },  // emerald
];

const PALETTE_LIGHT = [
  { bg: 'rgba(236,72,153,0.08)',  border: 'rgba(236,72,153,0.25)', text: '#db2777', dot: '#ec4899' },
  { bg: 'rgba(234,88,12,0.08)',   border: 'rgba(234,88,12,0.25)',  text: '#c2410c', dot: '#f97316' },
  { bg: 'rgba(202,138,4,0.08)',   border: 'rgba(202,138,4,0.25)',  text: '#a16207', dot: '#eab308' },
  { bg: 'rgba(22,163,74,0.08)',   border: 'rgba(22,163,74,0.25)',  text: '#15803d', dot: '#22c55e' },
  { bg: 'rgba(13,148,136,0.08)',  border: 'rgba(13,148,136,0.25)', text: '#0f766e', dot: '#14b8a6' },
  { bg: 'rgba(2,132,199,0.08)',   border: 'rgba(2,132,199,0.25)',  text: '#0369a1', dot: '#0ea5e9' },
  { bg: 'rgba(79,70,229,0.08)',   border: 'rgba(79,70,229,0.25)',  text: '#4338ca', dot: '#6366f1' },
  { bg: 'rgba(147,51,234,0.08)',  border: 'rgba(147,51,234,0.25)', text: '#7e22ce', dot: '#a855f7' },
  { bg: 'rgba(225,29,72,0.08)',   border: 'rgba(225,29,72,0.25)',  text: '#be123c', dot: '#f43f5e' },
  { bg: 'rgba(5,150,105,0.08)',   border: 'rgba(5,150,105,0.25)',  text: '#047857', dot: '#10b981' },
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getColorForString(str, isLightTheme = false) {
  const palette = isLightTheme ? PALETTE_LIGHT : PALETTE;
  if (!str) return palette[0];
  return palette[hashString(str) % palette.length];
}

export function getColorIndex(str) {
  if (!str) return 0;
  return hashString(str) % PALETTE.length;
}

export { PALETTE, PALETTE_LIGHT };
