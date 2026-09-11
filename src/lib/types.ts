export interface Recipient {
  name: string;
  email: string;
  amount: number | null;
  badEmail: boolean;
}

export interface LineItem {
  desc: string;
  amount: number;
}

export interface Invoice {
  recipient: Recipient;
  items: LineItem[];
  total: number;
  invoiceNo: number;
  reference: string;
  barcode: string | null;
}

export interface InvoiceConfig {
  title: string;
  intro: string;
  footer: string;
  payee: string;
  iban: string;
  bic: string;
  invoiceDate: string;
  dueDate: string;
  payNote: string;
  logoPos: LogoPosition;
  logoW: number;
}

export type LogoPosition = 'right' | 'left' | 'banner';

export interface Logo {
  dataUrl: string;
  format: 'PNG' | 'JPEG';
  ratio: number;
}

export interface ColumnMap {
  email?: number;
  first?: number;
  last?: number;
  name?: number;
  amount?: number;
}

export type RefMode = 'per' | 'shared';

export interface ReferenceOptions {
  mode: RefMode;
  prefix: string;
  start: number;
  shared: string;
}
