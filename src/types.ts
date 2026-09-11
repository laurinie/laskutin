/** Jäsenrekisteristä luettu yksittäinen laskutettava. */
export interface Member {
  name: string;
  email: string;
  /** Jäsenkohtainen summa; null = käytetään oletuslaskurivejä. */
  amount: number | null;
  /** true jos sähköposti puuttuu tai ei ole kelvollinen. */
  badEmail: boolean;
}

export interface LineItem {
  desc: string;
  amount: number;
}

/** Yhden laskun laskettu sisältö. */
export interface Invoice {
  member: Member;
  items: LineItem[];
  total: number;
  invoiceNo: number;
  reference: string;
}

/** Kaikille laskuille yhteinen ulkoasu ja maksutiedot. */
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
  /** leveys / korkeus */
  ratio: number;
}

/** Otsikkorivistä tunnistetut sarakeindeksit. */
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
  /** viitteen tunnusosa per-tilassa */
  prefix: string;
  /** juoksevan numeron alkuarvo per-tilassa */
  start: number;
  /** yhteinen viite shared-tilassa */
  shared: string;
}
