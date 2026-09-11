import { isEmail, parseAmount } from './format.js';
function separatorOf(line) {
    if (line.includes('\t'))
        return '\t';
    if (line.includes(';'))
        return ';';
    return ',';
}
export function splitCols(line) {
    const separator = separatorOf(line);
    const cols = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            const isEscapedQuote = inQuotes && line[i + 1] === '"';
            if (isEscapedQuote) {
                current += '"';
                i++;
            }
            else
                inQuotes = !inQuotes;
        }
        else if (char === separator && !inQuotes) {
            cols.push(current);
            current = '';
        }
        else {
            current += char;
        }
    }
    cols.push(current);
    return cols.map((col) => col.trim());
}
const HEADER_PATTERNS_BY_PRIORITY = [
    ['email', /s[äa]hk[öo]post|e-?mail|sposti/i],
    ['first', /etunimi|first\s*name|given\s*name/i],
    ['last', /sukunimi|last\s*name|family\s*name/i],
    ['name', /nimi|name/i],
    ['amount', /summa|maksu|hinta|amount|eur|€/i]
];
export function headerMap(cols) {
    const map = {};
    cols.forEach((col, i) => {
        const header = col.trim();
        if (!header)
            return;
        const match = HEADER_PATTERNS_BY_PRIORITY.find(([role, pattern]) => map[role] === undefined && pattern.test(header));
        if (match)
            map[match[0]] = i;
    });
    const hasName = map.name !== undefined || map.first !== undefined || map.last !== undefined;
    return (map.email !== undefined || hasName) ? map : null;
}
export function describeMap(map, header) {
    if (!map)
        return '';
    const parts = [];
    const nameCols = [map.first, map.last]
        .filter((i) => i !== undefined)
        .map((i) => header[i] ?? '');
    if (nameCols.length)
        parts.push(`nimi: ${nameCols.join(' + ')}`);
    else if (map.name !== undefined)
        parts.push(`nimi: ${header[map.name]}`);
    if (map.email !== undefined)
        parts.push(`sähköposti: ${header[map.email]}`);
    if (map.amount !== undefined)
        parts.push(`summa: ${header[map.amount]}`);
    return parts.join(' · ');
}
export function rowToMember(cols, map) {
    const mapped = map && rowToMemberByHeader(cols, map);
    return mapped ?? rowToMemberHeuristic(cols);
}
function rowToMemberByHeader(cols, map) {
    const cell = (i) => (i === undefined ? '' : String(cols[i] ?? '').trim());
    const email = cell(map.email) || cols.find(isEmail) || '';
    const name = [cell(map.first), cell(map.last)].filter(Boolean).join(' ') || cell(map.name);
    if (!name && !email)
        return null;
    return {
        name: name || email.split('@')[0],
        email,
        amount: map.amount === undefined ? null : parseAmount(cell(map.amount)),
        badEmail: !isEmail(email)
    };
}
export function rowToMemberHeuristic(cols) {
    const email = cols.find(isEmail) || cols.find((col) => col.includes('@')) || '';
    const rest = cols.filter((col) => col !== email);
    const name = rest.find((col) => col && parseAmount(col) === null) || rest[0] || '';
    const amountCol = rest.find((col) => col !== name && parseAmount(col) !== null);
    return {
        name: name || email.split('@')[0],
        email,
        amount: parseAmount(amountCol),
        badEmail: !isEmail(email)
    };
}
export function parseMembers(text) {
    const rows = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map(splitCols);
    if (!rows.length)
        return { members: [], columnInfo: '' };
    const [firstRow] = rows;
    const hasHeader = !firstRow.some(isEmail);
    const map = hasHeader ? headerMap(firstRow) : null;
    return {
        members: (hasHeader ? rows.slice(1) : rows).map((cols) => rowToMember(cols, map)),
        columnInfo: hasHeader ? describeMap(map, firstRow) : ''
    };
}
export function parseLineItems(text) {
    return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
        const cols = splitCols(line);
        const amount = parseAmount(cols[cols.length - 1]);
        const desc = (amount === null ? cols : cols.slice(0, -1)).join(' ').trim();
        return { desc: desc || 'Laskurivi', amount: amount ?? 0 };
    });
}
export function itemsFor(member, defaults, fallbackDesc) {
    const desc = fallbackDesc || 'Laskurivi';
    if (member.amount === null)
        return defaults.length ? defaults : [{ desc, amount: 0 }];
    return [{ desc: defaults[0]?.desc || desc, amount: member.amount }];
}
//# sourceMappingURL=members.js.map