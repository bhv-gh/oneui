import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Brain, Download, Film, Pause, Play, Square, Trash2, Video, X } from 'lucide-react';
import useFaceDetection from '../hooks/useFaceDetection';
import useTimelapse from '../hooks/useTimelapse';
import useClips from '../hooks/useClips';
import YouTubeUploadButton from './YouTubeUploadButton';
import ClipFullscreen from './ClipFullscreen';
import { PRESENCE_COLORS, PRESENCE_LABELS } from '../utils/visualIntelligence';
import { getNotificationSound, playNotificationSound } from '../utils/notificationSounds';
import { saveClip } from '../utils/clipStore';
import { sendWhatsApp } from '../utils/notifyWhatsapp';

function fmtDur(ms) {
  if (!ms) return '';
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

// Camera Visual Intelligence panel — the right half of the Focus split view.
//
// On-device (BlazeFace) focus/presence detection with distraction nudges +
// focus score, a session timelapse recorder/exporter, and a "Train Doro"
// personalized-classifier flow. All processing is local — nothing is uploaded
// and there is no networking. Ported from SyncDoro.
//
// Mounted when the user hits the Record button in the timer controls: it
// auto-starts the camera + timelapse and renders a large preview with a fancy,
// animated presence-state highlight. `onClose` tears the whole thing down.
const CameraPanel = ({ focusActive, onClose, taskText, onSetFocusRunning }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const taskTextRef = useRef(taskText);
  taskTextRef.current = taskText;
  const focusActiveRef = useRef(focusActive);
  focusActiveRef.current = focusActive;
  const onSetFocusRunningRef = useRef(onSetFocusRunning);
  onSetFocusRunningRef.current = onSetFocusRunning;
  const setFocusRunning = (run) => onSetFocusRunningRef.current && onSetFocusRunningRef.current(run);
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [status, setStatus] = useState(null);

  const showStatus = useCallback((msg) => {
    setStatus(msg);
    if (msg) setTimeout(() => setStatus((s) => (s === msg ? null : s)), 3500);
  }, []);

  const onNudge = useCallback(() => {
    setNudge(true);
    setTimeout(() => setNudge(false), 8000);
    try {
      playNotificationSound(getNotificationSound());
    } catch {
      /* ignore */
    }
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Focus check 🍅', {
          body: "You've been away from your screen for a bit.",
        });
      } catch {
        /* ignore */
      }
    }
  }, []);

  const { presenceState, focusScore, hasCalibration, captureSamples, train } = useFaceDetection({
    videoRef,
    active: camOn,
    focusActive,
    onNudge,
  });

  const presenceRef = useRef(presenceState);
  presenceRef.current = presenceState;

  const timelapse = useTimelapse({
    videoRef,
    getPresence: () => presenceRef.current,
    getMeta: () => ({ taskText: taskTextRef.current }),
    shouldCapture: () => focusActiveRef.current, // only record while focus is running
    hasStream: camOn,
    onStatus: showStatus,
  });

  // --- Camera lifecycle ------------------------------------------------------
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play?.().catch(() => {});
      }
      setCamOn(true);
      return true;
    } catch {
      setCamError(true);
      showStatus("Couldn't access the camera. Check browser permissions.");
      return false;
    }
  }, [showStatus]);

  // Auto-start the camera on mount for a live preview. Recording is separate —
  // it only begins when the user hits Record (which also starts the focus timer)
  // and frames are captured only while focus is running.
  useEffect(() => {
    startCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timelapseRef = useRef(timelapse);
  timelapseRef.current = timelapse;

  // Record: start focus + begin the timelapse.
  const handleRecordStart = useCallback(() => {
    setFocusRunning(true);
    timelapseRef.current.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pause / Resume: toggle the focus timer. Capture is gated on focus, so this
  // pauses/resumes the timelapse too — WITHOUT finalizing (one clip per session).
  const handlePauseResume = useCallback(() => {
    setFocusRunning(!focusActiveRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop: pause the timer and finalize the timelapse into a single clip.
  const handleStop = useCallback(() => {
    setFocusRunning(false);
    timelapseRef.current.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tear everything down on unmount (Record toggled off / exiting focus).
  useEffect(
    () => () => {
      if (timelapseRef.current.recording) timelapseRef.current.stop();
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    },
    []
  );

  // --- Train Doro modal ------------------------------------------------------
  const [trainOpen, setTrainOpen] = useState(false);

  // --- Local clip library (shared, IndexedDB-backed) ------------------------
  const { clips, clipUrl, remove } = useClips();
  const [activeClipId, setActiveClipId] = useState(null);
  const [fsClipId, setFsClipId] = useState(null);

  // Persist each newly-encoded clip; select it as the preview.
  const savedResultRef = useRef(null);
  useEffect(() => {
    const r = timelapse.result;
    if (!r || !r.blob || savedResultRef.current === r) return;
    savedResultRef.current = r;
    saveClip({
      blob: r.blob,
      frames: r.frames,
      secs: r.secs,
      bytes: r.bytes,
      taskText: r.taskText,
      focusPct: r.focusPct,
      durationMs: r.durationMs,
    })
      .then((rec) => {
        setActiveClipId(rec.id);
        const task = r.taskText ? ` — ${r.taskText}` : '';
        sendWhatsApp(`🍅 Focus done: ${r.focusPct}% focused over ${fmtDur(r.durationMs)}${task}`);
      })
      .catch(() => {});
  }, [timelapse.result]);

  // Default the preview to the newest clip once the list loads.
  useEffect(() => {
    if (!activeClipId && clips.length) setActiveClipId(clips[0].id);
  }, [clips, activeClipId]);

  const removeClip = useCallback(
    (id) => {
      remove(id);
      setActiveClipId((cur) => (cur === id ? null : cur));
    },
    [remove]
  );

  const activeClip = clips.find((c) => c.id === activeClipId) || null;
  const fsClip = clips.find((c) => c.id === fsClipId) || null;
  const fmtTime = (ms) => {
    try {
      return new Date(ms).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };
  const fmtMeta = (c) => `${c.frames}f · ${c.secs}s · ${(c.bytes / 1048576).toFixed(1)}MB`;

  const color = PRESENCE_COLORS[presenceState] || 'var(--color-content-disabled)';
  const scorePct = focusScore != null ? Math.round(focusScore * 100) : null;

  return (
    <div
      className="relative w-full flex flex-col rounded-t-3xl overflow-auto bg-surface-primary/70 backdrop-blur-md border border-edge-primary/60 shadow-2xl"
      style={{ resize: 'both', minWidth: 280, minHeight: 240 }} // drag the bottom-right corner to resize
    >
      {/* video area — 16:9 landscape, full feed (never cropped). Rounded only
          at the top so it meets the control bar with square bottom corners. */}
      <div className="relative w-full bg-black aspect-video shrink-0 rounded-t-3xl overflow-hidden">
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className="w-full h-full object-contain"
          style={{ transform: 'scaleX(-1)' }} // mirror like a selfie view
        />

        {/* fancy animated presence ring — breathes in the current state color.
            Matches the video: rounded top, square bottom. */}
        {camOn && (
          <div
            className="pointer-events-none absolute inset-0 rounded-t-3xl animate-pulse transition-[box-shadow] duration-500"
            style={{ boxShadow: `inset 0 0 0 4px ${color}, inset 0 0 60px -10px ${color}` }}
          />
        )}

        {/* state badge (top-left) */}
        {camOn && (
          <div
            className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/45 backdrop-blur-sm text-sm font-semibold text-white transition-colors duration-300"
            style={{ boxShadow: `0 0 0 1.5px ${color}66` }}
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ background: color, boxShadow: `0 0 8px ${color}` }}
            />
            {PRESENCE_LABELS[presenceState]}
          </div>
        )}

        {/* REC indicator (top-right) */}
        {timelapse.recording && (
          <span className="absolute top-4 right-14 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-sm text-xs font-semibold text-red-400">
            {focusActive ? (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> REC · {timelapse.frameCount}
              </>
            ) : (
              <span className="text-amber-300">⏸ Paused</span>
            )}
          </span>
        )}

        {/* close (top-right corner) */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-black/45 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/70 transition-colors"
          title="Close camera"
        >
          <X size={18} />
        </button>

        {/* focus-score ring (bottom-left) */}
        {scorePct != null && (
          <div className="absolute bottom-4 left-4">
            <FocusRing pct={scorePct} color={PRESENCE_COLORS.focused} />
          </div>
        )}

        {/* distraction nudge banner */}
        {nudge && (
          <div className="absolute inset-x-0 bottom-0 bg-warning/90 text-content-inverse text-sm font-semibold px-4 py-2 text-center animate-pulse">
            👀 Lost focus? Get back to your task.
          </div>
        )}

        {camError && (
          <div className="absolute inset-0 flex items-center justify-center text-center px-6 text-white/80 text-sm">
            Couldn't access the camera. Check browser permissions and reopen.
          </div>
        )}
      </div>

      {/* control bar — wraps instead of overflowing when the panel is narrow */}
      <div className="flex flex-wrap items-center gap-2 p-3 shrink-0">
        {!timelapse.recording ? (
          <button
            onClick={handleRecordStart}
            disabled={!camOn}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-surface-secondary text-content-secondary hover:text-content-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Start focus + record timelapse"
          >
            <Video size={16} /> Record
          </button>
        ) : (
          <>
            <button
              onClick={handlePauseResume}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-surface-secondary text-content-secondary hover:text-content-primary transition-colors"
              title={focusActive ? 'Pause session (keeps recording)' : 'Resume session'}
            >
              {focusActive ? (
                <>
                  <Pause size={16} /> Pause
                </>
              ) : (
                <>
                  <Play size={16} /> Resume
                </>
              )}
            </button>
            <button
              onClick={handleStop}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-red-500/15 text-red-500 hover:bg-red-500/25 transition-colors"
              title="Stop session & save timelapse"
            >
              <Square size={15} /> Stop
            </button>
          </>
        )}
        <button
          onClick={() => setTrainOpen(true)}
          disabled={!camOn}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-surface-secondary text-content-secondary hover:text-content-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title={hasCalibration ? 'Retrain Doro' : 'Train Doro'}
        >
          <Brain size={16} /> {hasCalibration ? 'Retrain' : 'Train'}
        </button>
        {status && (
          <span className="text-[11px] text-content-muted truncate min-w-0 flex-1 basis-full sm:basis-auto">
            {status}
          </span>
        )}
      </div>

      {/* preview of the selected clip + export / delete */}
      {activeClip && (
        <div className="px-3 pb-2 shrink-0 space-y-2">
          <video
            key={activeClip.id}
            src={clipUrl(activeClip)}
            controls
            playsInline
            className="w-full max-h-44 rounded-xl bg-black/40"
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-content-muted min-w-0 truncate flex-1">
              {fmtTime(activeClip.createdAt)} · {fmtMeta(activeClip)}
            </span>
            <a
              href={clipUrl(activeClip)}
              download={`focus-timelapse-${activeClip.createdAt}.webm`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-accent-subtle text-accent hover:bg-accent-subtler transition-colors"
            >
              <Download size={14} /> Export
            </a>
            <YouTubeUploadButton clip={activeClip} />
            <button
              onClick={() => removeClip(activeClip.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-surface-secondary text-content-tertiary hover:text-red-500 transition-colors"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      )}

      {/* saved-clip library */}
      {clips.length > 0 && (
        <div className="px-3 pb-3 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-content-tertiary mb-1.5">
            <Film size={12} /> Saved clips ({clips.length})
          </div>
          <ul className="max-h-32 overflow-y-auto space-y-1">
            {clips.map((c) => {
              const isActive = c.id === activeClipId;
              return (
                <li
                  key={c.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] ${
                    isActive ? 'bg-accent-subtle/60' : 'bg-surface-secondary/50 hover:bg-surface-secondary'
                  }`}
                >
                  <button
                    onClick={() => setFsClipId(c.id)}
                    className="flex items-center gap-1.5 min-w-0 flex-1 text-left text-content-secondary"
                    title="Play fullscreen"
                  >
                    <Play size={12} className="shrink-0" />
                    <span className="truncate">
                      {fmtTime(c.createdAt)} · {fmtMeta(c)}
                    </span>
                  </button>
                  <a
                    href={clipUrl(c)}
                    download={`focus-timelapse-${c.createdAt}.webm`}
                    className="p-1 rounded text-content-tertiary hover:text-accent transition-colors"
                    title="Export clip"
                  >
                    <Download size={14} />
                  </a>
                  <button
                    onClick={() => removeClip(c.id)}
                    className="p-1 rounded text-content-tertiary hover:text-red-500 transition-colors"
                    title="Delete clip"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <ClipFullscreen
        clip={fsClip}
        url={fsClip ? clipUrl(fsClip) : null}
        onDelete={removeClip}
        onClose={() => setFsClipId(null)}
      />

      {trainOpen && (
        <TrainDoroModal
          captureSamples={captureSamples}
          train={train}
          onStatus={showStatus}
          onClose={() => setTrainOpen(false)}
        />
      )}
    </div>
  );
};

// Circular focus-score meter drawn with a conic-gradient ring.
const FocusRing = ({ pct, color }) => (
  <div
    className="relative w-14 h-14 rounded-full grid place-items-center"
    style={{ background: `conic-gradient(${color} ${pct * 3.6}deg, rgba(255,255,255,0.15) 0)` }}
    title="Share of this session you've been focused"
  >
    <div className="absolute inset-1.5 rounded-full bg-black/60 backdrop-blur-sm grid place-items-center">
      <span className="text-xs font-bold text-white leading-none">{pct}%</span>
    </div>
  </div>
);

// --- Train Doro modal --------------------------------------------------------
// Records "focused" then "distracted" poses and learns a personalized
// classifier. Mirrors SyncDoro's training flow.
const TrainDoroModal = ({ captureSamples, train, onStatus, onClose }) => {
  const [step, setStep] = useState(0); // 0 intro, 2 between, 4 done
  const [busy, setBusy] = useState(false);
  const [bar, setBar] = useState(0);
  const [emoji, setEmoji] = useState('🧠');
  const [title, setTitle] = useState('Teach Doro your focus');
  const [text, setText] = useState(
    "I'll learn what focused vs distracted looks like for you. Sit how you normally work, then tap Start."
  );
  const [btnLabel, setBtnLabel] = useState('Start →');
  const focusedRef = useRef([]);
  const distractedRef = useRef([]);

  const advance = async () => {
    if (busy) return;
    if (step === 0) {
      setStep(1);
      setBusy(true);
      setEmoji('🟢');
      setTitle('Look focused');
      setText('Look at your screen and work normally — glance around too. Hold for a few seconds…');
      setBar(0);
      await captureSamples(focusedRef.current, 4500, setBar);
      setBusy(false);
      setStep(2);
      setEmoji('✅');
      setTitle('Got it!');
      setText(`Captured ${focusedRef.current.length} focused samples. Now the distracted pose.`);
      setBtnLabel('Next →');
      return;
    }
    if (step === 2) {
      setStep(3);
      setBusy(true);
      setEmoji('🟡');
      setTitle('Look distracted');
      setText('Look down at your phone or lap, like you\'re distracted. Hold for a few seconds…');
      setBar(0);
      await captureSamples(distractedRef.current, 4500, setBar);
      setBusy(false);
      const ok = train(focusedRef.current, distractedRef.current);
      setStep(4);
      if (ok) {
        setEmoji('🎉');
        setTitle('Doro is trained!');
        setText("I learned your focused vs distracted look, and I'll use it from now on. Retrain anytime.");
        onStatus && onStatus('🧠 Doro trained on your focus!');
      } else {
        setEmoji('😿');
        setTitle("Didn't get enough");
        setText("I couldn't see your face clearly enough. Get well-lit and centered, then try again.");
      }
      setBtnLabel('Done');
      return;
    }
    onClose();
  };

  return (
    <div className="absolute inset-0 z-[10] flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-t-3xl">
      <div className="w-80 max-w-[90%] rounded-2xl bg-surface-primary border border-edge-primary p-6 text-center shadow-xl">
        <div className="text-4xl mb-2">{emoji}</div>
        <h2 className="text-lg font-bold text-content-primary mb-1">{title}</h2>
        <p className="text-sm text-content-tertiary mb-4">{text}</p>
        <div className="h-1.5 rounded-full bg-surface-secondary overflow-hidden mb-4">
          <div
            className="h-full bg-accent-bold transition-[width] duration-150"
            style={{ width: `${Math.round(Math.max(0, Math.min(1, bar)) * 100)}%` }}
          />
        </div>
        <div className="flex justify-center gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-lg text-sm text-content-tertiary hover:bg-surface-secondary disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={advance}
            disabled={busy}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-accent-subtle text-accent hover:bg-accent-subtler disabled:opacity-40"
          >
            {busy ? 'Capturing…' : btnLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraPanel;
