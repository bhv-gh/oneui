import { getUserHash } from './userHash';

const PENDING_OPS_KEY = 'flow-pending-ops';
const LAST_SYNCED_KEY = 'flow-last-synced-at';

function scopedKey(prefix, key) {
  const hash = getUserHash();
  const scope = hash ? hash.slice(0, 12) : 'anon';
  return `${prefix}${scope}-${key}`;
}

// ── Cache (JSON localStorage wrapper) ──────────────────────

export function saveCache(key, data) {
  try {
    localStorage.setItem(scopedKey('flow-cache-', key), JSON.stringify(data));
  } catch (err) {
    console.error('saveCache failed:', err);
  }
}

export function loadCache(key) {
  try {
    const raw = localStorage.getItem(scopedKey('flow-cache-', key));
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('loadCache failed:', err);
    return null;
  }
}

// ── Dirty tracking ─────────────────────────────────────────

export function markDirty(key) {
  localStorage.setItem(scopedKey('flow-dirty-', key), '1');
}

export function clearDirty(key) {
  localStorage.removeItem(scopedKey('flow-dirty-', key));
}

export function isDirty(key) {
  return localStorage.getItem(scopedKey('flow-dirty-', key)) === '1';
}

// ── Pending operations queue ───────────────────────────────

export function enqueuePendingOp(op) {
  try {
    const ops = getPendingOps();
    ops.push(op);
    localStorage.setItem(scopedKey('flow-', PENDING_OPS_KEY), JSON.stringify(ops));
  } catch (err) {
    console.error('enqueuePendingOp failed:', err);
  }
}

export function getPendingOps() {
  try {
    const raw = localStorage.getItem(scopedKey('flow-', PENDING_OPS_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearPendingOps() {
  localStorage.removeItem(scopedKey('flow-', PENDING_OPS_KEY));
}

export function savePendingOps(ops) {
  try {
    if (ops.length === 0) {
      localStorage.removeItem(scopedKey('flow-', PENDING_OPS_KEY));
    } else {
      localStorage.setItem(scopedKey('flow-', PENDING_OPS_KEY), JSON.stringify(ops));
    }
  } catch (err) {
    console.error('savePendingOps failed:', err);
  }
}

// ── Last sync timestamp ────────────────────────────────────

export function setLastSyncedAt(timestamp) {
  localStorage.setItem(scopedKey('flow-', LAST_SYNCED_KEY), timestamp || new Date().toISOString());
}

export function getLastSyncedAt() {
  return localStorage.getItem(scopedKey('flow-', LAST_SYNCED_KEY));
}
