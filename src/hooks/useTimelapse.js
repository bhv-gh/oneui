import { useCallback, useEffect, useRef, useState } from 'react';
import { PRESENCE_COLORS } from '../utils/visualIntelligence';
import { createAmbient, drawIntroCard, drawOverlay } from '../utils/timelapseRender';

// Timelapse recorder: grab a small downscaled frame from the camera every few
// seconds, then compose a fancy sped-up .webm — an animated intro title card,
// per-frame overlays (task title + live focus %), and a generated ambient
// soundtrack muxed in. Ported from SyncDoro; all processing is local.

const TL_INTERVAL_MS = 3000; // capture one frame every 3s of real time
const TL_FPS = 20; // playback frame rate of the final clip
const TL_WIDTH = 640; // downscaled frame width (larger now that we overlay text)
const INTRO_MS = 2600; // opening title card duration

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fmtDuration(ms) {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

// params:
//   videoRef        — ref to the <video> playing the local camera stream
//   getPresence     — () => current presence state (tints the frame border)
//   getMeta         — () => ({ taskText }) resolved at encode time
//   shouldCapture   — () => whether frames should be grabbed right now (e.g.
//                     only while the focus timer is running). Recording stays
//                     armed while false; it just skips grabbing frames.
//   hasStream       — whether the camera is on (gate for start)
//   onStatus(msg)   — optional status/toast callback
export default function useTimelapse({
  videoRef,
  getPresence,
  getMeta,
  shouldCapture,
  hasStream,
  onStatus,
}) {
  const [recording, setRecording] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [result, setResult] = useState(null);

  const framesRef = useRef([]); // array of { blob, presence }
  const timerRef = useRef(null);
  const grabCanvasRef = useRef(null);
  const recordingRef = useRef(false);
  const resultUrlRef = useRef(null);
  const getPresenceRef = useRef(getPresence);
  getPresenceRef.current = getPresence;
  const getMetaRef = useRef(getMeta);
  getMetaRef.current = getMeta;
  const shouldCaptureRef = useRef(shouldCapture);
  shouldCaptureRef.current = shouldCapture;
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;

  const notify = (m) => statusRef.current && statusRef.current(m);

  const tlCanvas = () => {
    if (!grabCanvasRef.current) grabCanvasRef.current = document.createElement('canvas');
    return grabCanvasRef.current;
  };

  const grabFrame = useCallback(async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth || !v.videoHeight) return;
    // Only capture while allowed (e.g. focus timer running); stay armed otherwise.
    if (shouldCaptureRef.current && !shouldCaptureRef.current()) return;
    const c = tlCanvas();
    const w = TL_WIDTH;
    const h = Math.round(w * (v.videoHeight / v.videoWidth));
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(v, 0, 0, w, h);
    const presence = getPresenceRef.current ? getPresenceRef.current() : 'unknown';
    // Glowing border tinted by the focus state at capture time.
    const color = PRESENCE_COLORS[presence];
    if (color) {
      const lw = Math.max(6, Math.round(w * 0.02));
      ctx.save();
      ctx.lineWidth = lw;
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = lw * 2.2;
      ctx.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
      ctx.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
      ctx.restore();
    }
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.72));
    if (blob && recordingRef.current) {
      framesRef.current.push({ blob, presence });
      setFrameCount(framesRef.current.length);
    }
  }, [videoRef]);

  const encode = useCallback(async () => {
    const frames = framesRef.current;
    if (!('MediaRecorder' in window)) {
      notify("This browser can't export video. Try Chrome.");
      return;
    }
    notify('Building your timelapse…');
    try {
      const meta = (getMetaRef.current && getMetaRef.current()) || {};
      const taskText = meta.taskText || 'Focus session';
      const durationMs = frames.length * TL_INTERVAL_MS;
      const focusedTotal = frames.filter((f) => f.presence === 'focused').length;
      const focusPct = frames.length ? Math.round((focusedTotal / frames.length) * 100) : 0;
      const dateLabel = new Date().toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      const first = await createImageBitmap(frames[0].blob);
      const w = first.width;
      const h = first.height;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');

      const videoStream = c.captureStream(TL_FPS);
      const ambient = createAmbient();
      const tracks = [...videoStream.getVideoTracks()];
      if (ambient && ambient.track) tracks.push(ambient.track);
      const mixed = new MediaStream(tracks);

      const frameDelay = 1000 / TL_FPS;
      const totalSec = (INTRO_MS + frames.length * frameDelay + 400) / 1000;
      if (ambient) ambient.schedule(totalSec);

      const withAudio = !!(ambient && ambient.track);
      const pick = (v) => (MediaRecorder.isTypeSupported(v) ? v : null);
      const mime =
        (withAudio &&
          (pick('video/webm;codecs=vp9,opus') || pick('video/webm;codecs=vp8,opus'))) ||
        pick('video/webm;codecs=vp9') ||
        pick('video/webm;codecs=vp8') ||
        'video/webm';
      const rec = new MediaRecorder(mixed, { mimeType: mime });
      const chunks = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size) chunks.push(e.data);
      };
      const done = new Promise((res) => (rec.onstop = res));
      rec.start();

      // 1) animated intro title card
      const introStart = performance.now();
      let elapsed = 0;
      while ((elapsed = performance.now() - introStart) < INTRO_MS) {
        drawIntroCard(ctx, w, h, { taskText, durationLabel: fmtDuration(durationMs), dateLabel, focusPct }, elapsed / INTRO_MS);
        // eslint-disable-next-line no-await-in-loop
        await sleep(1000 / 30);
      }

      // 2) the frames, with per-frame overlay + running focus %
      let focusedSoFar = 0;
      for (let i = 0; i < frames.length; i++) {
        if (frames[i].presence === 'focused') focusedSoFar++;
        const runningPct = Math.round((focusedSoFar / (i + 1)) * 100);
        // eslint-disable-next-line no-await-in-loop
        const bmp = await createImageBitmap(frames[i].blob);
        ctx.drawImage(bmp, 0, 0, w, h);
        if (bmp.close) bmp.close();
        drawOverlay(ctx, w, h, { taskText, focusPct: runningPct });
        // eslint-disable-next-line no-await-in-loop
        await sleep(frameDelay);
      }
      if (first.close) first.close();

      await sleep(frameDelay + 120);
      rec.stop();
      await done;
      if (ambient) await ambient.stop();

      const blob = new Blob(chunks, { type: 'video/webm' });
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = URL.createObjectURL(blob);
      const secs = ((INTRO_MS + frames.length * frameDelay) / 1000).toFixed(1);
      setResult({
        url: resultUrlRef.current,
        blob,
        bytes: blob.size,
        frames: frames.length,
        secs,
        taskText,
        focusPct,
        durationMs,
      });
      notify('✨ Timelapse ready — play, export or upload it below.');
    } catch (e) {
      console.warn('timelapse encode:', e);
      notify("Couldn't build the timelapse.");
    }
  }, []);

  const start = useCallback(() => {
    if (recordingRef.current) return;
    if (!hasStream) {
      notify('Turn the camera on first to record a timelapse.');
      return;
    }
    framesRef.current = [];
    recordingRef.current = true;
    setRecording(true);
    setFrameCount(0);
    setResult(null);
    grabFrame();
    timerRef.current = setInterval(grabFrame, TL_INTERVAL_MS);
    notify('🎥 Timelapse recording…');
  }, [hasStream, grabFrame]);

  const stop = useCallback(async () => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (framesRef.current.length < 2) {
      notify('Timelapse too short — need a few more frames.');
      return;
    }
    await encode();
  }, [encode]);

  const toggle = useCallback(() => {
    if (recordingRef.current) stop();
    else start();
  }, [start, stop]);

  // Cleanup: stop any timer and revoke result URL on unmount.
  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    },
    []
  );

  return { recording, frameCount, result, start, stop, toggle };
}
