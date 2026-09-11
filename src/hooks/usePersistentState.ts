import { useEffect, useState } from 'react';

export interface PersistOptions<T> {
  legacyKey?: string;
  migrate?: (stored: Record<string, unknown>) => Partial<T>;
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
  const [value, setValue] = useState<T>(() => restore(key, initial, options));
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
