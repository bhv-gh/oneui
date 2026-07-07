import React, { useState } from 'react';
import { Play } from 'lucide-react';
import useClips from '../hooks/useClips';
import ClipFullscreen from './ClipFullscreen';

const fmtTime = (ms) => {
  try {
    return new Date(ms).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

// Embeddable timelapse gallery (used in Settings). Grid of saved-clip
// thumbnails; clicking one opens the fullscreen player.
const ClipGallery = () => {
  const { clips, clipUrl, remove } = useClips();
  const [fsId, setFsId] = useState(null);
  const fsClip = clips.find((c) => c.id === fsId) || null;

  if (!clips.length) {
    return <p className="text-xs text-content-muted">No timelapses yet. Record one from the focus camera.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {clips.map((c) => (
          <button
            key={c.id}
            onClick={() => setFsId(c.id)}
            className="group relative aspect-video rounded-lg overflow-hidden border border-edge-primary/60 bg-black/40 hover:border-accent transition-colors"
            title={`${fmtTime(c.createdAt)} · ${c.secs}s`}
          >
            <video
              src={clipUrl(c)}
              muted
              playsInline
              preload="metadata"
              className="w-full h-full object-cover"
              onLoadedMetadata={(e) => {
                try {
                  e.target.currentTime = 0.05; // nudge past a blank first frame
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

      <ClipFullscreen
        clip={fsClip}
        url={fsClip ? clipUrl(fsClip) : null}
        onDelete={remove}
        onClose={() => setFsId(null)}
      />
    </>
  );
};

export default ClipGallery;
