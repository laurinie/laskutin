import type { ColumnMap, LineItem, Member } from './types.js';
import { isEmail, parseAmount } from './format.js';

function separatorOf(line: string): string {
  if (line.includes('\t')) return '\t';
  if (line.includes(';')) return ';';
  return ',';
}

export function splitCols(line: string): string[] {
  const separator = separatorOf(line);
  const cols: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      const isEscapedQuote = inQuotes && line[i + 1] === '"';
      if (isEscapedQuote) { current += '"'; i++; } else inQuotes = !inQuotes;
    } else if (char === separator && !inQuotes) {
      cols.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cols.push(current);
  return cols.map((col) => col.trim());
}

const HEADER_PATTERNS_BY_PRIORITY: ReadonlyArray<[keyof ColumnMap, RegExp]> = [
  ['email', /s[äa]hk[öo]post|e-?mail|sposti/i],
  ['first', /etunimi|first\s*name|given\s*name/i],
  ['last', /sukunimi|last\s*name|family\s*name/i],
  ['name', /nimi|name/i],
  ['amount', /summa|maksu|hinta|amount|eur|€/i]
];

export function headerMap(cols: string[]): ColumnMap | null {
  const map: ColumnMap = {};

  cols.forEach((col, i) => {
    const header = col.trim();
    if (!header) return;
    const match = HEADER_PATTERNS_BY_PRIORITY.find(([role, pattern]) =>
      map[role] === undefined && pattern.test(header));
    if (match) map[match[0]] = i;
  });

  const hasName = map.name !== undefined || map.first !== undefined || map.last !== undefined;
  return (map.email !== undefined || hasName) ? map : null;
}

export function describeMap(map: ColumnMap | null, header: string[]): string {
  if (!map) return '';

  const parts: string[] = [];
  const nameCols = [map.first, map.last]
    .filter((i): i is number => i !== undefined)
    .map((i) => header[i] ?? '');

  if (nameCols.length) parts.push(`nimi: ${nameCols.join(' + ')}`);
  else if (map.name !== undefined) parts.push(`nimi: ${header[map.name]}`);
  if (map.email !== undefined) parts.push(`sähköposti: ${header[map.email]}`);
  if (map.amount !== undefined) parts.push(`summa: ${header[map.amount]}`);
  return parts.join(' · ');
}

export function rowToMember(cols: string[], map: ColumnMap | null): Member {
  const mapped = map && rowToMemberByHeader(cols, map);
  return mapped ?? rowToMemberHeuristic(cols);
}

function rowToMemberByHeader(cols: string[], map: ColumnMap): Member | null {
  const cell = (i: number | undefined): string => (i === undefined ? '' : String(cols[i] ?? '').trim());

  const email = cell(map.email) || cols.find(isEmail) || '';
  const name = [cell(map.first), cell(map.last)].filter(Boolean).join(' ') || cell(map.name);
  if (!name && !email) return null;

  return {
    name: name || email.split('@')[0]!,
    email,
    amount: map.amount === undefined ? null : parseAmount(cell(map.amount)),
    badEmail: !isEmail(email)
  };
}

export function rowToMemberHeuristic(cols: string[]): Member {
  const email = cols.find(isEmail) || cols.find((col) => col.includes('@')) || '';
  const rest = cols.filter((col) => col !== email);
  const name = rest.find((col) => col && parseAmount(col) === null) || rest[0] || '';
  const amountCol = rest.find((col) => col !== name && parseAmount(col) !== null);

  return {
    name: name || email.split('@')[0]!,
    email,
    amount: parseAmount(amountCol),
    badEmail: !isEmail(email)
  };
}

export interface ParsedMembers {
  members: Member[];
  columnInfo: string;
}

export function parseMembers(text: string): ParsedMembers {
  const rows = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map(splitCols);
  if (!rows.length) return { members: [], columnInfo: '' };

  const [firstRow] = rows as [string[], ...string[][]];
  const hasHeader = !firstRow.some(isEmail);
  const map = hasHeader ? headerMap(firstRow) : null;

  return {
    members: (hasHeader ? rows.slice(1) : rows).map((cols) => rowToMember(cols, map)),
    columnInfo: hasHeader ? describeMap(map, firstRow) : ''
  };
}

export function parseLineItems(text: string): LineItem[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const cols = splitCols(line);
    const amount = parseAmount(cols[cols.length - 1]);
    const desc = (amount === null ? cols : cols.slice(0, -1)).join(' ').trim();
    return { desc: desc || 'Laskurivi', amount: amount ?? 0 };
  });
}

export function itemsFor(member: Member, defaults: LineItem[], fallbackDesc: string): LineItem[] {
  const desc = fallbackDesc || 'Laskurivi';
  if (member.amount === null) return defaults.length ? defaults : [{ desc, amount: 0 }];
  return [{ desc: defaults[0]?.desc || desc, amount: member.amount }];
}
