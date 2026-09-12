import { useEffect, useState } from 'react';

export interface PersistOptions<T> {
  legacyKey?: string;
  migrate?: (stored: Record<string, unknown>) => Partial<T>;
  persist?: boolean;
}

function restore<T>(key: string, fallback: () => T, options: PersistOptions<T>): T {
  try {
    const raw = localStorage.getItem(key) ?? (options.legacyKey ? localStorage.getItem(options.legacyKey) : null);
    if (!raw) return fallback();

    const stored = JSON.parse(raw) as T;
    const isPlainObject = stored !== null && typeof stored === 'object' && !Array.isArray(stored);
    if (!isPlainObject) return stored;

    const migrated = options.migrate?.(stored as Record<string, unknown>) ?? stored;
    return { ...fallback(), ...migrated };
  } catch {
    return fallback();
  }
}

export function usePersistentState<T>(key: string, initial: () => T, options: PersistOptions<T> = {}) {
  const persist = options.persist ?? true;
  const [value, setValue] = useState<T>(() => restore(key, initial, options));
  const [storageFull, setStorageFull] = useState(false);

  useEffect(() => {
    try {
      if (persist) {
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        localStorage.removeItem(key);
        if (options.legacyKey) localStorage.removeItem(options.legacyKey);
      }
      setStorageFull(false);
    } catch {
      setStorageFull(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, value, persist]);

  return { value, setValue, storageFull };
}
