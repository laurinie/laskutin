import { test } from 'vitest';
import assert from 'node:assert/strict';

import { brevoMessage, defaultEmailSettings, renderTemplate, settingsProblem } from '../src/lib/email.js';
import type { Invoice } from '../src/lib/types.js';

const invoice: Invoice = {
  recipient: { name: 'Matti Meikäläinen', email: 'matti@example.com', badEmail: false },
  items: [{ desc: 'Jäsenmaksu', amount: 40 }],
  total: 40,
  invoiceNo: 1001,
  reference: '202600017',
  barcode: null
};

const settings = { ...defaultEmailSettings(), senderName: 'Yhdistys', senderEmail: 'laskutus@example.com' };

test('paikkamerkit korvataan laskun tiedoilla', () => {
  const rendered = renderTemplate('{{nimi}} {{laskunumero}} {{viite}} {{summa}} {{erapaiva}}', invoice, '2026-09-25');
  assert.equal(rendered, 'Matti Meikäläinen 1001 2026 00017 40,00 € 25.9.2026');
});

test('tuntematon paikkamerkki jätetään rauhaan', () => {
  assert.equal(renderTemplate('{{tuntematon}}', invoice, '2026-09-25'), '{{tuntematon}}');
});

test('viesti rakentuu Brevon odottamaan muotoon', () => {
  const message = brevoMessage(settings, invoice, '2026-09-25', 'JVBERi0=', 'lasku.pdf');
  assert.deepEqual(message.sender, { name: 'Yhdistys', email: 'laskutus@example.com' });
  assert.deepEqual(message.to, [{ email: 'matti@example.com', name: 'Matti Meikäläinen' }]);
  assert.equal(message.subject, 'Lasku 1001');
  assert.deepEqual(message.attachment, [{ content: 'JVBERi0=', name: 'lasku.pdf' }]);
  assert.deepEqual(Object.keys(message).sort(), ['attachment', 'sender', 'subject', 'textContent', 'to']);
});

test('viestiin ei päädy API-avainta eikä muuta ylimääräistä', () => {
  const serialized = JSON.stringify(brevoMessage(settings, invoice, '2026-09-25', 'JVBERi0=', 'lasku.pdf'));
  assert.ok(!/api[-_]?key/i.test(serialized));
  assert.ok(!/iban/i.test(serialized));
});

test('puuttuvat asetukset kerrotaan ennen lähetystä', () => {
  assert.match(settingsProblem(settings, '')!, /API-avain/);
  assert.match(settingsProblem({ ...settings, senderEmail: '' }, 'avain')!, /osoite/);
  assert.match(settingsProblem({ ...settings, senderName: '' }, 'avain')!, /nimi/);
  assert.equal(settingsProblem(settings, 'avain'), null);
});
