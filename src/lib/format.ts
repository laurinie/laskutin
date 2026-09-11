export function money(n: number): string {
  const value = Number.isFinite(n) ? n : 0;
  const [whole = '0', cents = '00'] = Math.abs(value).toFixed(2).split('.');
  const sign = value < 0 ? '-' : '';
  return `${sign}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${cents} €`;
}

export function parseAmount(s: string | null | undefined): number | null {
  if (s == null) return null;
  const clean = String(s).replace(/[\s €]|eur/gi, '').replace(',', '.');
  if (!clean) return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

export function fmtDate(iso: string): string {
  if (!iso) return '';
  const [year = '', month = '', day = ''] = iso.split('-');
  return `${Number(day)}.${Number(month)}.${year}`;
}

export const isEmail = (s: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

const COMBINING_MARKS = /[\u0300-\u036f]/g;

export function slug(s: string): string {
  return String(s).normalize('NFD').replace(COMBINING_MARKS, '')
    .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'lasku';
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

export const escHtml = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"]/g, (c) => HTML_ESCAPES[c] ?? c);

const NEEDS_CSV_QUOTES = /[;"\n]/;

export const csvField = (v: unknown): string =>
  NEEDS_CSV_QUOTES.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);

export const BOM = '\uFEFF';

export const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));
