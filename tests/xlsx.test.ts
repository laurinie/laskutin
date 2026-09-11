import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { readXlsx, templateXlsx, rowsToText, TEMPLATE_CSV } from '../src/lib/xlsx.js';
import { parseRecipients } from '../src/lib/recipients.js';

const fixture = (name: string): Buffer => readFileSync(fileURLToPath(new URL(`fixtures/${name}`, import.meta.url)));

test('luotu pohja on luettavissa takaisin', async () => {
  const template = await templateXlsx();
  const rows = await readXlsx(await template.arrayBuffer());
  assert.deepEqual(rows[0], ['Nimi', 'Sähköposti', 'Summa']);
  assert.equal(rows.length, 4);

  const { recipients } = parseRecipients(rowsToText(rows));
  assert.deepEqual(recipients.map((m) => [m.name, m.amount]), [
    ['Matti Meikäläinen', 40],
    ['Maija Virtanen', 40],
    ['Ömer Äkkinen', 20]
  ]);
});

test('CSV-pohjassa on BOM ja puolipiste-erotin', () => {
  assert.ok(TEMPLATE_CSV.startsWith('\uFEFF'), 'BOM auttaa Exceliä tunnistamaan UTF-8:n');
  assert.match(TEMPLATE_CSV.split('\r\n')[0]!, /^\uFEFFNimi;Sähköposti;Summa$/);
});

test('muun ohjelman tuottama .xlsx luetaan oikein', async () => {
  const rows = await readXlsx(fixture('jasenrekisteri.xlsx'));
  assert.deepEqual(rows[0], ['Jäsennumero', 'Nimi', 'Sähköposti', 'Jäsenmaksu']);

  const { recipients, columnInfo } = parseRecipients(rowsToText(rows));
  assert.deepEqual(recipients.map((m) => [m.name, m.email, m.amount]), [
    ['Matti Meikäläinen', 'matti.meikalainen@example.com', 40],
    ['Ömer Äkkinen', 'omer.akkinen@example.com', 20.5],
    ['Liisa & Co <Lahtinen>', 'liisa@example.com', null],
    ['Maija Virtanen', 'maija.virtanen@example.com', null]
  ]);
  assert.match(columnInfo, /nimi: Nimi/);
});
