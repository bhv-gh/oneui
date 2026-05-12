import React, { useState, useEffect, useRef } from 'react';

const DEFAULT_EMOJIS = ['✨', '🌟', '💫', '⭐', '🌸', '🍃', '🦋', '💜', '🌙'];

const FloatingEmoji = ({ emoji, style }) => (
  <div
    className="fixed pointer-events-none select-none animate-float-emoji"
    style={style}
  >
    {emoji}
  </div>
);

const FloatingEmojis = ({ customEmojis, intensity = 'normal' }) => {
  const [particles, setParticles] = useState([]);
  const idRef = useRef(0);
  const emojis = customEmojis && customEmojis.length > 0 ? customEmojis : DEFAULT_EMOJIS;

  const counts = { low: 4, normal: 7, high: 12 };
  const maxParticles = counts[intensity] || 7;

  useEffect(() => {
    const spawn = () => {
      if (particles.length >= maxParticles) return;

      const id = idRef.current++;
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      const left = 5 + Math.random() * 90;
      const duration = 15 + Math.random() * 25;
      const delay = Math.random() * 5;
      const size = 10 + Math.random() * 14;
      const drift = -30 + Math.random() * 60;

      setParticles(prev => [...prev, {
        id, emoji,
        style: {
          left: `${left}%`,
          bottom: '-20px',
          fontSize: `${size}px`,
          opacity: 0.15 + Math.random() * 0.15,
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
          '--drift': `${drift}px`,
          zIndex: 1,
        }
      }]);

      setTimeout(() => {
        setParticles(prev => prev.filter(p => p.id !== id));
      }, (duration + delay) * 1000);
    };

    // Initial batch
    for (let i = 0; i < Math.min(maxParticles, 4); i++) {
      setTimeout(spawn, i * 800);
    }

    const interval = setInterval(spawn, 3000 + Math.random() * 4000);
    return () => clearInterval(interval);
  }, [emojis, maxParticles]);

  return (
    <>
      {particles.map(p => (
        <FloatingEmoji key={p.id} emoji={p.emoji} style={p.style} />
      ))}
    </>
  );
};

export default FloatingEmojis;
