import { test } from 'vitest';
import assert from 'node:assert/strict';

import { analyticsUrl, sizeBucket } from '../src/lib/analytics.js';

const ENDPOINT = 'https://laskutin.goatcounter.com/count';

test('kävijälaskenta osoittaa polkuun eikä ole tapahtuma', () => {
  const url = new URL(analyticsUrl(ENDPOINT, '/', false, 0.5));
  assert.equal(url.origin + url.pathname, ENDPOINT);
  assert.equal(url.searchParams.get('p'), '/');
  assert.equal(url.searchParams.get('e'), null);
  assert.ok(url.searchParams.get('rnd'), 'välimuistin ohitus mukana');
});

test('tapahtuma merkitään e-parametrilla', () => {
  const url = new URL(analyticsUrl(ENDPOINT, 'pdf-2-10', true, 0.5));
  assert.equal(url.searchParams.get('p'), 'pdf-2-10');
  assert.equal(url.searchParams.get('e'), 'true');
});

test('osoitteeseen ei päädy muuta tietoa', () => {
  const url = new URL(analyticsUrl(ENDPOINT, 'zip-11-50', true, 0.5));
  assert.deepEqual([...url.searchParams.keys()].sort(), ['e', 'p', 'rnd']);
});

test('laskujen määrä luokitellaan väleihin', () => {
  assert.equal(sizeBucket(0), '1');
  assert.equal(sizeBucket(1), '1');
  assert.equal(sizeBucket(10), '2-10');
  assert.equal(sizeBucket(11), '11-50');
  assert.equal(sizeBucket(200), '51-200');
  assert.equal(sizeBucket(201), '200+');
});
