/* Suomalainen viitenumero ja IBAN-tarkistus. */
import type { ReferenceOptions } from './types.js';

/**
 * Lisää rungon perään tarkistenumeron 7-3-1-menetelmällä (Finanssiala ry:n ohje).
 * Palauttaa null jos runko ei kelpaa (viitteen pituus on 4–20 numeroa).
 */
export function refWithCheck(body: string | number): string | null {
  const digits = String(body).replace(/\D/g, '').replace(/^0+/, '');
  if (digits.length < 3 || digits.length > 19) return null;
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = digits.length - 1, k = 0; i >= 0; i--, k++) {
    sum += Number(digits[i]) * weights[k % 3]!;
  }
  return digits + String((10 - (sum % 10)) % 10);
}

/** Onko valmis viite (tarkiste mukana) kelvollinen? */
export function refIsValid(full: string): boolean {
  const d = String(full).replace(/\D/g, '');
  return d.length >= 4 && refWithCheck(d.slice(0, -1)) === d;
}

/** Näyttömuoto: viiden numeron ryhmät oikealta, esim. "2026 00017". */
export const refPretty = (r: string): string =>
  String(r).replace(/\D/g, '').replace(/\B(?=(\d{5})+(?!\d))/g, ' ');

/** Viite yhdelle laskulle: joko yhteinen tai juokseva jäsenkohtainen. */
export function referenceFor(index: number, opts: ReferenceOptions): string {
  if (opts.mode === 'shared') {
    const raw = opts.shared.replace(/\D/g, '');
    if (!raw) return '';
    return refIsValid(raw) ? raw : (refWithCheck(raw) ?? raw);
  }
  const prefix = opts.prefix.replace(/\D/g, '');
  const n = (opts.start || 1) + index;
  return refWithCheck(prefix + String(n).padStart(4, '0')) ?? '';
}

export const ibanPretty = (s: string): string =>
  String(s).toUpperCase().replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();

/** IBANin rakenne ja mod-97-tarkiste. */
export function ibanValid(raw: string): boolean {
  const s = String(raw).toUpperCase().replace(/[\s-]/g, '');
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  const moved = s.slice(4) + s.slice(0, 4);
  const num = moved.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rem = 0;
  for (const ch of num) rem = (rem * 10 + Number(ch)) % 97;
  return rem === 1;
}
