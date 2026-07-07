import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteClip, listClips, subscribe } from '../utils/clipStore';

// Shared access to the locally-stored timelapse clips. Every mounted instance
// stays in sync via the clipStore pub/sub, so a recording finished in the
// camera panel immediately shows up in the focus-window gallery and vice versa.
//
// Manages lazy object URLs for each clip's blob and revokes them when the clip
// is gone or the component unmounts.
export default function useClips() {
  const [clips, setClips] = useState([]);
  const urlMapRef = useRef(new Map());

  const clipUrl = useCallback((rec) => {
    let u = urlMapRef.current.get(rec.id);
    if (!u) {
      u = URL.createObjectURL(rec.blob);
      urlMapRef.current.set(rec.id, u);
    }
    return u;
  }, []);

  const reload = useCallback(async () => {
    let rows = [];
    try {
      rows = await listClips();
    } catch {
      rows = [];
    }
    // Revoke URLs for clips that no longer exist.
    const ids = new Set(rows.map((r) => r.id));
    urlMapRef.current.forEach((u, id) => {
      if (!ids.has(id)) {
        URL.revokeObjectURL(u);
        urlMapRef.current.delete(id);
      }
    });
    setClips(rows);
    return rows;
  }, []);

  useEffect(() => {
    reload();
    const unsub = subscribe(reload);
    const map = urlMapRef.current;
    return () => {
      unsub();
      map.forEach((u) => URL.revokeObjectURL(u));
      map.clear();
    };
  }, [reload]);

  // deleteClip notifies the store, which triggers reload() in every instance.
  const remove = useCallback((id) => deleteClip(id).catch(() => {}), []);

  return { clips, clipUrl, remove, reload };
}
