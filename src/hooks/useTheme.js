import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'flow-theme';

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'work';
    } catch {
      return 'work';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'personal') {
      root.setAttribute('data-theme', 'personal');
    } else {
      root.removeAttribute('data-theme');
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
  }, []);

  return { theme, setTheme };
}
