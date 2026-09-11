import { test } from 'vitest';
import assert from 'node:assert/strict';

import { money, parseAmount, fmtDate, isEmail, slug, csvField } from '../src/lib/format.js';
import { refWithCheck, refIsValid, refPretty, referenceFor, ibanValid, ibanPretty } from '../src/lib/reference.js';
import { parseMembers, parseLineItems, itemsFor, splitCols } from '../src/lib/members.js';
import type { Member, ReferenceOptions } from '../src/lib/types.js';

const member = (over: Partial<Member> = {}): Member =>
  ({ name: 'Testi', email: 'testi@example.com', amount: null, badEmail: false, ...over });

test('viitenumeron tarkiste (7-3-1)', () => {
  assert.equal(refWithCheck('1234'), '12344');
  assert.equal(refWithCheck('1232'), '12328');
  assert.equal(refWithCheck('13'), null, 'liian lyhyt runko');
  assert.equal(refWithCheck('1'.repeat(20)), null, 'liian pitkä runko');
  assert.ok(refIsValid(refWithCheck('202600001')!));
  assert.ok(!refIsValid('12327'));
  assert.equal(refPretty('202600011'), '2026 00011');
});

test('viitteet per jäsen ja yhteisenä', () => {
  const per: ReferenceOptions = { mode: 'per', prefix: '2026', start: 1, shared: '' };
  assert.equal(referenceFor(0, per), '202600017');
  assert.notEqual(referenceFor(0, per), referenceFor(1, per));
  const shared: ReferenceOptions = { mode: 'shared', prefix: '', start: 1, shared: '2026 0001' };
  assert.equal(referenceFor(0, shared), referenceFor(5, shared), 'yhteinen viite on sama kaikille');
  assert.ok(refIsValid(referenceFor(0, shared)), 'tarkiste lisätään runkoon');
});

test('IBAN-tarkistus', () => {
  assert.ok(ibanValid('FI21 1234 5600 0007 85'));
  assert.ok(!ibanValid('FI21 1234 5600 0007 86'));
  assert.ok(!ibanValid('roskaa'));
  assert.equal(ibanPretty('fi2112345600000785'), 'FI21 1234 5600 0007 85');
});

test('muotoilut', () => {
  assert.equal(money(1234.5), '1 234,50 €');
  assert.equal(money(40), '40,00 €');
  assert.equal(parseAmount('1 200,50 €'), 1200.5);
  assert.equal(parseAmount('ei summa'), null);
  assert.equal(fmtDate('2026-09-11'), '11.9.2026');
  assert.ok(isEmail('a@b.fi'));
  assert.ok(!isEmail('a@b'));
  assert.equal(slug('Ömer Äkkinen'), 'Omer_Akkinen');
  assert.equal(csvField('Virtanen; Maija'), '"Virtanen; Maija"');
});

test('jäsenlista otsikkorivin kanssa', () => {
  const { members, columnInfo } = parseMembers(
    'Jäsennumero;Nimi;Sähköposti;Jäsenmaksu\n1;Matti Meikäläinen;matti@example.com;40,00\n2;Maija Virtanen;maija@example.com;'
  );
  assert.equal(members.length, 2);
  assert.deepEqual([members[0]!.name, members[0]!.email, members[0]!.amount],
    ['Matti Meikäläinen', 'matti@example.com', 40]);
  assert.equal(members[1]!.amount, null, 'tyhjä summa ei ole 0');
  assert.match(columnInfo, /summa: Jäsenmaksu/);
  assert.ok(!/Jäsennumero/.test(columnInfo), 'jäsennumeroa ei tulkita summaksi');
});

test('etunimi- ja sukunimisarakkeet yhdistetään', () => {
  const { members } = parseMembers('Etunimi,Sukunimi,Email,Amount\nMatti,Meikäläinen,matti@example.com,25.50');
  assert.equal(members[0]!.name, 'Matti Meikäläinen');
  assert.equal(members[0]!.amount, 25.5);
});

test('ilman otsikkoriviä sarakkeet päätellään sisällöstä', () => {
  const { members } = parseMembers('Matti Meikäläinen;matti@example.com;40,00\nMaija Virtanen;maija@example.com');
  assert.deepEqual(members.map((m) => [m.name, m.amount]), [['Matti Meikäläinen', 40], ['Maija Virtanen', null]]);
});

test('puuttuva sähköposti merkitään', () => {
  const { members } = parseMembers('Nimi;Sähköposti\nMatti Meikäläinen;ei-sposti');
  assert.ok(members[0]!.badEmail);
});

test('lainausmerkit ja erottimet', () => {
  assert.deepEqual(splitCols('"Virtanen, Maija";maija@example.com'), ['Virtanen, Maija', 'maija@example.com']);
  assert.deepEqual(splitCols('a\tb\tc'), ['a', 'b', 'c']);
});

test('laskurivit ja jäsenkohtainen summa', () => {
  const base = parseLineItems('Jäsenmaksu 2026;40,00\nLehtitilaus;12,50');
  assert.deepEqual(base, [{ desc: 'Jäsenmaksu 2026', amount: 40 }, { desc: 'Lehtitilaus', amount: 12.5 }]);

  const withoutOwn = itemsFor(member(), base, 'Lasku');
  assert.equal(withoutOwn.length, 2, 'ilman omaa summaa käytetään oletusrivejä');

  const withOwn = itemsFor(member({ amount: 20 }), base, 'Lasku');
  assert.deepEqual(withOwn, [{ desc: 'Jäsenmaksu 2026', amount: 20 }], 'oma summa korvaa rivit');
});
