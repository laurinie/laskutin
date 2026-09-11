import { test } from 'vitest';
import assert from 'node:assert/strict';
import CODE128C from 'jsbarcode/bin/barcodes/CODE128/CODE128C.js';

import { code128c, barsOf } from '../src/lib/code128.js';
import { virtualBarcode, BARCODE_LENGTH } from '../src/lib/barcode.js';

const jsBarcodeModules = (digits: string): string => new CODE128C(digits, {}).encode().data;

test('Code 128C vastaa jsbarcoden koodausta', () => {
  const samples = [
    '00',
    '1234',
    '479440520200360820048831500000000868516259619897100612',
    '400000000000000000000000000000000000000000000000000000'
  ];
  for (const sample of samples) {
    assert.equal(code128c(sample), jsBarcodeModules(sample), sample);
  }
});

test('Code 128C satunnaisilla 54-numeroisilla koodeilla', () => {
  for (let i = 0; i < 50; i++) {
    const digits = Array.from({ length: BARCODE_LENGTH }, () => String(Math.floor(Math.random() * 10))).join('');
    assert.equal(code128c(digits), jsBarcodeModules(digits));
  }
});

test('Code 128C hylkää parittoman pituuden', () => {
  assert.throws(() => code128c('123'));
  assert.throws(() => code128c('12a4'));
});

test('viivakoodin moduulit ja palkit', () => {
  const modules = code128c('479440520200360820048831500000000868516259619897100612');
  assert.equal(modules.length, 11 * 29 + 13, '29 symbolia 11 moduulia + stop 13');

  const bars = barsOf(modules, 0.3);
  assert.ok(bars.length > 20);
  assert.ok(bars.every((bar) => bar.width > 0));
});

test('virtuaaliviivakoodi oppaan rakenteen mukaan', () => {
  const result = virtualBarcode({
    iban: 'FI79 4405 2020 0360 82',
    dueDate: '2010-06-12',
    total: 4883.15,
    reference: '868516259619897'
  });
  assert.equal(result.error, undefined);
  assert.equal(result.code, '4' + '7944052020036082' + '004883' + '15' + '000' + '00000868516259619897' + '100612');
  assert.equal(result.code!.length, BARCODE_LENGTH);
});

test('eräpäivätön lasku saa nollat', () => {
  const { code } = virtualBarcode({ iban: 'FI7944052020036082', dueDate: '', total: 40, reference: '202600017' });
  assert.equal(code!.slice(-6), '000000');
  assert.equal(code!.slice(17, 25), '00004000');
});

test('kelpaamattomat syötteet kerrotaan selkokielellä', () => {
  assert.match(virtualBarcode({ iban: 'DE89370400440532013000', dueDate: '', total: 1, reference: '1232' }).error!, /suomalaisen IBANin/);
  assert.match(virtualBarcode({ iban: 'FI7944052020036082', dueDate: '', total: 1, reference: '' }).error!, /viitenumeron/);
  assert.match(virtualBarcode({ iban: 'FI7944052020036082', dueDate: '', total: 1000000, reference: '1232' }).error!, /liian suuri/);
  assert.match(virtualBarcode({ iban: 'FI7944052020036082', dueDate: '', total: 1, reference: '1'.repeat(21) }).error!, /liian pitkä/);
});
