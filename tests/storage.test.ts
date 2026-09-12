import { test, beforeEach } from 'vitest';
import assert from 'node:assert/strict';

import { clearStoredData, persistEnabled, setPersistEnabled, storedBytes, storedKeys, STORAGE_PREFIX } from '../src/lib/storage.js';

function fakeStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => { data.delete(key); },
    setItem: (key: string, value: string) => { data.set(key, value); }
  } as Storage;
}

beforeEach(() => {
  globalThis.localStorage = fakeStorage();
  localStorage.setItem(`${STORAGE_PREFIX}v1`, '{"title":"Lasku"}');
  localStorage.setItem(`${STORAGE_PREFIX}logo`, '{"dataUrl":"x"}');
  localStorage.setItem('muu.sovellus', 'ei kuulu meille');
});

test('tallennus on oletuksena päällä', () => {
  assert.equal(persistEnabled(), true);
});

test('tallennuksen voi kytkeä pois ja takaisin', () => {
  setPersistEnabled(false);
  assert.equal(persistEnabled(), false);
  setPersistEnabled(true);
  assert.equal(persistEnabled(), true);
});

test('tallennetut kohteet listataan ilman asetusavainta', () => {
  setPersistEnabled(true);
  assert.deepEqual(storedKeys().sort(), [`${STORAGE_PREFIX}logo`, `${STORAGE_PREFIX}v1`]);
});

test('tyhjennys poistaa vain oman sovelluksen tiedot', () => {
  const removed = clearStoredData();
  assert.equal(removed, 2);
  assert.deepEqual(storedKeys(), []);
  assert.equal(localStorage.getItem('muu.sovellus'), 'ei kuulu meille');
});

test('tyhjennys ei poista tallennusasetusta', () => {
  setPersistEnabled(false);
  clearStoredData();
  assert.equal(persistEnabled(), false, 'valinta säilyy tyhjennyksen yli');
});

test('koko lasketaan tallennetuista kohteista', () => {
  assert.ok(storedBytes() > 20);
  clearStoredData();
  assert.equal(storedBytes(), 0);
});
