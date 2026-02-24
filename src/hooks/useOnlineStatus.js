import { useState, useEffect, useRef, useCallback } from 'react';
import { getSupabase } from '../api/supabaseClient';

const PING_INTERVAL = 30_000; // 30 seconds

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isReachable, setIsReachable] = useState(true); // Supabase reachable
  const intervalRef = useRef(null);

  // Browser online/offline events
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => {
      setIsOnline(false);
      setIsReachable(false);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Periodic Supabase reachability check
  const checkReachability = useCallback(async () => {
    if (!navigator.onLine) {
      setIsReachable(false);
      return false;
    }
    try {
      const supabase = getSupabase();
      if (!supabase) {
        setIsReachable(false);
        return false;
      }
      // Lightweight query — just check if we can talk to Supabase
      const { error } = await supabase
        .from('task_tree')
        .select('id', { count: 'exact', head: true })
        .limit(0);
      const reachable = !error;
      setIsReachable(reachable);
      return reachable;
    } catch {
      setIsReachable(false);
      return false;
    }
  }, []);

  // Start periodic check when browser is online but Supabase was unreachable
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (isOnline && !isReachable) {
      // Check immediately, then periodically
      checkReachability();
      intervalRef.current = setInterval(checkReachability, PING_INTERVAL);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isOnline, isReachable, checkReachability]);

  // Also do an initial check on mount
  useEffect(() => {
    checkReachability();
  }, [checkReachability]);

  // Effective connectivity = browser online AND Supabase reachable
  const effectivelyOnline = isOnline && isReachable;

  return { isOnline: effectivelyOnline, markUnreachable: () => setIsReachable(false), markReachable: () => setIsReachable(true) };
}
