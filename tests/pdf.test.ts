import { test } from 'vitest';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { jsPDF } from 'jspdf';
import { drawInvoice } from '../src/lib/pdf.js';
import { code128c } from '../src/lib/code128.js';

const createDoc = (): jsPDF => new jsPDF({ unit: 'mm', format: 'a4', compress: true });

function pdfText(doc: ReturnType<typeof createDoc>): string {
  const bytes = Buffer.from(doc.output('arraybuffer'));
  const streams = bytes.toString('latin1').split('stream\n').slice(1);

  return streams.map((chunk) => {
    const body = Buffer.from(chunk.slice(0, chunk.indexOf('\nendstream')), 'latin1');
    try {
      return inflateSync(body).toString('latin1');
    } catch {
      return body.toString('latin1');
    }
  }).join('\n');
}

const fixture = (name: string): Buffer => readFileSync(fileURLToPath(new URL(`fixtures/${name}`, import.meta.url)));

import type { Invoice, InvoiceConfig } from '../src/lib/types.js';

const cfg: InvoiceConfig = {
  title: 'Jäsenmaksulasku 2026',
  intro: 'Hei!\n\nOhessa vuoden 2026 jäsenmaksulasku.',
  footer: 'Esimerkkiyhdistys ry · y-tunnus 1234567-8',
  payee: 'Esimerkkiyhdistys ry',
  iban: 'FI21 1234 5600 0007 85',
  bic: 'NDEAFIHH',
  invoiceDate: '11.9.2026',
  dueDate: '25.9.2026',
  payNote: 'Viivästyskorko 7 %',
  logoPos: 'right',
  logoW: 45
};

const invoice = (over: Partial<Invoice> = {}): Invoice => ({
  recipient: { name: 'Matti Meikäläinen', email: 'matti@example.com', badEmail: false },
  items: [{ desc: 'Jäsenmaksu 2026', amount: 40 }, { desc: 'Lehtitilaus', amount: 12.5 }],
  total: 52.5,
  invoiceNo: 1001,
  reference: '202600017',
  barcode: null,
  ...over
});



test('yksi lasku mahtuu yhdelle sivulle', () => {
  const doc = createDoc();
  drawInvoice(doc, invoice(), cfg, null);
  assert.equal(doc.getNumberOfPages(), 1);
  assert.ok(doc.output('arraybuffer').byteLength > 1000, 'PDF ei ole tyhjä');
});

test('monta laskua tulee omille sivuilleen', () => {
  const doc = createDoc();
  [1001, 1002, 1003].forEach((invoiceNo, i) => {
    if (i) doc.addPage();
    drawInvoice(doc, invoice({ invoiceNo }), cfg, null);
  });
  assert.equal(doc.getNumberOfPages(), 3);
});

test('pitkä sisältö jatkuu seuraavalle sivulle', () => {
  const doc = createDoc();
  const longCfg = {
    ...cfg,
    intro: Array.from({ length: 14 }, (_, i) => `Kappale ${i + 1}. ${'Pitkää saatetekstiä. '.repeat(6)}`).join('\n\n')
  };
  drawInvoice(doc, invoice(), longCfg, null);
  assert.ok(doc.getNumberOfPages() > 1, 'sivunvaihto tapahtui');
});

test('maksutiedot ja skandit päätyvät sivulle', () => {
  const doc = createDoc();
  drawInvoice(doc, invoice(), cfg, null);
  const pdf = pdfText(doc);
  assert.match(pdf, /MAKSUTIEDOT/);
  assert.match(pdf, /VASTAANOTTAJA/);
  assert.match(pdf, /2026 00017/, 'viite näkyy ryhmiteltynä');
  assert.match(pdf, /FI21 1234 5600 0007 85/);
  assert.match(pdf, /Jäsenmaksu/, 'skandit säilyvät WinAnsi-tavuina');
});

test('logo upotetaan PDF:ään', () => {
  const png = 'data:image/png;base64,' + fixture('logo.png').toString('base64');
  const doc = createDoc();
  drawInvoice(doc, invoice(), cfg, { dataUrl: png, format: 'PNG', ratio: 300 / 110 });
  assert.equal(doc.getNumberOfPages(), 1);
  assert.match(Buffer.from(doc.output('arraybuffer')).toString('latin1'), /\/Image/, 'kuvaobjekti löytyy dokumentista');
});

const MM_TO_PT = 72 / 25.4;

function barRects(doc: ReturnType<typeof createDoc>, heightMm: number): Array<{ x: number; width: number }> {
  const tolerance = 0.01;
  const rects = [...pdfText(doc).matchAll(/(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) re/g)]
    .map((match) => ({ x: Number(match[1]), width: Number(match[3]), height: Math.abs(Number(match[4])) }))
    .filter((rect) => Math.abs(rect.height - heightMm * MM_TO_PT) < tolerance);

  return rects.sort((a, b) => a.x - b.x);
}

test('PDF:ään piirretyt palkit vastaavat Code 128C -koodausta', () => {
  const code = '421123456000007850000525000000000000000202600017260925';
  const doc = createDoc();
  drawInvoice(doc, invoice({ barcode: code }), cfg, null);

  const bars = barRects(doc, 12.7);
  assert.ok(bars.length > 30, `palkkeja löytyi ${bars.length}`);

  const expected = code128c(code);
  const widthPt = 104 * MM_TO_PT;
  const modulePt = widthPt / expected.length;
  const left = bars[0]!.x;

  const drawn = Array.from({ length: expected.length }, (_unused, index) => {
    const center = left + (index + 0.5) * modulePt;
    return bars.some((bar) => center >= bar.x && center <= bar.x + bar.width) ? '1' : '0';
  }).join('');

  assert.equal(drawn, expected, 'piirretty moduulijono');
});

test('viivakoodi jätetään pois kun sitä ei ole', () => {
  const doc = createDoc();
  drawInvoice(doc, invoice(), cfg, null);
  assert.equal(barRects(doc, 12.7).length, 0);
});

test('virtuaaliviivakoodi tulostuu myös numeroina', () => {
  const code = '421123456000007850000525000000000000000202600017260925';
  const doc = createDoc();
  drawInvoice(doc, invoice({ barcode: code }), cfg, null);

  const text = pdfText(doc);
  assert.match(text, /VIRTUAALIVIIVAKOODI/);
  assert.match(text, /42112 34560 00007/, 'numerosarja viiden ryhmissä');
});

test('viivakoodin ympärillä on valkoinen hiljainen alue', () => {
  const code = '421123456000007850000525000000000000000202600017260925';
  const doc = createDoc();
  drawInvoice(doc, invoice({ barcode: code }), cfg, null);

  const plates = barRects(doc, 12.7 + 8);
  assert.equal(plates.length, 1, 'yksi valkoinen tausta');

  const bars = barRects(doc, 12.7);
  const plate = plates[0]!;
  assert.ok(plate.x < bars[0]!.x, 'tausta alkaa ennen ensimmäistä palkkia');
  assert.ok(plate.x + plate.width > bars[bars.length - 1]!.x + bars[bars.length - 1]!.width);
});
