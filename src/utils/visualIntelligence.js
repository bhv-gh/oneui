// On-device visual-intelligence helpers for focus detection.
//
// Ported from SyncDoro's BlazeFace presence detection. All inference and
// classification run locally in the browser — nothing leaves the device.
// This module holds the pure, framework-agnostic pieces: feature extraction,
// classification, calibration training, and calibration persistence.

// Presence states used across the detection pipeline + UI.
export const PRESENCE_LABELS = {
  focused: '🟢 Focused',
  looking_away: '🟡 Looking down',
  away: '🔴 Away',
  unknown: '⚪ —',
};

export const PRESENCE_COLORS = {
  focused: '#34d399',
  looking_away: '#fbbf24',
  away: '#ff6b6b',
  unknown: null,
};

// Classification thresholds (see classifyFace).
const YAW_FRONTAL = 0.22; // |nose offset| below this = roughly facing forward
const DOWN_FACTOR = 0.78; // pitch below baseline*this = looking down
const FACE_MIN_W = 0.1; // min face width (fraction of frame) to count as present

const CAL_STORAGE_KEY = 'oneui-focus-calibration';

// Scale / rotation / translation-invariant feature vector from face landmarks.
// BlazeFace landmarks: [rightEye, leftEye, nose, mouth, rightEar, leftEar].
export function faceFeatures(f) {
  const lm = f.landmarks;
  const rEye = lm[0];
  const lEye = lm[1];
  const cx = (rEye[0] + lEye[0]) / 2;
  const cy = (rEye[1] + lEye[1]) / 2;
  const dx = lEye[0] - rEye[0];
  const dy = lEye[1] - rEye[1];
  const scale = Math.hypot(dx, dy) || 1;
  const ang = Math.atan2(dy, dx);
  const cos = Math.cos(-ang);
  const sin = Math.sin(-ang);
  const rel = (p) => {
    const x = (p[0] - cx) / scale;
    const y = (p[1] - cy) / scale;
    return [x * cos - y * sin, x * sin + y * cos]; // de-rotate so head roll doesn't matter
  };
  const boxH = Math.abs(f.bottomRight[1] - f.topLeft[1]) || 1;
  const boxW = Math.abs(f.bottomRight[0] - f.topLeft[0]) || 1;
  const out = [];
  [lm[2], lm[3], lm[4], lm[5]].forEach((p) => {
    const r = rel(p);
    out.push(r[0], r[1]);
  });
  out.push((cy - f.topLeft[1]) / boxH); // eye height within box (pitch cue)
  out.push(boxH / boxW); // aspect ratio (foreshortening cue)
  return out;
}

// Nearest-centroid classifier over a personalized calibration.
function classifyByTraining(feat, cal) {
  const norm = feat.map((v, i) => (v - cal.mean[i]) / (cal.std[i] || 1));
  let best = null;
  let bestD = Infinity;
  for (const cls in cal.classes) {
    const c = cal.classes[cls];
    let d = 0;
    for (let i = 0; i < c.length; i++) {
      const diff = norm[i] - c[i];
      d += diff * diff;
    }
    if (d < bestD) {
      bestD = d;
      best = cls;
    }
  }
  return best;
}

// Classify a single detected face into focused / looking_away / away.
//
// `ctx` carries the mutable per-session pitch baseline used by the fallback
// heuristic: { pitchBaseline }. It is read and updated in place so the caller
// can keep it across frames. `calibration` (optional) is a trained classifier.
export function classifyFace(f, frameWidth, ctx, calibration) {
  try {
    const faceW = Math.abs(f.bottomRight[0] - f.topLeft[0]);
    if (faceW < frameWidth * FACE_MIN_W) return 'away'; // too far / mostly out of frame

    // If the user has trained Doro, use their personalized classifier.
    if (calibration && calibration.classes) {
      const cls = classifyByTraining(faceFeatures(f), calibration);
      return cls === 'distracted' ? 'looking_away' : 'focused';
    }

    // Otherwise fall back to the auto-calibrated pitch heuristic.
    const lm = f.landmarks;
    const rEye = lm[0];
    const lEye = lm[1];
    const nose = lm[2];
    const eyeMidX = (rEye[0] + lEye[0]) / 2;
    const eyeMidY = (rEye[1] + lEye[1]) / 2;
    const eyeDist = Math.hypot(lEye[0] - rEye[0], lEye[1] - rEye[1]) || 1;
    const yaw = Math.abs(nose[0] - eyeMidX) / eyeDist;
    const pitchRatio = (nose[1] - eyeMidY) / eyeDist;
    if (yaw < YAW_FRONTAL) {
      ctx.pitchBaseline =
        ctx.pitchBaseline == null ? pitchRatio : ctx.pitchBaseline * 0.9 + pitchRatio * 0.1;
    }
    const lookingDown = ctx.pitchBaseline != null && pitchRatio < ctx.pitchBaseline * DOWN_FACTOR;
    return lookingDown ? 'looking_away' : 'focused';
  } catch {
    return 'focused';
  }
}

// Build a normalized nearest-centroid calibration from focused/distracted
// feature samples. Returns null if there aren't enough clean samples.
export function computeCalibration(trainFocused, trainDistracted) {
  if (trainFocused.length < 3 || trainDistracted.length < 3) return null;
  const all = [...trainFocused, ...trainDistracted];
  const n = all[0].length;
  const mean = new Array(n).fill(0);
  const std = new Array(n).fill(0);
  all.forEach((s) => s.forEach((v, i) => (mean[i] += v)));
  for (let i = 0; i < n; i++) mean[i] /= all.length;
  all.forEach((s) => s.forEach((v, i) => (std[i] += (v - mean[i]) ** 2)));
  for (let i = 0; i < n; i++) std[i] = Math.sqrt(std[i] / all.length) || 1;
  const centroid = (arr) => {
    const c = new Array(n).fill(0);
    arr.forEach((s) => s.forEach((v, i) => (c[i] += (v - mean[i]) / std[i])));
    return c.map((v) => v / arr.length);
  };
  return {
    mean,
    std,
    classes: { focused: centroid(trainFocused), distracted: centroid(trainDistracted) },
  };
}

// Calibration persistence (single-user per device — one fixed key).
export function loadCalibration() {
  try {
    const j = localStorage.getItem(CAL_STORAGE_KEY);
    return j ? JSON.parse(j) : null;
  } catch {
    return null;
  }
}

export function saveCalibration(calibration) {
  try {
    localStorage.setItem(CAL_STORAGE_KEY, JSON.stringify(calibration));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

export function clearCalibration() {
  try {
    localStorage.removeItem(CAL_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
