import * as api from '../api/client';

let audioElement = null;
let currentSrc = '';

const getAudio = () => {
  if (!audioElement) {
    audioElement = new Audio();
    audioElement.loop = true;
    audioElement.volume = getBgMusicVolume();
    audioElement.preload = 'none';
  }
  return audioElement;
};

export const getBgMusicUrl = () => {
  return localStorage.getItem('flow-bg-music-url') || '';
};

export const setBgMusicUrl = (url) => {
  localStorage.setItem('flow-bg-music-url', url);
  api.updateSettings({ bgMusicUrl: url }).catch(console.error);
  if (url !== currentSrc) {
    currentSrc = url;
    const audio = getAudio();
    audio.src = url;
    audio.load();
  }
};

export const getBgMusicVolume = () => {
  const stored = localStorage.getItem('flow-bg-music-volume');
  if (stored !== null) {
    const val = parseFloat(stored);
    return isNaN(val) ? 0.3 : val;
  }
  return 0.3;
};

export const setBgMusicVolume = (volume) => {
  const clamped = Math.max(0, Math.min(1, volume));
  localStorage.setItem('flow-bg-music-volume', String(clamped));
  api.updateSettings({ bgMusicVolume: clamped }).catch(console.error);
  getAudio().volume = clamped;
};

export const playBgMusic = () => {
  const url = getBgMusicUrl();
  if (!url) return;
  const audio = getAudio();
  if (currentSrc !== url) {
    audio.src = url;
    currentSrc = url;
  }
  audio.play().catch(e => console.warn('Background music play failed:', e));
};

export const pauseBgMusic = () => {
  if (audioElement && !audioElement.paused) {
    audioElement.pause();
  }
};

export const isBgMusicPlaying = () => {
  return audioElement ? !audioElement.paused : false;
};
