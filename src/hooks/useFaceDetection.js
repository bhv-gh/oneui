import { useCallback, useEffect, useRef, useState } from 'react';
import {
  classifyFace,
  computeCalibration,
  faceFeatures,
  loadCalibration,
  saveCalibration,
} from '../utils/visualIntelligence';

// Lazily-loaded singleton BlazeFace model (shared across mounts). The tfjs +
// blazeface bundles are heavy, so we dynamic-import them on first use to keep
// them out of the initial app bundle.
let faceModelPromise = null;
function ensureFaceModel() {
  if (!faceModelPromise) {
    faceModelPromise = (async () => {
      const tf = await import('@tensorflow/tfjs');
      await tf.ready();
      const blazeface = await import('@tensorflow-models/blazeface');
      return blazeface.load();
    })().catch((e) => {
      console.warn('face model load failed:', e);
      faceModelPromise = null; // allow retry later
      return null;
    });
  }
  return faceModelPromise;
}

const DETECT_INTERVAL_MS = 1500;
const NUDGE_AFTER_MS = 20000; // distracted this long during focus -> nudge

// On-device presence / focus detection driven by a <video> element.
//
// Params:
//   videoRef     — ref to the <video> playing the local camera stream
//   active       — whether detection should run (camera on)
//   focusActive  — whether a focus Pomodoro is currently running (drives
//                  focus-score sampling + the distraction nudge)
//   onNudge      — called once when the user has been distracted too long
export default function useFaceDetection({ videoRef, active, focusActive, onNudge }) {
  const [presenceState, setPresenceState] = useState('unknown');
  const [focusScore, setFocusScore] = useState(null); // 0..1 or null
  const [hasCalibration, setHasCalibration] = useState(() => !!loadCalibration());

  // Mutable per-loop state kept in refs so the interval always sees fresh values.
  const calibrationRef = useRef(loadCalibration());
  const heuristicCtxRef = useRef({ pitchBaseline: null });
  const pendingRef = useRef({ state: null, count: 0 });
  const presenceRef = useRef('unknown');
  const focusRef = useRef({ prev: false, samples: 0, present: 0, awaySince: null, nudged: false });
  const onNudgeRef = useRef(onNudge);
  onNudgeRef.current = onNudge;
  const focusActiveRef = useRef(focusActive);
  focusActiveRef.current = focusActive;

  // Debounce so presence doesn't flicker: flip to "focused" fast, away/down slower.
  const applyPresence = useCallback((observed) => {
    if (observed === presenceRef.current) {
      pendingRef.current = { state: null, count: 0 };
      return;
    }
    const pending = pendingRef.current;
    if (pending.state === observed) pending.count++;
    else pendingRef.current = { state: observed, count: 1 };
    const need = observed === 'focused' ? 1 : 2;
    if (pendingRef.current.count >= need) {
      presenceRef.current = observed;
      setPresenceState(observed);
      pendingRef.current = { state: null, count: 0 };
    }
  }, []);

  // Detection loop.
  useEffect(() => {
    if (!active) {
      presenceRef.current = 'unknown';
      setPresenceState('unknown');
      return;
    }
    let cancelled = false;
    let model = null;
    ensureFaceModel().then((m) => {
      model = m;
    });

    const runDetection = async () => {
      const v = videoRef.current;
      if (!model || !v || !v.videoWidth) return;
      let faces = [];
      try {
        faces = await model.estimateFaces(v, false);
      } catch {
        return;
      }
      if (cancelled) return;
      const observed = !faces.length
        ? 'away'
        : classifyFace(faces[0], v.videoWidth, heuristicCtxRef.current, calibrationRef.current);
      applyPresence(observed);

      // Focus-score sampling + distraction nudge, only while a focus block runs.
      const f = focusRef.current;
      const isFocus = focusActiveRef.current;
      if (isFocus && !f.prev) {
        f.samples = 0;
        f.present = 0;
        f.awaySince = null;
        f.nudged = false;
        setFocusScore(null);
      }
      f.prev = isFocus;
      if (isFocus) {
        f.samples++;
        if (presenceRef.current === 'focused') f.present++;
        setFocusScore(f.samples ? f.present / f.samples : null);
        if (presenceRef.current !== 'focused') {
          if (!f.awaySince) f.awaySince = Date.now();
          else if (Date.now() - f.awaySince > NUDGE_AFTER_MS && !f.nudged) {
            f.nudged = true;
            onNudgeRef.current && onNudgeRef.current();
          }
        } else {
          f.awaySince = null;
          f.nudged = false;
        }
      }
    };

    const id = setInterval(runDetection, DETECT_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [active, videoRef, applyPresence]);

  // Capture calibration samples for a labeled pose over `ms` milliseconds.
  const captureSamples = useCallback(
    async (targetArr, ms, onProgress) => {
      const model = await ensureFaceModel();
      const v = videoRef.current;
      const end = Date.now() + ms;
      while (Date.now() < end) {
        if (model && v && v.videoWidth) {
          let faces = [];
          try {
            faces = await model.estimateFaces(v, false);
          } catch {
            /* skip frame */
          }
          if (faces.length) targetArr.push(faceFeatures(faces[0]));
        }
        if (onProgress) onProgress(1 - (end - Date.now()) / ms);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 160));
      }
      if (onProgress) onProgress(1);
    },
    [videoRef]
  );

  // Train a personalized classifier from focused + distracted samples.
  const train = useCallback((trainFocused, trainDistracted) => {
    const cal = computeCalibration(trainFocused, trainDistracted);
    if (!cal) return false;
    calibrationRef.current = cal;
    saveCalibration(cal);
    setHasCalibration(true);
    return true;
  }, []);

  return { presenceState, focusScore, hasCalibration, captureSamples, train };
}
