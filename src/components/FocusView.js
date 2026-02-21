import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { XCircle, PictureInPicture } from 'lucide-react';
import PomodoroTimer from './PomodoroTimer';
import PipTimerView from './PipTimerView';
import QuickCapture from './QuickCapture';

// --- Component: Full Screen Focus View ---
const FocusView = ({ task, timerProps, onExit, appState, capturedTasks = [], onCaptureTask }) => {
  const [pipWindow, setPipWindow] = useState(null);
  const [pipPortalRoot, setPipPortalRoot] = useState(null);
  const [isPipActive, setIsPipActive] = useState(false);
  const pipWindowRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const requestRef = useRef();
  const taskRef = useRef(task);
  taskRef.current = task;

  useEffect(() => {
    setIsPipActive(!!pipWindow);
  }, [pipWindow]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const drawToCanvas = (time) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const style = getComputedStyle(document.documentElement);
    const dotColor = style.getPropertyValue('--color-canvas-dot').trim();
    const textColor = style.getPropertyValue('--color-content-primary').trim();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = dotColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = textColor;
    ctx.font = 'bold 60px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatTime(time), canvas.width / 2, canvas.height / 2);
  };

  const animate = () => {
    if (timerProps) drawToCanvas(timerProps.timeRemaining);
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (!('documentPictureInPicture' in window) && document.pictureInPictureEnabled) {
      requestRef.current = requestAnimationFrame(animate);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas) video.srcObject = canvas.captureStream();
      return () => cancelAnimationFrame(requestRef.current);
    }
  }, []);

  useEffect(() => {
    if (!('documentPictureInPicture' in window) && document.pictureInPictureEnabled && timerProps) {
      drawToCanvas(timerProps.timeRemaining);
    }
  }, [timerProps?.timeRemaining]);

  useEffect(() => {
    if (pipWindowRef.current) {
      const style = getComputedStyle(document.documentElement);
      const backgrounds = {
        focusing: style.getPropertyValue('--color-page-base').trim(),
        break: style.getPropertyValue('--color-page-break').trim(),
        paused: style.getPropertyValue('--color-page-focus').trim(),
        idle: style.getPropertyValue('--color-page-focus').trim(),
      };
      pipWindowRef.current.document.body.style.background = backgrounds[appState];
      pipWindowRef.current.document.body.style.transition = 'background 1s';
    }
  }, [appState, pipWindow]);

  // --- PiP: open / close / toggle ---
  // Kept minimal. requestWindow() auto-closes any prior PiP window per spec.

  const openPip = async () => {
    const t = taskRef.current;
    if (!t) return;

    if ('documentPictureInPicture' in window) {
      // Clear stale ref so React state stays consistent
      pipWindowRef.current = null;

      try {
        const win = await window.documentPictureInPicture.requestWindow({ width: 450, height: 320 });
        pipWindowRef.current = win;

        win.document.head.appendChild(Object.assign(win.document.createElement('title'), {
          innerText: `Focusing on: ${t.text || 'Untitled Task'}`,
        }));

        const style = win.document.createElement('style');
        style.textContent = 'html,body{height:100%;margin:0;padding:0;overflow:hidden}';
        win.document.head.appendChild(style);

        const root = win.document.createElement('div');
        root.id = 'pip-root';
        root.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;box-sizing:border-box';
        win.document.body.appendChild(root);

        setPipPortalRoot(root);
        setPipWindow(win);

        win.addEventListener('pagehide', () => {
          pipWindowRef.current = null;
          setPipWindow(null);
          setPipPortalRoot(null);
        });
      } catch (e) {
        pipWindowRef.current = null;
        console.error('PiP open failed:', e);
      }
    } else if (videoRef.current && document.pictureInPictureEnabled) {
      try {
        await videoRef.current.requestPictureInPicture();
        setIsPipActive(true);
        videoRef.current.addEventListener('leavepictureinpicture', () => setIsPipActive(false), { once: true });
      } catch (e) {
        console.error('Video PiP failed:', e);
      }
    }
  };

  const closePip = () => {
    const win = pipWindowRef.current || window.documentPictureInPicture?.window;
    if (win) { try { win.close(); } catch (_) {} }
    pipWindowRef.current = null;

    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }

    setPipWindow(null);
    setPipPortalRoot(null);
    setIsPipActive(false);
  };

  const togglePip = () => {
    if (pipWindowRef.current || window.documentPictureInPicture?.window || document.pictureInPictureElement) {
      closePip();
    } else {
      openPip();
    }
  };

  // Auto PiP on tab switch — single listener, uses refs for latest functions
  const openPipRef = useRef(openPip);
  const closePipRef = useRef(closePip);
  openPipRef.current = openPip;
  closePipRef.current = closePip;

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'hidden') {
        // Always try to open — requestWindow() handles duplicates
        openPipRef.current();
      } else if (document.visibilityState === 'visible') {
        closePipRef.current();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => closePip(), []);

  if (!task) return null;

  const { timeRemaining, isTimerActive, timerMode, onStartPause, onReset, onSetMode } = timerProps;

  const handleExitClick = () => { closePip(); onExit(); };

  const backgroundClasses = {
    focusing: 'bg-page-base', break: 'bg-page-break',
    paused: 'bg-page-focus', idle: 'bg-page-focus',
  };

  // Resolve CSS variable values for PiP window (which lacks access to the main document's CSS vars)
  const resolvedPipColors = (() => {
    const style = getComputedStyle(document.documentElement);
    return {
      surfacePrimary: style.getPropertyValue('--color-surface-primary').trim(),
      contentPrimary: style.getPropertyValue('--color-content-primary').trim(),
      accentBold: style.getPropertyValue('--color-accent-bold').trim(),
      edgePrimary: style.getPropertyValue('--color-edge-primary').trim(),
    };
  })();

  return (
    <div className={`fixed inset-0 z-[200] flex flex-col items-center justify-center p-8 animate-in fade-in duration-300 transition-colors duration-1000 ${backgroundClasses[appState]}`}>
      <canvas ref={canvasRef} width="400" height="200" style={{ display: 'none' }} />
      <video ref={videoRef} muted playsInline autoPlay style={{ display: 'none' }} />

      {pipWindow && pipPortalRoot && ReactDOM.createPortal(
        <PipTimerView
          timeRemaining={timeRemaining}
          isTimerActive={isTimerActive}
          timerMode={timerMode}
          onStartPause={onStartPause}
          onReset={onReset}
          onSetMode={onSetMode}
          onTogglePip={togglePip}
          onCapture={onCaptureTask}
          capturedCount={capturedTasks.length}
          appState={appState}
          pipColors={resolvedPipColors}
        />,
        pipPortalRoot
      )}

      <button onClick={handleExitClick} className="absolute top-6 right-6 text-content-disabled hover:text-content-secondary transition-colors">
        <XCircle size={32} />
      </button>

      <div className="text-center">
        <p className="text-content-muted text-lg mb-2">Focusing on:</p>
        <h1 className="text-4xl font-bold text-content-primary mb-12 truncate max-w-2xl">{task.text || "Untitled Task"}</h1>

        {isPipActive ? (
          <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
            <p className="text-content-tertiary">Timer is in Picture-in-Picture mode.</p>
            <button
              onClick={closePip}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-secondary text-content-secondary hover:bg-surface-secondary transition-colors"
            >
              <PictureInPicture size={18} />
              <span>Bring Timer Back</span>
            </button>
          </div>
        ) : (
          <PomodoroTimer
            timeRemaining={timeRemaining}
            isTimerActive={isTimerActive}
            timerMode={timerMode}
            onStartPause={onStartPause}
            onReset={onReset}
            onSetMode={onSetMode}
            onTogglePip={togglePip}
          />
        )}
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <QuickCapture onCapture={onCaptureTask} capturedCount={capturedTasks.length} />
      </div>
    </div>
  );
};

export default FocusView;
