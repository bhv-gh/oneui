import * as api from '../api/client';

let audioContext = null;

const getAudioContext = () => {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
};

const sounds = {
  bell: (ctx) => {
    const now = ctx.currentTime;
    [
      { freq: 830.6, vol: 0.4, decay: 1.5 },
      { freq: 1661.2, vol: 0.15, decay: 0.8 },
    ].forEach(({ freq, vol, decay }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + decay);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + decay);
    });
  },

  chime: (ctx) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.15;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1.0);
    });
  },

  digital: (ctx) => {
    for (let i = 0; i < 3; i++) {
      const t = ctx.currentTime + i * 0.18;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.setValueAtTime(0, t + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    }
  },

  gentle: (ctx) => {
    const now = ctx.currentTime;
    [440, 554.37].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 2.0);
    });
  },
};

export const SOUND_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'bell', label: 'Bell' },
  { id: 'chime', label: 'Chime' },
  { id: 'digital', label: 'Digital' },
  { id: 'gentle', label: 'Gentle' },
];

export const playNotificationSound = (soundId) => {
  if (!soundId || soundId === 'none' || !sounds[soundId]) return;
  try {
    const ctx = getAudioContext();
    sounds[soundId](ctx);
  } catch (e) {
    console.error('Failed to play notification sound:', e);
  }
};

export const getNotificationSound = () => {
  return localStorage.getItem('flow-notification-sound') || 'bell';
};

export const setNotificationSound = (soundId) => {
  localStorage.setItem('flow-notification-sound', soundId);
  api.updateSettings({ notificationSound: soundId }).catch(console.error);
};
