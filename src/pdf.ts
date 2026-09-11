/* Laskun piirto PDF:ksi. Funktio saa kaiken tarvitsemansa parametreina eikä koske
   DOM:iin, joten sama koodi ajetaan sekä selaimessa että testeissä Nodessa. */
import type { jsPDF } from 'jspdf';
import type { Invoice, InvoiceConfig, Logo } from './types.js';
import { money } from './format.js';
import { refPretty } from './reference.js';

export const A4 = { w: 210, h: 297 } as const;
/** Marginaali millimetreinä. */
export const M = 18;
export const CONTENT_W = A4.w - 2 * M;

/** Piirtää yhden laskun asiakirjan nykyiselle sivulle, lisäten sivuja tarvittaessa. */
export function drawInvoice(doc: jsPDF, d: Invoice, cfg: InvoiceConfig, logo: Logo | null): void {
  const gray = (): void => { doc.setTextColor(110, 118, 130); };
  const ink = (): void => { doc.setTextColor(25, 28, 34); };
  const BOTTOM = A4.h - M - 8;                    // alin sallittu sisällön reuna
  const firstPage = doc.getCurrentPageInfo().pageNumber;
  let y = M;
  /* Vaihtaa sivua, jos seuraava elementti ei mahdu. */
  const ensure = (need: number): void => {
    if (y + need > BOTTOM) { doc.addPage(); y = M; }
  };

  /* kuva */
  let logoBottom: number | null = null;
  if (logo) {
    const w = cfg.logoPos === 'banner' ? CONTENT_W : Math.min(cfg.logoW, CONTENT_W);
    const h = w / logo.ratio;
    const x = cfg.logoPos === 'right' ? A4.w - M - w : M;
    doc.addImage(logo.dataUrl, logo.format, x, y, w, h);
    if (cfg.logoPos === 'right') logoBottom = M + h;   // otsikko tulee samalle riville
    else y += h + 6;
  }

  /* otsikko + metatiedot */
  doc.setFont('helvetica', 'bold').setFontSize(19);
  ink();
  const titleW = cfg.logoPos === 'right' && logo ? CONTENT_W - cfg.logoW - 6 : CONTENT_W;
  const titleLines: string[] = doc.splitTextToSize(cfg.title || 'Lasku', titleW);
  doc.text(titleLines, M, y + 6);
  y += 6 + titleLines.length * 8;
  if (logoBottom !== null) y = Math.max(y, logoBottom + 8);

  doc.setFont('helvetica', 'normal').setFontSize(9.5);
  const meta: Array<[string, string]> = [
    ['Laskunumero', String(d.invoiceNo)],
    ['Laskun päivä', cfg.invoiceDate],
    ['Eräpäivä', cfg.dueDate],
    ['Viite', refPretty(d.reference)]
  ];
  let my = y;
  meta.filter(([, v]) => v).forEach(([k, v]) => {
    gray(); doc.text(k, A4.w - M - 52, my);
    ink(); doc.setFont('helvetica', 'bold'); doc.text(v, A4.w - M, my, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    my += 5.2;
  });

  /* vastaanottaja */
  gray(); doc.setFontSize(9); doc.text('VASTAANOTTAJA', M, y);
  ink(); doc.setFontSize(11.5).setFont('helvetica', 'bold');
  doc.text(d.member.name || '', M, y + 6);
  doc.setFont('helvetica', 'normal').setFontSize(10);
  gray(); doc.text(d.member.email || '', M, y + 11.5);
  y = Math.max(my, y + 16) + 8;

  /* saatesanat */
  if (cfg.intro.trim()) {
    ink(); doc.setFontSize(10.5);
    cfg.intro.replace(/\r/g, '').split('\n').forEach((p) => {
      if (!p.trim()) { y += 4; return; }
      const lines: string[] = doc.splitTextToSize(p, CONTENT_W);
      ensure(lines.length * 5.2);
      doc.text(lines, M, y);
      y += lines.length * 5.2;
    });
    y += 8;
  }

  /* laskurivit */
  doc.setDrawColor(215, 220, 228);
  gray(); doc.setFontSize(9);
  doc.text('KUVAUS', M, y);
  doc.text('SUMMA', A4.w - M, y, { align: 'right' });
  y += 2.5;
  doc.line(M, y, A4.w - M, y);
  y += 6;
  ink(); doc.setFontSize(10.5);
  d.items.forEach((it) => {
    const lines: string[] = doc.splitTextToSize(it.desc, CONTENT_W - 38);
    ensure(lines.length * 5.2 + 2.5);
    doc.text(lines, M, y);
    doc.text(money(it.amount), A4.w - M, y, { align: 'right' });
    y += Math.max(lines.length * 5.2, 5.2) + 2.5;
  });
  ensure(14);
  doc.line(M, y, A4.w - M, y);
  y += 7;
  doc.setFont('helvetica', 'bold').setFontSize(12);
  doc.text('Yhteensä', M, y);
  doc.text(money(d.total), A4.w - M, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  y += 12;

  /* maksutiedot-laatikko, ankkuroituna sivun alareunaan */
  const rows: Array<[string, string]> = [
    ['Saaja', cfg.payee],
    ['IBAN', cfg.iban],
    ...(cfg.bic ? [['BIC', cfg.bic] as [string, string]] : []),
    ['Viitenumero', refPretty(d.reference)],
    ['Eräpäivä', cfg.dueDate],
    ['Maksettava', money(d.total)]
  ];
  const boxH = 14 + Math.ceil(rows.length / 2) * 11 + (cfg.payNote.trim() ? 7 : 0);
  if (y + boxH > BOTTOM) { doc.addPage(); y = M; }
  const boxY = Math.max(y, BOTTOM - boxH);
  doc.setFillColor(246, 248, 251);
  doc.roundedRect(M, boxY, CONTENT_W, boxH, 3, 3, 'F');
  ink(); doc.setFont('helvetica', 'bold').setFontSize(10);
  doc.text('MAKSUTIEDOT', M + 6, boxY + 8);
  doc.setFont('helvetica', 'normal');
  rows.forEach(([label, value], i) => {
    const x = M + 6 + (i % 2) * (CONTENT_W / 2 - 3);
    const ry = boxY + 18 + Math.floor(i / 2) * 11;
    gray(); doc.setFontSize(8.5); doc.text(label.toUpperCase(), x, ry);
    ink(); doc.setFontSize(11);
    const highlight = label === 'Viitenumero' || label === 'Maksettava';
    doc.setFont('helvetica', highlight ? 'bold' : 'normal');
    doc.text(value, x, ry + 5.5);
    doc.setFont('helvetica', 'normal');
  });
  if (cfg.payNote.trim()) {
    gray(); doc.setFontSize(8.5);
    doc.text(cfg.payNote, M + 6, boxY + boxH - 3.5);
  }

  /* alatunniste ja sivunumerot tämän laskun jokaiselle sivulle */
  const lastPage = doc.getCurrentPageInfo().pageNumber;
  for (let p = firstPage; p <= lastPage; p++) {
    doc.setPage(p);
    gray(); doc.setFontSize(8.5);
    if (cfg.footer.trim()) {
      doc.text(doc.splitTextToSize(cfg.footer, CONTENT_W), A4.w / 2, A4.h - 12, { align: 'center' });
    }
    if (lastPage > firstPage) {
      doc.text(`${p - firstPage + 1} / ${lastPage - firstPage + 1}`, A4.w - M, A4.h - 12, { align: 'right' });
    }
  }
  doc.setPage(lastPage);
}
