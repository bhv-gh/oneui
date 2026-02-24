const CACHE_PREFIX = 'flow-cache-';
const DIRTY_PREFIX = 'flow-dirty-';
const PENDING_OPS_KEY = 'flow-pending-ops';
const LAST_SYNCED_KEY = 'flow-last-synced-at';

// ── Cache (JSON localStorage wrapper) ──────────────────────

export function saveCache(key, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
  } catch (err) {
    console.error('saveCache failed:', err);
  }
}

export function loadCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('loadCache failed:', err);
    return null;
  }
}

// ── Dirty tracking ─────────────────────────────────────────

export function markDirty(key) {
  localStorage.setItem(DIRTY_PREFIX + key, '1');
}

export function clearDirty(key) {
  localStorage.removeItem(DIRTY_PREFIX + key);
}

export function isDirty(key) {
  return localStorage.getItem(DIRTY_PREFIX + key) === '1';
}

// ── Pending operations queue ───────────────────────────────

export function enqueuePendingOp(op) {
  try {
    const ops = getPendingOps();
    ops.push(op);
    localStorage.setItem(PENDING_OPS_KEY, JSON.stringify(ops));
  } catch (err) {
    console.error('enqueuePendingOp failed:', err);
  }
}

export function getPendingOps() {
  try {
    const raw = localStorage.getItem(PENDING_OPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearPendingOps() {
  localStorage.removeItem(PENDING_OPS_KEY);
}

export function savePendingOps(ops) {
  try {
    if (ops.length === 0) {
      localStorage.removeItem(PENDING_OPS_KEY);
    } else {
      localStorage.setItem(PENDING_OPS_KEY, JSON.stringify(ops));
    }
  } catch (err) {
    console.error('savePendingOps failed:', err);
  }
}

// ── Last sync timestamp ────────────────────────────────────

export function setLastSyncedAt(timestamp) {
  localStorage.setItem(LAST_SYNCED_KEY, timestamp || new Date().toISOString());
}

export function getLastSyncedAt() {
  return localStorage.getItem(LAST_SYNCED_KEY);
}
