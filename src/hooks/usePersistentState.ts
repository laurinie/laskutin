import { useEffect, useState } from 'react';

function restore<T>(key: string, legacyKey: string | undefined, fallback: () => T): T {
  try {
    const raw = localStorage.getItem(key) ?? (legacyKey ? localStorage.getItem(legacyKey) : null);
    if (!raw) return fallback();

    const stored = JSON.parse(raw) as T;
    const isPlainObject = stored !== null && typeof stored === 'object' && !Array.isArray(stored);
    return isPlainObject ? { ...fallback(), ...stored } : stored;
  } catch {
    return fallback();
  }
}

export function usePersistentState<T>(key: string, initial: () => T, legacyKey?: string) {
  const [value, setValue] = useState<T>(() => restore(key, legacyKey, initial));
  const [storageFull, setStorageFull] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      setStorageFull(false);
    } catch {
      setStorageFull(true);
    }
  }, [key, value]);

  return { value, setValue, storageFull };
}
