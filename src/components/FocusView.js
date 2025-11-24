import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { XCircle, PictureInPicture } from 'lucide-react';
import PomodoroTimer from './PomodoroTimer';

// --- Component: Full Screen Focus View ---
const FocusView = ({ task, timerProps, onExit, appState }) => {
  const [pipWindow, setPipWindow] = useState(null);
  const [pipPortalRoot, setPipPortalRoot] = useState(null);
  const [isPipActive, setIsPipActive] = useState(false);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const requestRef = useRef();

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

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1E293B'; // bg-slate-800
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 60px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatTime(time), canvas.width / 2, canvas.height / 2);
  };

  const animate = () => {
    if (timerProps) {
      drawToCanvas(timerProps.timeRemaining);
    }
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (!('documentPictureInPicture' in window) && document.pictureInPictureEnabled) {
      requestRef.current = requestAnimationFrame(animate);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas) {
        video.srcObject = canvas.captureStream();
      }
      return () => cancelAnimationFrame(requestRef.current);
    }
  }, []);

  useEffect(() => {
    if (!('documentPictureInPicture' in window) && document.pictureInPictureEnabled && timerProps) {
      drawToCanvas(timerProps.timeRemaining);
    }
  }, [timerProps?.timeRemaining]);

  useEffect(() => {
    if (pipWindow) {
      const body = pipWindow.document.body;
      const backgroundClasses = {
        focusing: 'bg-slate-950', 
        break: 'bg-sky-950',
        paused: 'bg-emerald-950',   
        idle: 'bg-emerald-950',     
      };
      body.className = `flex items-center justify-center h-full ${backgroundClasses[appState]}`;
    }
  }, [appState, pipWindow]);

  const closePictureInPicture = async () => {
    if (!isPipActive && !document.pictureInPictureElement) return;
    if (pipWindow) {
      pipWindow.close();
    }
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    }
    setPipWindow(null);
    setPipPortalRoot(null);
    setIsPipActive(false);
  };

  useEffect(() => {
    return () => {
      closePictureInPicture();
    };
  }, []);

  if (!task) return null;

  const {
    timeRemaining,
    isTimerActive,
    timerMode,
    onStartPause,
    onReset,
    onSetMode
  } = timerProps;
  
  const openPictureInPicture = async () => {
    if (isPipActive || document.pictureInPictureElement) return;

    const docPipSupported = 'documentPictureInPicture' in window;
    const videoPipSupported = videoRef.current && document.pictureInPictureEnabled;

    if (docPipSupported) {
      try {
        const newPipWindow = await window.documentPictureInPicture.requestWindow({
          width: 450,
          height: 320,
        });
        
        const title = newPipWindow.document.createElement('title');
        title.innerText = `Focusing on: ${task.text || "Untitled Task"}`;
        newPipWindow.document.head.appendChild(title);
        
        const styleSheets = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'));
        styleSheets.forEach(sheet => {
          newPipWindow.document.head.appendChild(sheet.cloneNode(true));
        });

        const pipRoot = newPipWindow.document.createElement('div');
        pipRoot.id = 'pip-root';
        pipRoot.style.width = '100%';
        newPipWindow.document.body.appendChild(pipRoot);
        
        setPipPortalRoot(pipRoot);
        setPipWindow(newPipWindow);

        newPipWindow.addEventListener('pagehide', () => {
          setPipWindow(null);
          setPipPortalRoot(null);
        });
      } catch (error) {
        console.error('Error opening Document PiP window:', error);
      }
    } else if (videoPipSupported) {
      try {
        await videoRef.current.requestPictureInPicture();
        setIsPipActive(true);
        videoRef.current.addEventListener('leavepictureinpicture', () => {
          setIsPipActive(false);
        }, { once: true });
      } catch (error) {
        console.error('Error entering Video PiP:', error);
      }
    }
  };

  const togglePictureInPicture = () => {
    if (isPipActive || document.pictureInPictureElement) {
      closePictureInPicture();
    } else {
      openPictureInPicture();
    }
  };

  const handleExitClick = () => {
    closePictureInPicture();
    onExit();
  };

  const backgroundClasses = {
    focusing: 'bg-slate-950', 
    break: 'bg-sky-950',
    paused: 'bg-emerald-950',   
    idle: 'bg-emerald-950',     
  };

  return (
    <div className={`fixed inset-0 z-[200] flex flex-col items-center justify-center p-8 animate-in fade-in duration-300 transition-colors duration-1000 ${backgroundClasses[appState]}`}>
      <canvas ref={canvasRef} width="400" height="200" style={{ display: 'none' }} />
      <video ref={videoRef} muted playsInline autoPlay style={{ display: 'none' }} />
      {pipWindow && pipPortalRoot && ReactDOM.createPortal(
        <div className="w-full max-w-md">
          <PomodoroTimer 
            timeRemaining={timeRemaining}
            isTimerActive={isTimerActive}
            timerMode={timerMode}
            onStartPause={onStartPause}
            onReset={onReset}
            onSetMode={onSetMode}
            onTogglePip={togglePictureInPicture}
          />
        </div>,
        pipPortalRoot
      )}

      <button onClick={handleExitClick} className="absolute top-6 right-6 text-slate-600 hover:text-slate-300 transition-colors">
        <XCircle size={32} />
      </button>

      <div className="text-center">
        <p className="text-slate-500 text-lg mb-2">Focusing on:</p>
        <h1 className="text-4xl font-bold text-slate-100 mb-12 truncate max-w-2xl">{task.text || "Untitled Task"}</h1>
        
        {isPipActive ? (
          <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
            <p className="text-slate-400">Timer is in Picture-in-Picture mode.</p>
            <button 
              onClick={closePictureInPicture}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
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
            onTogglePip={togglePictureInPicture}
          />
        )}
      </div>
    </div>
  );
};

export default FocusView;