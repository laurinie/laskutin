const CHECKSUM_WEIGHTS = [7, 3, 1];
const MIN_BODY_DIGITS = 3;
const MAX_BODY_DIGITS = 19;
export function refWithCheck(body) {
    const digits = String(body).replace(/\D/g, '').replace(/^0+/, '');
    if (digits.length < MIN_BODY_DIGITS || digits.length > MAX_BODY_DIGITS)
        return null;
    let sum = 0;
    for (let i = digits.length - 1, weight = 0; i >= 0; i--, weight++) {
        sum += Number(digits[i]) * CHECKSUM_WEIGHTS[weight % CHECKSUM_WEIGHTS.length];
    }
    return digits + String((10 - (sum % 10)) % 10);
}
export function refIsValid(full) {
    const digits = String(full).replace(/\D/g, '');
    return digits.length > MIN_BODY_DIGITS && refWithCheck(digits.slice(0, -1)) === digits;
}
export const refPretty = (r) => String(r).replace(/\D/g, '').replace(/\B(?=(\d{5})+(?!\d))/g, ' ');
export function referenceFor(index, opts) {
    if (opts.mode === 'shared')
        return sharedReference(opts.shared);
    const prefix = opts.prefix.replace(/\D/g, '');
    const running = String((opts.start || 1) + index).padStart(4, '0');
    return refWithCheck(prefix + running) ?? '';
}
function sharedReference(given) {
    const digits = given.replace(/\D/g, '');
    if (!digits)
        return '';
    return refIsValid(digits) ? digits : (refWithCheck(digits) ?? digits);
}
export const ibanPretty = (s) => String(s).toUpperCase().replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
const IBAN_SHAPE = /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/;
export function ibanValid(raw) {
    const iban = String(raw).toUpperCase().replace(/[\s-]/g, '');
    if (!IBAN_SHAPE.test(iban))
        return false;
    const rearranged = iban.slice(4) + iban.slice(0, 4);
    const digits = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
    let remainder = 0;
    for (const digit of digits)
        remainder = (remainder * 10 + Number(digit)) % 97;
    return remainder === 1;
}
//# sourceMappingURL=reference.js.map