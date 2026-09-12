export const STORAGE_PREFIX = 'luolaskut.';
const PERSIST_KEY = `${STORAGE_PREFIX}persist`;

export function persistEnabled(): boolean {
  try {
    return localStorage.getItem(PERSIST_KEY) !== 'off';
  } catch {
    return false;
  }
}

export function setPersistEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(PERSIST_KEY, enabled ? 'on' : 'off');
  } catch {
    /* tallennustila ei käytettävissä */
  }
}

export function storedKeys(): string[] {
  try {
    const keys: string[] = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key?.startsWith(STORAGE_PREFIX) && key !== PERSIST_KEY) keys.push(key);
    }
    return keys;
  } catch {
    return [];
  }
}

export function clearStoredData(): number {
  const keys = storedKeys();
  for (const key of keys) localStorage.removeItem(key);
  return keys.length;
}

export function storedBytes(): number {
  return storedKeys().reduce((total, key) => total + (localStorage.getItem(key)?.length ?? 0), 0);
}
