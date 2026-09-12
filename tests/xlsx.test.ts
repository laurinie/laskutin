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
  assert.deepEqual(rows[0], ['Nimi', 'Sähköposti']);
  assert.equal(rows.length, 4);

  const { recipients } = parseRecipients(rowsToText(rows));
  assert.deepEqual(recipients.map((m) => m.name), ['Matti Meikäläinen', 'Maija Virtanen', 'Ömer Äkkinen']);
});

test('CSV-pohjassa on BOM ja puolipiste-erotin', () => {
  assert.ok(TEMPLATE_CSV.startsWith('\uFEFF'), 'BOM auttaa Exceliä tunnistamaan UTF-8:n');
  assert.match(TEMPLATE_CSV.split('\r\n')[0]!, /^\uFEFFNimi;Sähköposti$/);
});

test('muun ohjelman tuottama .xlsx luetaan oikein', async () => {
  const rows = await readXlsx(fixture('jasenrekisteri.xlsx'));
  assert.deepEqual(rows[0], ['Jäsennumero', 'Nimi', 'Sähköposti', 'Jäsenmaksu']);

  const { recipients, columnInfo } = parseRecipients(rowsToText(rows));
  assert.deepEqual(recipients.map((m) => [m.name, m.email]), [
    ['Matti Meikäläinen', 'matti.meikalainen@example.com'],
    ['Ömer Äkkinen', 'omer.akkinen@example.com'],
    ['Liisa & Co <Lahtinen>', 'liisa@example.com'],
    ['Maija Virtanen', 'maija.virtanen@example.com']
  ]);
  assert.match(columnInfo, /nimi: Nimi/);
});
