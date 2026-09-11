import { isEmail, parseAmount } from './format.js';
/** Jakaa rivin sarakkeisiin. Erotin päätellään rivistä: tab, puolipiste tai pilkku. */
export function splitCols(line) {
    const sep = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
    // kevyt CSV-jäsennys: tukee lainausmerkkejä ja niiden sisällä olevia erottimia
    const out = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
            if (quoted && line[i + 1] === '"') {
                cur += '"';
                i++;
            }
            else
                quoted = !quoted;
        }
        else if (c === sep && !quoted) {
            out.push(cur);
            cur = '';
        }
        else {
            cur += c;
        }
    }
    out.push(cur);
    return out.map((s) => s.trim());
}
/* Otsikkorivin sarakkeiden tunnistus. Järjestys ratkaisee: etu-/sukunimi ennen nimeä,
   jotta "Etunimi" ei mene "Nimi"-sarakkeeksi. Jäsennumeron kaltaiset sarakkeet eivät
   osu mihinkään kuvioon, joten niitä ei sekoiteta summaan. */
const HEADER_PATTERNS = [
    ['email', /s[äa]hk[öo]post|e-?mail|sposti/i],
    ['first', /etunimi|first\s*name|given\s*name/i],
    ['last', /sukunimi|last\s*name|family\s*name/i],
    ['name', /nimi|name/i],
    ['amount', /summa|maksu|hinta|amount|eur|€/i]
];
/** Sarakekartta otsikkoriviltä, tai null jos otsikkoa ei tunnisteta. */
export function headerMap(cols) {
    const map = {};
    cols.forEach((col, i) => {
        const t = String(col).trim();
        if (!t)
            return;
        const hit = HEADER_PATTERNS.find(([key, re]) => map[key] === undefined && re.test(t));
        if (hit)
            map[hit[0]] = i;
    });
    const named = map.name !== undefined || map.first !== undefined || map.last !== undefined;
    return (map.email !== undefined || named) ? map : null;
}
/** Sarakekartta ihmisluettavaksi, esim. "nimi: Etunimi + Sukunimi · summa: Jäsenmaksu". */
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
/** Sarakkeista jäseneksi tunnistetun otsikkorivin avulla. */
export function rowToMember(cols, map) {
    if (map) {
        const pick = (i) => (i === undefined ? '' : String(cols[i] ?? '').trim());
        const email = pick(map.email) || cols.find(isEmail) || '';
        const name = [pick(map.first), pick(map.last)].filter(Boolean).join(' ') || pick(map.name);
        const amount = map.amount === undefined ? null : parseAmount(pick(map.amount));
        if (name || email) {
            return { name: name || email.split('@')[0], email, amount, badEmail: !isEmail(email) };
        }
    }
    return rowToMemberHeuristic(cols);
}
/** Ilman otsikkoriviä: sarakkeet päätellään sisällöstä. */
export function rowToMemberHeuristic(cols) {
    const email = cols.find(isEmail) || cols.find((c) => c.includes('@')) || '';
    const rest = cols.filter((c) => c !== email);
    // nimi = ensimmäinen sarake joka ei ole summa eikä sähköposti
    let name = rest.find((c) => c && parseAmount(c) === null) || '';
    if (!name && rest.length)
        name = rest[0];
    const amountCol = rest.find((c) => c !== name && parseAmount(c) !== null);
    return {
        name: name || email.split('@')[0],
        email,
        amount: parseAmount(amountCol),
        badEmail: !isEmail(email)
    };
}
/** Jäsenlista tekstistä. Ensimmäinen rivi tulkitaan otsikoksi jos siinä ei ole sähköpostia. */
export function parseMembers(text) {
    const members = [];
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let map = null;
    let columnInfo = '';
    lines.forEach((line, idx) => {
        const cols = splitCols(line);
        if (idx === 0 && !cols.some(isEmail)) {
            map = headerMap(cols);
            columnInfo = describeMap(map, cols);
            return;
        }
        members.push(rowToMember(cols, map));
    });
    return { members, columnInfo };
}
/** Laskurivit tekstistä, yksi rivi per kohta muodossa "Kuvaus;summa". */
export function parseLineItems(text) {
    return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((line) => {
        const cols = splitCols(line);
        const amount = parseAmount(cols[cols.length - 1]);
        const desc = (amount === null ? cols : cols.slice(0, -1)).join(' ').trim();
        return { desc: desc || 'Laskurivi', amount: amount ?? 0 };
    });
}
/** Laskurivit yhdelle jäsenelle; jäsenkohtainen summa korvaa oletusrivit. */
export function itemsFor(member, base, fallbackDesc) {
    const desc = fallbackDesc || 'Laskurivi';
    if (member.amount === null) {
        return base.length ? base : [{ desc, amount: 0 }];
    }
    return [{ desc: base[0]?.desc || desc, amount: member.amount }];
}
//# sourceMappingURL=members.js.map