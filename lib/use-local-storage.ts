"use client";

import { useCallback, useEffect, useState, type SetStateAction } from "react";

interface Loaded<T> {
  key: string;
  value: T;
}

/**
 * localStorage-backed state. Reads only after mount (no hydration mismatch).
 * Never writes until the value for the current key has been loaded, so changing
 * the key (for example, switching dates) cannot overwrite another key's data.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);

  useEffect(() => {
    let value = initial;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) value = JSON.parse(raw) as T;
    } catch {
      // Corrupt or unreadable data: fall back to the initial value.
    }
    setLoaded({ key, value });
    // `initial` is intentionally excluded: it is only a fallback value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const ready = loaded !== null && loaded.key === key;
  const value = ready ? loaded.value : initial;

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or disabled (private mode). The page keeps working in memory.
    }
  }, [key, value, ready]);

  const setValue = useCallback(
    (action: SetStateAction<T>) => {
      setLoaded((prev) => {
        const current = prev && prev.key === key ? prev.value : initial;
        const next = typeof action === "function" ? (action as (p: T) => T)(current) : action;
        return { key, value: next };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  return { value, setValue, ready };
}
