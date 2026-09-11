/* Muotoilu- ja tarkistusapurit. Näissä ei ole DOM-riippuvuuksia, joten ne ovat
   sellaisenaan testattavissa myös Nodessa. */

/** Summa suomalaisessa muodossa, esim. 1 234,50 €. */
export function money(n: number): string {
  const value = Number.isFinite(n) ? n : 0;
  const [whole = '0', cents = '00'] = Math.abs(value).toFixed(2).split('.');
  const sign = value < 0 ? '-' : '';
  return `${sign}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${cents} €`;
}

/** Lukee summan tekstistä: "1 200,50 €" -> 1200.5. Palauttaa null jos ei luku. */
export function parseAmount(s: string | null | undefined): number | null {
  if (s == null) return null;
  const clean = String(s).replace(/[\s €]|eur/gi, '').replace(',', '.');
  if (!clean) return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

/** ISO-päivä (2026-09-11) suomalaiseksi (11.9.2026). */
export function fmtDate(iso: string): string {
  if (!iso) return '';
  const [y = '', m = '', d = ''] = iso.split('-');
  return `${Number(d)}.${Number(m)}.${y}`;
}

export const isEmail = (s: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

/** Tiedostonimeen kelpaava muoto: skandit puretaan, muut merkit alaviivaksi. */
export function slug(s: string): string {
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'lasku';
}

const HTML_ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const escHtml = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"]/g, (c) => HTML_ESC[c] ?? c);

/** CSV-kenttä: lainausmerkit vain tarvittaessa. */
export const csvField = (v: unknown): string =>
  /[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);

export const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));
