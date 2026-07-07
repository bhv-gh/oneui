import React, { useState } from 'react';
import { Download, Film, Play, Trash2, X } from 'lucide-react';
import useClips from '../hooks/useClips';
import YouTubeUploadButton from './YouTubeUploadButton';

// Persistent timelapse gallery shown in the Focus window. Renders saved clips
// as small live-video thumbnails; clicking one opens a fullscreen player with
// export + delete. Stays in sync with the camera panel via the shared store.
const ClipGallery = () => {
  const { clips, clipUrl, remove } = useClips();
  const [fsId, setFsId] = useState(null);

  if (!clips.length) return null;

  const fsClip = clips.find((c) => c.id === fsId) || null;
  const fmtTime = (ms) => {
    try {
      return new Date(ms).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <>
      {/* thumbnail strip — top-left of the focus window */}
      <div className="absolute top-6 left-6 z-[210] max-w-[42vw]">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-content-tertiary mb-1.5">
          <Film size={12} /> Timelapses ({clips.length})
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 max-w-full">
          {clips.map((c) => (
            <button
              key={c.id}
              onClick={() => setFsId(c.id)}
              className="group relative shrink-0 w-24 aspect-video rounded-lg overflow-hidden border border-edge-primary/60 bg-black/40 hover:border-accent transition-colors"
              title={`${fmtTime(c.createdAt)} · ${c.secs}s`}
            >
              <video
                src={clipUrl(c)}
                muted
                playsInline
                preload="metadata"
                className="w-full h-full object-cover"
                onLoadedMetadata={(e) => {
                  // Nudge to the first frame so the thumbnail isn't blank.
                  try {
                    e.target.currentTime = 0.05;
                  } catch {
                    /* ignore */
                  }
                }}
              />
              <span className="absolute inset-0 grid place-items-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                <Play size={18} className="text-white drop-shadow" />
              </span>
              <span className="absolute bottom-0 inset-x-0 bg-black/55 text-white text-[9px] px-1 py-0.5 truncate">
                {c.secs}s
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* fullscreen player */}
      {fsClip && (
        <div className="fixed inset-0 z-[400] bg-black/95 flex flex-col animate-in fade-in duration-200">
          <div className="flex items-center gap-3 px-5 py-3 text-white/90">
            <span className="flex items-center gap-2 text-sm font-medium min-w-0 truncate">
              <Film size={16} /> {fmtTime(fsClip.createdAt)} · {fsClip.secs}s ·{' '}
              {(fsClip.bytes / 1048576).toFixed(1)} MB
            </span>
            <div className="flex-1" />
            <a
              href={clipUrl(fsClip)}
              download={`focus-timelapse-${fsClip.createdAt}.webm`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Download size={16} /> Export
            </a>
            <YouTubeUploadButton clip={fsClip} dark />
            <button
              onClick={() => {
                remove(fsClip.id);
                setFsId(null);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white/10 hover:bg-red-500/30 transition-colors"
            >
              <Trash2 size={16} /> Delete
            </button>
            <button
              onClick={() => setFsId(null)}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
          <video
            key={fsClip.id}
            src={clipUrl(fsClip)}
            controls
            autoPlay
            playsInline
            className="flex-1 min-h-0 w-full object-contain"
          />
        </div>
      )}
    </>
  );
};

export default ClipGallery;
