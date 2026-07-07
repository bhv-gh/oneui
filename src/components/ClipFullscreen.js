import React from 'react';
import ReactDOM from 'react-dom';
import { Download, Film, Trash2, X } from 'lucide-react';
import YouTubeUploadButton from './YouTubeUploadButton';

const fmtTime = (ms) => {
  try {
    return new Date(ms).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

// Fullscreen timelapse player overlay with export / YouTube / delete / close.
// Shared by the settings gallery and the camera panel's saved-clips list.
const ClipFullscreen = ({ clip, url, onDelete, onClose }) => {
  if (!clip || !url) return null;
  // Portal to <body> so `fixed` isn't trapped by a transformed/filtered ancestor
  // (e.g. the camera panel's backdrop-blur), giving true viewport fullscreen.
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[400] bg-black/95 flex flex-col animate-in fade-in duration-200">
      <div className="flex items-center gap-3 px-5 py-3 text-white/90">
        <span className="flex items-center gap-2 text-sm font-medium min-w-0 truncate">
          <Film size={16} /> {fmtTime(clip.createdAt)} · {clip.secs}s · {(clip.bytes / 1048576).toFixed(1)} MB
        </span>
        <div className="flex-1" />
        <a
          href={url}
          download={`focus-timelapse-${clip.createdAt}.webm`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 transition-colors"
        >
          <Download size={16} /> Export
        </a>
        <YouTubeUploadButton clip={clip} dark />
        <button
          onClick={() => {
            onDelete && onDelete(clip.id);
            onClose && onClose();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white/10 hover:bg-red-500/30 transition-colors"
        >
          <Trash2 size={16} /> Delete
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
          title="Close"
        >
          <X size={20} />
        </button>
      </div>
      <video
        key={clip.id}
        src={url}
        controls
        autoPlay
        playsInline
        className="flex-1 min-h-0 w-full object-contain"
      />
    </div>,
    document.body
  );
};

export default ClipFullscreen;
