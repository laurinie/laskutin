import type { Invoice, InvoiceConfig, LogoPosition, Recipient, RefMode, ReferenceOptions } from './types.js';
import { BOM, csvField, fmtDate } from './format.js';
import { invoiceItems, parseLineItems } from './recipients.js';
import { ibanPrettyOrEmpty, referenceFor } from './reference.js';
import { virtualBarcode } from './barcode.js';

export interface InvoiceForm {
  recipients: string;
  title: string;
  intro: string;
  lines: string;
  footer: string;
  payee: string;
  iban: string;
  bic: string;
  invoiceDate: string;
  dueDate: string;
  invoiceNoStart: string;
  payNote: string;
  refMode: RefMode;
  refPrefix: string;
  refStart: string;
  sharedRef: string;
  logoPos: LogoPosition;
  logoW: string;
  barcode: boolean;
}

export const DEMO_MEMBERS = `Nimi;Sähköposti;Summa
Matti Meikäläinen;matti.meikalainen@example.com
Maija Virtanen;maija.virtanen@example.com
Ömer Äkkinen;omer.akkinen@example.com
Liisa Lahtinen;liisa@example.com`;

const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

export function defaultForm(today = new Date()): InvoiceForm {
  return {
    recipients: DEMO_MEMBERS,
    title: 'Jäsenmaksulasku 2026',
    intro: 'Hei!\n\nOhessa vuoden 2026 jäsenmaksulasku. Maksa lasku eräpäivään mennessä käyttäen laskun viitenumeroa.\n\nKiitos kun olet jäsenenä mukana!',
    lines: 'Jäsenmaksu 2026;40,00',
    footer: 'Esimerkkiyhdistys ry · y-tunnus 1234567-8 · laskutus@example.com',
    payee: 'Esimerkkiyhdistys ry',
    iban: 'FI21 1234 5600 0007 85',
    bic: 'NDEAFIHH',
    invoiceDate: isoDate(today),
    dueDate: isoDate(new Date(today.getTime() + 14 * 864e5)),
    invoiceNoStart: '1001',
    payNote: 'Viivästyskorko 7 % · Huomautusaika 8 pv',
    refMode: 'per',
    refPrefix: '2026',
    refStart: '1',
    sharedRef: '2026 00013',
    logoPos: 'right',
    logoW: '45',
    barcode: true
  };
}

export function migrateForm(stored: Record<string, unknown>): Partial<InvoiceForm> {
  const { members, ...rest } = stored as { members?: unknown };
  return typeof members === 'string'
    ? { ...rest, recipients: members } as Partial<InvoiceForm>
    : stored as Partial<InvoiceForm>;
}

export const configOf = (form: InvoiceForm): InvoiceConfig => ({
  title: form.title,
  intro: form.intro,
  footer: form.footer,
  payee: form.payee,
  iban: ibanPrettyOrEmpty(form.iban),
  bic: form.bic.trim(),
  invoiceDate: fmtDate(form.invoiceDate),
  dueDate: fmtDate(form.dueDate),
  payNote: form.payNote,
  logoPos: form.logoPos,
  logoW: Number(form.logoW) || 45
});

export const referenceOptionsOf = (form: InvoiceForm): ReferenceOptions => ({
  mode: form.refMode,
  prefix: form.refPrefix,
  start: Number(form.refStart || 1),
  shared: form.sharedRef
});

export function invoicesFor(recipients: Recipient[], form: InvoiceForm): Invoice[] {
  const defaults = parseLineItems(form.lines);
  const refOptions = referenceOptionsOf(form);
  const firstNumber = Number(form.invoiceNoStart || 1);

  const items = invoiceItems(defaults, form.title);
  const total = items.reduce((sum, item) => sum + item.amount, 0);

  return recipients.map((recipient, index) => {
    const reference = referenceFor(index, refOptions);

    return {
      recipient,
      items,
      total,
      invoiceNo: firstNumber + index,
      reference,
      barcode: form.barcode
        ? virtualBarcode({ iban: form.iban, dueDate: form.dueDate, total, reference }).code ?? null
        : null
    };
  });
}

const CSV_COLUMNS = ['nimi', 'sahkoposti', 'laskunumero', 'viite', 'summa', 'erapaiva'];

export function csvOf(invoices: Invoice[], dueDate: string): string {
  const withBarcode = invoices.some((invoice) => invoice.barcode);
  const header = withBarcode ? [...CSV_COLUMNS, 'virtuaaliviivakoodi'] : CSV_COLUMNS;

  const rows = invoices.map((invoice) => {
    const cells = [
      invoice.recipient.name,
      invoice.recipient.email,
      invoice.invoiceNo,
      invoice.reference,
      invoice.total.toFixed(2).replace('.', ','),
      fmtDate(dueDate)
    ];
    if (withBarcode) cells.push(invoice.barcode ?? '');
    return cells.map(csvField).join(';');
  });

  return BOM + [header.join(';'), ...rows].join('\r\n');
}
