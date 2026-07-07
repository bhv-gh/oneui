// Canvas + audio helpers for composing a fancy timelapse: an animated intro
// title card, per-frame overlays (task title + focus %), and a generated
// ambient soundtrack that gets muxed into the exported clip.

// Map a focus percentage to a pleasant status color.
export function focusColor(pct) {
  if (pct >= 70) return '#34d399'; // green
  if (pct >= 40) return '#fbbf24'; // amber
  return '#ff6b6b'; // red
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function ellipsize(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
  return t + '…';
}

// Draw the animated opening card. `p` is 0..1 progress for the fade/slide.
export function drawIntroCard(ctx, w, h, meta, p) {
  const { taskText, durationLabel, dateLabel, focusPct } = meta;
  const ease = 1 - Math.pow(1 - Math.min(1, p), 3); // easeOutCubic
  const alpha = Math.min(1, p * 2.2);
  const rise = (1 - ease) * h * 0.06;

  // background gradient
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#0b1020');
  g.addColorStop(1, '#141a33');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // soft accent glow
  const glow = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, w * 0.55);
  const fc = focusColor(focusPct);
  glow.addColorStop(0, fc + '33');
  glow.addColorStop(1, '#00000000');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';

  // eyebrow
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `600 ${Math.round(h * 0.05)}px system-ui, sans-serif`;
  ctx.fillText('FOCUS SESSION', w / 2, h * 0.24 + rise);

  // task title
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${Math.round(h * 0.11)}px system-ui, sans-serif`;
  ctx.fillText(ellipsize(ctx, taskText || 'Untitled Task', w * 0.86), w / 2, h * 0.42 + rise);

  // duration
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = `600 ${Math.round(h * 0.06)}px system-ui, sans-serif`;
  ctx.fillText(`Focused for ${durationLabel}`, w / 2, h * 0.56 + rise);

  // focus % ring
  const cx = w / 2;
  const cy = h * 0.74 + rise;
  const R = h * 0.1;
  ctx.lineWidth = Math.max(4, h * 0.018);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = fc;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + (focusPct / 100) * Math.PI * 2 * ease);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${Math.round(h * 0.06)}px system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText(`${focusPct}%`, cx, cy);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = `500 ${Math.round(h * 0.032)}px system-ui, sans-serif`;
  ctx.fillText('focused', cx, cy + R + h * 0.05);

  // date bottom
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = `500 ${Math.round(h * 0.035)}px system-ui, sans-serif`;
  ctx.fillText(dateLabel || '', w / 2, h * 0.95);
  ctx.restore();
}

// Draw per-frame overlays: a colored focus-frame border, a bottom-left title
// info chip, and a top-right focus-% badge.
export function drawOverlay(ctx, w, h, { taskText, focusPct }) {
  const fc = focusColor(focusPct);

  // focus-colored frame
  const lw = Math.max(4, Math.round(w * 0.012));
  ctx.save();
  ctx.strokeStyle = fc;
  ctx.lineWidth = lw;
  ctx.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
  ctx.restore();

  // bottom-left title chip
  if (taskText) {
    const pad = Math.round(w * 0.018);
    const fs = Math.max(11, Math.round(h * 0.05));
    ctx.font = `600 ${fs}px system-ui, sans-serif`;
    const label = ellipsize(ctx, taskText, w * 0.6);
    const tw = ctx.measureText(label).width;
    const bx = pad;
    const by = h - pad - (fs + pad);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(ctx, bx, by, tw + pad * 2, fs + pad, Math.round(fs * 0.4));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx + pad, by + (fs + pad) / 2);
    ctx.textBaseline = 'alphabetic';
  }

  // top-right focus badge
  const bfs = Math.max(11, Math.round(h * 0.05));
  ctx.font = `700 ${bfs}px system-ui, sans-serif`;
  const btxt = `● ${focusPct}%`;
  const bpad = Math.round(w * 0.016);
  const bw = ctx.measureText(btxt).width + bpad * 2;
  const bh = bfs + bpad;
  const bx = w - bpad - bw;
  const by = bpad;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(ctx, bx, by, bw, bh, Math.round(bfs * 0.4));
  ctx.fill();
  ctx.fillStyle = fc;
  ctx.textBaseline = 'middle';
  ctx.fillText(btxt, bx + bpad, by + bh / 2);
  ctx.textBaseline = 'alphabetic';
}

// Build a gentle generated ambient soundtrack routed to a MediaStream audio
// track (for muxing into the recording). Not connected to speakers, so the
// short encode stays silent to the user but the exported file has music.
export function createAmbient() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  let ctx;
  try {
    ctx = new AC();
  } catch {
    return null;
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const dest = ctx.createMediaStreamDestination();
  const master = ctx.createGain();
  master.gain.value = 0.0001;
  master.connect(dest);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1100;
  filter.connect(master);

  const padGain = ctx.createGain();
  padGain.gain.value = 0.05;
  padGain.connect(filter);

  const o1 = ctx.createOscillator();
  o1.type = 'sine';
  o1.frequency.value = 174.61; // F3 pad root
  const o2 = ctx.createOscillator();
  o2.type = 'sine';
  o2.frequency.value = 261.63; // C4
  o2.detune.value = 5;
  o1.connect(padGain);
  o2.connect(padGain);

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.08;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 350;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  const now = ctx.currentTime;
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(1, now + 0.8);
  o1.start();
  o2.start();
  lfo.start();

  // pentatonic arpeggio scheduler
  function schedule(durationSec) {
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0]; // C5 D5 E5 G5 A5
    let t = now + 0.6;
    const end = now + durationSec;
    while (t < end) {
      const f = scale[Math.floor(Math.random() * scale.length)] * (Math.random() < 0.25 ? 0.5 : 1);
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(master);
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      o.connect(g);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.04, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      o.start(t);
      o.stop(t + 0.75);
      t += 0.32 + Math.random() * 0.34;
    }
  }

  return {
    track: dest.stream.getAudioTracks()[0],
    schedule,
    stop: async () => {
      try {
        master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      } catch {
        /* ignore */
      }
      await new Promise((r) => setTimeout(r, 320));
      try {
        await ctx.close();
      } catch {
        /* ignore */
      }
    },
  };
}
