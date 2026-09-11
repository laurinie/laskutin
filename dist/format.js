/* Muotoilu- ja tarkistusapurit. Näissä ei ole DOM-riippuvuuksia, joten ne ovat
   sellaisenaan testattavissa myös Nodessa. */
/** Summa suomalaisessa muodossa, esim. 1 234,50 €. */
export function money(n) {
    const value = Number.isFinite(n) ? n : 0;
    const [whole = '0', cents = '00'] = Math.abs(value).toFixed(2).split('.');
    const sign = value < 0 ? '-' : '';
    return `${sign}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${cents} €`;
}
/** Lukee summan tekstistä: "1 200,50 €" -> 1200.5. Palauttaa null jos ei luku. */
export function parseAmount(s) {
    if (s == null)
        return null;
    const clean = String(s).replace(/[\s €]|eur/gi, '').replace(',', '.');
    if (!clean)
        return null;
    const n = Number(clean);
    return Number.isFinite(n) ? n : null;
}
/** ISO-päivä (2026-09-11) suomalaiseksi (11.9.2026). */
export function fmtDate(iso) {
    if (!iso)
        return '';
    const [y = '', m = '', d = ''] = iso.split('-');
    return `${Number(d)}.${Number(m)}.${y}`;
}
export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
/** Tiedostonimeen kelpaava muoto: skandit puretaan, muut merkit alaviivaksi. */
export function slug(s) {
    return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'lasku';
}
const HTML_ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const escHtml = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => HTML_ESC[c] ?? c);
/** CSV-kenttä: lainausmerkit vain tarvittaessa. */
export const csvField = (v) => /[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
export const errorMessage = (e) => (e instanceof Error ? e.message : String(e));
//# sourceMappingURL=format.js.map