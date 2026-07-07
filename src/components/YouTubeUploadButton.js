import React, { useState } from 'react';
import { Check, Loader2, Youtube } from 'lucide-react';
import { isYouTubeConfigured, uploadToYouTube } from '../utils/youtube';
import { sendWhatsApp } from '../utils/notifyWhatsapp';

function fmtDuration(ms) {
  if (!ms) return '';
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

// Uploads a stored clip to YouTube (private). Handles the OAuth token flow,
// progress, and success/error state. Renders disabled with a hint if the
// Google client ID isn't configured.
const YouTubeUploadButton = ({ clip, dark = false, className = '' }) => {
  const [state, setState] = useState('idle'); // idle | uploading | done | error
  const [progress, setProgress] = useState(0);
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState(null);
  const configured = isYouTubeConfigured();

  const base = dark
    ? 'bg-white/10 hover:bg-white/20 text-white'
    : 'bg-surface-secondary text-content-secondary hover:text-content-primary';

  if (!configured) {
    return (
      <span
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium opacity-50 cursor-not-allowed ${base} ${className}`}
        title="Set REACT_APP_GOOGLE_CLIENT_ID in .env to enable YouTube upload"
      >
        <Youtube size={16} /> YouTube
      </span>
    );
  }

  if (state === 'done' && url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-500/15 text-green-500 ${className}`}
      >
        <Check size={16} /> On YouTube
      </a>
    );
  }

  const run = async () => {
    if (state === 'uploading') return;
    setState('uploading');
    setErr(null);
    setProgress(0);
    try {
      const task = clip.taskText || 'Untitled task';
      const pct = clip.focusPct != null ? `${clip.focusPct}% focused` : 'focus timelapse';
      const created = clip.createdAt ? new Date(clip.createdAt) : new Date();
      const shortDate = created.toLocaleDateString([], { month: 'short', day: 'numeric' });
      const longDate = created.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      const title = clip.taskText
        ? `${task} — Focus Timelapse · ${pct} · ${shortDate}`
        : `Focus Timelapse · ${pct} · ${shortDate}`;
      const description = [
        '🍅 Focus session timelapse',
        '',
        `Task: ${task}`,
        `Duration: ${fmtDuration(clip.durationMs) || '—'}`,
        `Focus: ${clip.focusPct != null ? clip.focusPct + '%' : '—'}`,
        `Date: ${longDate}`,
        '',
        'Recorded on-device with oneui focus camera.',
      ].join('\n');

      const res = await uploadToYouTube(clip.blob, {
        title,
        description,
        onProgress: setProgress,
      });
      setUrl(res.url);
      setState('done');
      // The only WhatsApp trigger: notify with the uploaded video link.
      sendWhatsApp(`🎥 Timelapse uploaded${clip.taskText ? ` — ${clip.taskText}` : ''}: ${res.url}`);
    } catch (e) {
      setErr(e.message || 'Upload failed');
      setState('error');
    }
  };

  return (
    <button
      onClick={run}
      disabled={state === 'uploading'}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-70 ${
        state === 'error' ? 'bg-red-500/15 text-red-500' : base
      } ${className}`}
      title={err || 'Upload to YouTube (private)'}
    >
      {state === 'uploading' ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          {Math.round(progress * 100)}%
        </>
      ) : (
        <>
          <Youtube size={16} /> {state === 'error' ? 'Retry' : 'YouTube'}
        </>
      )}
    </button>
  );
};

export default YouTubeUploadButton;
