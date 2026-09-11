/* Excel-luvun ja -pohjan testit. Kiintotiedosto jasenrekisteri.xlsx on luotu
   openpyxl:llä eli täysin eri toteutuksella kuin oma kirjoittajamme – se varmistaa,
   että luemme muidenkin ohjelmien tuottamia tiedostoja. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

import { readXlsx, templateXlsxZip, rowsToText, TEMPLATE_CSV } from '../dist/xlsx.js';
import { parseMembers } from '../dist/members.js';

const fixture = (name) => readFileSync(fileURLToPath(new URL(`fixtures/${name}`, import.meta.url)));

test('luotu pohja on luettavissa takaisin', async () => {
  const buf = await templateXlsxZip(JSZip).generateAsync({ type: 'nodebuffer' });
  const rows = await readXlsx(buf, JSZip);
  assert.deepEqual(rows[0], ['Nimi', 'Sähköposti', 'Summa']);
  assert.equal(rows.length, 4);

  const { members } = parseMembers(rowsToText(rows));
  assert.deepEqual(members.map((m) => [m.name, m.amount]), [
    ['Matti Meikäläinen', 40],
    ['Maija Virtanen', 40],
    ['Ömer Äkkinen', 20]
  ]);
});

test('CSV-pohjassa on BOM ja puolipiste-erotin', () => {
  assert.ok(TEMPLATE_CSV.startsWith('﻿'), 'BOM auttaa Exceliä tunnistamaan UTF-8:n');
  assert.match(TEMPLATE_CSV.split('\r\n')[0], /^﻿Nimi;Sähköposti;Summa$/);
});

test('muun ohjelman tuottama .xlsx luetaan oikein', async () => {
  const rows = await readXlsx(fixture('jasenrekisteri.xlsx'), JSZip);
  assert.deepEqual(rows[0], ['Jäsennumero', 'Nimi', 'Sähköposti', 'Jäsenmaksu']);

  const { members, columnInfo } = parseMembers(rowsToText(rows));
  assert.deepEqual(members.map((m) => [m.name, m.email, m.amount]), [
    ['Matti Meikäläinen', 'matti.meikalainen@example.com', 40],
    ['Ömer Äkkinen', 'omer.akkinen@example.com', 20.5],
    ['Liisa & Co <Lahtinen>', 'liisa@example.com', null],   // XML-erikoismerkit ja tyhjä solu
    ['Maija Virtanen', 'maija.virtanen@example.com', null]
  ]);
  assert.match(columnInfo, /nimi: Nimi/);
});
