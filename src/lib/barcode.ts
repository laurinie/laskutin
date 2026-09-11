import type { Invoice } from './types.js';

export const BARCODE_LENGTH = 54;
const MAX_EUROS = 999999;
const REFERENCE_DIGITS = 20;
const IBAN_DIGITS = 16;

export interface BarcodeInput {
  iban: string;
  dueDate: string;
  total: number;
  reference: string;
}

export type BarcodeResult = { code: string; error?: undefined } | { code?: undefined; error: string };

const digitsOnly = (s: string): string => s.replace(/\D/g, '');

function ibanField(iban: string): string | null {
  const normalized = iban.toUpperCase().replace(/\s/g, '');
  if (!/^FI\d{16}$/.test(normalized)) return null;
  return normalized.slice(2);
}

function dueDateField(iso: string): string | null {
  if (!iso) return '000000';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return match[1]!.slice(2) + match[2] + match[3];
}

export function virtualBarcode({ iban, dueDate, total, reference }: BarcodeInput): BarcodeResult {
  const account = ibanField(iban);
  if (!account) return { error: 'Pankkiviivakoodi vaatii suomalaisen IBANin (FI + 16 numeroa).' };

  const referenceDigits = digitsOnly(reference);
  if (!referenceDigits) return { error: 'Pankkiviivakoodi vaatii viitenumeron.' };
  if (referenceDigits.length > REFERENCE_DIGITS) {
    return { error: `Viite on liian pitkä pankkiviivakoodiin (enintään ${REFERENCE_DIGITS} numeroa).` };
  }

  const cents = Math.round(total * 100);
  if (cents < 0) return { error: 'Negatiivista summaa ei voi esittää pankkiviivakoodissa.' };
  if (Math.floor(cents / 100) > MAX_EUROS) {
    return { error: 'Summa on liian suuri pankkiviivakoodiin (enintään 999 999,99 €).' };
  }

  const due = dueDateField(dueDate);
  if (!due) return { error: 'Eräpäivä ei kelpaa pankkiviivakoodiin.' };

  const code = [
    '4',
    account.padStart(IBAN_DIGITS, '0'),
    String(Math.floor(cents / 100)).padStart(6, '0'),
    String(cents % 100).padStart(2, '0'),
    '000',
    referenceDigits.padStart(REFERENCE_DIGITS, '0'),
    due
  ].join('');

  return code.length === BARCODE_LENGTH ? { code } : { error: 'Pankkiviivakoodin muodostus epäonnistui.' };
}

export const barcodeFor = (invoice: Invoice, iban: string, dueDate: string): BarcodeResult =>
  virtualBarcode({ iban, dueDate, total: invoice.total, reference: invoice.reference });

export const barcodePretty = (code: string): string => code.replace(/(.{5})/g, '$1 ').trim();
