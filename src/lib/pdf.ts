import type { jsPDF } from 'jspdf';
import type { Invoice, InvoiceConfig, Logo } from './types.js';
import { money } from './format.js';
import { refPretty } from './reference.js';
import { barsOf, code128c } from './code128.js';
import { barcodePretty } from './barcode.js';

export const A4 = { w: 210, h: 297 } as const;
export const M = 18;
export const CONTENT_W = A4.w - 2 * M;

const CONTENT_BOTTOM = A4.h - M - 8;
const FOOTER_Y = A4.h - 12;
const LINE_H = 5.2;
const GRAY: [number, number, number] = [110, 118, 130];
const INK: [number, number, number] = [25, 28, 34];
const BOX_FILL: [number, number, number] = [246, 248, 251];
const RULE: [number, number, number] = [215, 220, 228];
const BARCODE_W = 104;
const BARCODE_H = 12.7;
const BARCODE_QUIET = 4;
const BARCODE_TEXT_H = 10;
const BARCODE_BLOCK = BARCODE_TEXT_H + BARCODE_H + 2 * BARCODE_QUIET + 2;

const pageNumber = (doc: jsPDF): number => doc.getCurrentPageInfo().pageNumber;


function fitOnPage(doc: jsPDF, y: number, needed: number): number {
  if (y + needed <= CONTENT_BOTTOM) return y;
  doc.addPage();
  return M;
}

export function drawInvoice(doc: jsPDF, invoice: Invoice, cfg: InvoiceConfig, logo: Logo | null): void {
  const firstPage = pageNumber(doc);

  const afterLogo = drawLogo(doc, cfg, logo);
  const afterTitle = drawTitle(doc, cfg, logo, afterLogo);
  const metaBottom = drawMeta(doc, cfg, invoice, afterTitle);
  const recipientBottom = drawRecipient(doc, invoice, afterTitle);

  let y = Math.max(metaBottom, recipientBottom) + 8;
  y = drawIntro(doc, cfg.intro, y);
  y = drawItems(doc, invoice, y);
  drawPaymentBox(doc, cfg, invoice, y);
  drawPageFooters(doc, cfg, firstPage);
}

interface LogoArea {
  y: number;
  bottom: number | null;
}

function drawLogo(doc: jsPDF, cfg: InvoiceConfig, logo: Logo | null): LogoArea {
  if (!logo) return { y: M, bottom: null };

  const width = cfg.logoPos === 'banner' ? CONTENT_W : Math.min(cfg.logoW, CONTENT_W);
  const height = width / logo.ratio;
  const x = cfg.logoPos === 'right' ? A4.w - M - width : M;
  doc.addImage(logo.dataUrl, logo.format, x, M, width, height);

  return cfg.logoPos === 'right'
    ? { y: M, bottom: M + height }
    : { y: M + height + 6, bottom: null };
}

function drawTitle(doc: jsPDF, cfg: InvoiceConfig, logo: Logo | null, logoArea: LogoArea): number {
  doc.setFont('helvetica', 'bold').setFontSize(19);
  doc.setTextColor(...INK);

  const width = logo && cfg.logoPos === 'right' ? CONTENT_W - cfg.logoW - 6 : CONTENT_W;
  const lines: string[] = doc.splitTextToSize(cfg.title || 'Lasku', width);
  doc.text(lines, M, logoArea.y + 6);

  const bottom = logoArea.y + 6 + lines.length * 8;
  return logoArea.bottom === null ? bottom : Math.max(bottom, logoArea.bottom + 8);
}

function drawMeta(doc: jsPDF, cfg: InvoiceConfig, invoice: Invoice, top: number): number {
  const rows: Array<[string, string]> = [
    ['Laskunumero', String(invoice.invoiceNo)],
    ['Laskun päivä', cfg.invoiceDate],
    ['Eräpäivä', cfg.dueDate],
    ['Viite', refPretty(invoice.reference)]
  ];

  doc.setFont('helvetica', 'normal').setFontSize(9.5);
  let y = top;
  rows.filter(([, value]) => value).forEach(([label, value]) => {
    doc.setTextColor(...GRAY);
    doc.text(label, A4.w - M - 52, y);
    doc.setTextColor(...INK);
    doc.setFont('helvetica', 'bold');
    doc.text(value, A4.w - M, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += LINE_H;
  });
  return y;
}

function drawRecipient(doc: jsPDF, invoice: Invoice, top: number): number {
  doc.setTextColor(...GRAY);
  doc.setFontSize(9);
  doc.text('VASTAANOTTAJA', M, top);

  doc.setTextColor(...INK);
  doc.setFontSize(11.5).setFont('helvetica', 'bold');
  doc.text(invoice.recipient.name, M, top + 6);

  doc.setFont('helvetica', 'normal').setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.text(invoice.recipient.email, M, top + 11.5);
  return top + 16;
}

function drawIntro(doc: jsPDF, intro: string, top: number): number {
  if (!intro.trim()) return top;

  doc.setTextColor(...INK);
  doc.setFontSize(10.5);

  let y = top;
  for (const paragraph of intro.replace(/\r/g, '').split('\n')) {
    if (!paragraph.trim()) {
      y += 4;
      continue;
    }
    const lines: string[] = doc.splitTextToSize(paragraph, CONTENT_W);
    y = fitOnPage(doc, y, lines.length * LINE_H);
    doc.text(lines, M, y);
    y += lines.length * LINE_H;
  }
  return y + 8;
}

function drawItems(doc: jsPDF, invoice: Invoice, top: number): number {
  doc.setDrawColor(...RULE);
  doc.setTextColor(...GRAY);
  doc.setFontSize(9);
  doc.text('KUVAUS', M, top);
  doc.text('SUMMA', A4.w - M, top, { align: 'right' });

  let y = top + 2.5;
  doc.line(M, y, A4.w - M, y);
  y += 6;

  doc.setTextColor(...INK);
  doc.setFontSize(10.5);
  for (const item of invoice.items) {
    const lines: string[] = doc.splitTextToSize(item.desc, CONTENT_W - 38);
    y = fitOnPage(doc, y, lines.length * LINE_H + 2.5);
    doc.text(lines, M, y);
    doc.text(money(item.amount), A4.w - M, y, { align: 'right' });
    y += Math.max(lines.length * LINE_H, LINE_H) + 2.5;
  }

  y = fitOnPage(doc, y, 14);
  doc.line(M, y, A4.w - M, y);
  y += 7;

  doc.setFont('helvetica', 'bold').setFontSize(12);
  doc.text('Yhteensä', M, y);
  doc.text(money(invoice.total), A4.w - M, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  return y + 12;
}

function drawPaymentBox(doc: jsPDF, cfg: InvoiceConfig, invoice: Invoice, top: number): void {
  const rows: Array<[string, string]> = [
    ['Saaja', cfg.payee],
    ['IBAN', cfg.iban],
    ...(cfg.bic ? [['BIC', cfg.bic] as [string, string]] : []),
    ['Viitenumero', refPretty(invoice.reference)],
    ['Eräpäivä', cfg.dueDate],
    ['Maksettava', money(invoice.total)]
  ];
  const rowsHeight = Math.ceil(rows.length / 2) * 11;
  const noteHeight = cfg.payNote.trim() ? 7 : 0;
  const height = 14 + rowsHeight + noteHeight + (invoice.barcode ? BARCODE_BLOCK : 0);
  const boxY = Math.max(fitOnPage(doc, top, height), CONTENT_BOTTOM - height);

  doc.setFillColor(...BOX_FILL);
  doc.roundedRect(M, boxY, CONTENT_W, height, 3, 3, 'F');

  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold').setFontSize(10);
  doc.text('MAKSUTIEDOT', M + 6, boxY + 8);
  doc.setFont('helvetica', 'normal');

  const emphasized = ['Viitenumero', 'Maksettava'];
  rows.forEach(([label, value], i) => {
    const x = M + 6 + (i % 2) * (CONTENT_W / 2 - 3);
    const y = boxY + 18 + Math.floor(i / 2) * 11;

    doc.setTextColor(...GRAY);
    doc.setFontSize(8.5);
    doc.text(label.toUpperCase(), x, y);

    doc.setTextColor(...INK);
    doc.setFontSize(11);
    doc.setFont('helvetica', emphasized.includes(label) ? 'bold' : 'normal');
    doc.text(value, x, y + 5.5);
    doc.setFont('helvetica', 'normal');
  });

  const afterRows = boxY + 18 + rowsHeight;
  if (cfg.payNote.trim()) {
    doc.setTextColor(...GRAY);
    doc.setFontSize(8.5);
    doc.text(cfg.payNote, M + 6, afterRows + 1.5);
  }
  if (invoice.barcode) {
    const barcodeTop = afterRows + noteHeight;
    drawBarcodeNumber(doc, invoice.barcode, barcodeTop);
    drawBarcode(doc, invoice.barcode, barcodeTop + BARCODE_TEXT_H);
  }
}

function drawBarcodeNumber(doc: jsPDF, code: string, top: number): void {
  doc.setTextColor(...GRAY);
  doc.setFontSize(7.5);
  doc.text('VIRTUAALIVIIVAKOODI', M + 6, top);

  doc.setTextColor(...INK);
  doc.setFontSize(9);
  doc.text(barcodePretty(code), M + 6, top + 5);
}

function drawBarcode(doc: jsPDF, code: string, top: number): void {
  const modules = code128c(code);
  const moduleWidth = BARCODE_W / modules.length;
  const left = (A4.w - BARCODE_W) / 2;

  doc.setFillColor(255, 255, 255);
  doc.rect(left - BARCODE_QUIET, top - BARCODE_QUIET, BARCODE_W + 2 * BARCODE_QUIET, BARCODE_H + 2 * BARCODE_QUIET, 'F');

  doc.setFillColor(0, 0, 0);
  for (const bar of barsOf(modules, moduleWidth)) {
    doc.rect(left + bar.x, top, bar.width, BARCODE_H, 'F');
  }
}

function drawPageFooters(doc: jsPDF, cfg: InvoiceConfig, firstPage: number): void {
  const lastPage = pageNumber(doc);
  const pageCount = lastPage - firstPage + 1;

  for (let page = firstPage; page <= lastPage; page++) {
    doc.setPage(page);
    doc.setTextColor(...GRAY);
    doc.setFontSize(8.5);

    if (cfg.footer.trim()) {
      doc.text(doc.splitTextToSize(cfg.footer, CONTENT_W), A4.w / 2, FOOTER_Y, { align: 'center' });
    }
    if (pageCount > 1) {
      doc.text(`${page - firstPage + 1} / ${pageCount}`, A4.w - M, FOOTER_Y, { align: 'right' });
    }
  }
  doc.setPage(lastPage);
}
