export function money(n) {
    const value = Number.isFinite(n) ? n : 0;
    const [whole = '0', cents = '00'] = Math.abs(value).toFixed(2).split('.');
    const sign = value < 0 ? '-' : '';
    return `${sign}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${cents} €`;
}
export function parseAmount(s) {
    if (s == null)
        return null;
    const clean = String(s).replace(/[\s €]|eur/gi, '').replace(',', '.');
    if (!clean)
        return null;
    const n = Number(clean);
    return Number.isFinite(n) ? n : null;
}
export function fmtDate(iso) {
    if (!iso)
        return '';
    const [year = '', month = '', day = ''] = iso.split('-');
    return `${Number(day)}.${Number(month)}.${year}`;
}
export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
const COMBINING_MARKS = /[\u0300-\u036f]/g;
export function slug(s) {
    return String(s).normalize('NFD').replace(COMBINING_MARKS, '')
        .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'lasku';
}
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const escHtml = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => HTML_ESCAPES[c] ?? c);
const NEEDS_CSV_QUOTES = /[;"\n]/;
export const csvField = (v) => NEEDS_CSV_QUOTES.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
export const errorMessage = (e) => (e instanceof Error ? e.message : String(e));
//# sourceMappingURL=format.js.map