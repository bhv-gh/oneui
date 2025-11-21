import { useState, useEffect } from 'react';

export function useMemoryData() {
  const [memoryData, setMemoryData] = useState(() => {
    try {
      const savedJSON = localStorage.getItem('flowAppMemoryV1');
      if (savedJSON) {
        return JSON.parse(savedJSON);
      }
    } catch (e) {
      console.error("Failed to load memory data from localStorage:", e);
    }
    return { notes: [], qas: [] };
  });

  useEffect(() => {
    localStorage.setItem('flowAppMemoryV1', JSON.stringify(memoryData));
  }, [memoryData]);

  return { memoryData, setMemoryData };
}
