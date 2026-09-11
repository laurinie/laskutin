/* Excel-tuki (.xlsx). Tiedosto on zip-paketti XML:ää, joten JSZip riittää –
   erillistä taulukkokirjastoa ei tarvita.
   Sekä luku että pohjan kirjoitus hoidetaan tässä. */
import type JSZipType from 'jszip';

type JSZipCtor = typeof JSZipType;

const XML_ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

export const xmlDecode = (s: string): string =>
  String(s).replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos);/g, (_m, e: string) =>
    e[0] === '#'
      ? String.fromCodePoint(Number(e[1] === 'x' || e[1] === 'X' ? '0x' + e.slice(2) : e.slice(1)))
      : XML_ENT[e] ?? '');

const XML_ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const xmlEscape = (s: string): string =>
  String(s).replace(/[&<>"]/g, (c) => XML_ESC[c] ?? c);

/** Sarakeviite (esim. "AB12") nollapohjaiseksi indeksiksi. */
export function colIndex(ref: string): number {
  const letters = (String(ref).match(/^[A-Z]+/) ?? ['A'])[0]!;
  let n = 0;
  for (const c of letters) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

/** Nollapohjainen indeksi sarakeviitteeksi: 0 -> A, 26 -> AA. */
export function colRef(i: number): string {
  let s = '';
  let n = i + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - r) / 26);
  }
  return s;
}

/** Kaikki <t>-tekstit elementistä yhtenä merkkijonona (rich text -ajot mukaan lukien). */
export function textOf(xml: string): string {
  let out = '';
  String(xml).replace(/<t[^>]*>([\s\S]*?)<\/t>/g, (m, t: string) => { out += xmlDecode(t); return m; });
  return out;
}

/** Lukee .xlsx-tiedoston ensimmäisen taulukon soluriveiksi. */
export async function readXlsx(file: Blob | ArrayBuffer | Uint8Array, zipLib: JSZipCtor): Promise<string[][]> {
  const zip = await zipLib.loadAsync(file as never);
  const sheetPath = Object.keys(zip.files)
    .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(n))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))[0];
  if (!sheetPath) throw new Error('Tiedostosta ei löytynyt Excel-taulukkoa.');

  const shared: string[] = [];
  const ssFile = zip.file('xl/sharedStrings.xml');
  if (ssFile) {
    const ss = await ssFile.async('string');
    ss.replace(/<si\b[^>]*>([\s\S]*?)<\/si>/g, (m, si: string) => { shared.push(textOf(si)); return m; });
  }

  const sheet = await zip.file(sheetPath)!.async('string');
  const rows: string[][] = [];
  sheet.replace(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g, (rm, body: string = '') => {
    const cells: string[] = [];
    let auto = 0;
    String(body).replace(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, (cm, attrs: string, cellBody: string = '') => {
      const ref = attrs.match(/r="([A-Z]+\d+)"/)?.[1];
      const type = attrs.match(/t="([^"]+)"/)?.[1] ?? 'n';
      const v = String(cellBody).match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let val = '';
      if (type === 's') val = shared[Number(v)] ?? '';
      else if (type === 'inlineStr') val = textOf(cellBody);
      else val = v == null ? '' : xmlDecode(v);
      const at = ref ? colIndex(ref) : auto;
      cells[at] = val;
      auto = at + 1;
      return cm;
    });
    rows.push(Array.from(cells, (c) => (c == null ? '' : String(c).trim())));
    return rm;
  });
  return rows.filter((r) => r.some((c) => c));
}

/** Solurivit takaisin tekstiksi, jotta lista näkyy ja on muokattavissa tekstikentässä. */
export const rowsToText = (rows: string[][]): string =>
  rows.map((cols) => cols.map((c) => (/[;"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(';')).join('\n');

export const TEMPLATE_ROWS: ReadonlyArray<ReadonlyArray<string | number>> = [
  ['Nimi', 'Sähköposti', 'Summa'],
  ['Matti Meikäläinen', 'matti.meikalainen@example.com', 40],
  ['Maija Virtanen', 'maija.virtanen@example.com', 40],
  ['Ömer Äkkinen', 'omer.akkinen@example.com', 20]
];

export const TEMPLATE_CSV = '\uFEFF' + TEMPLATE_ROWS
  .map((r) => r.map((v) => (typeof v === 'number' ? v.toFixed(2).replace('.', ',') : v)).join(';'))
  .join('\r\n') + '\r\n';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Rakentaa .xlsx-pohjan (otsikkorivi lihavoituna) ilman lisäkirjastoja. */
export function templateXlsxZip(zipLib: JSZipCtor): JSZipType {
  const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

  const sheetData = TEMPLATE_ROWS.map((row, r) => {
    const cells = row.map((val, c) => {
      const ref = colRef(c) + (r + 1);
      const style = r === 0 ? ' s="1"' : '';
      return typeof val === 'number'
        ? `<c r="${ref}"${style}><v>${val}</v></c>`
        : `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(val)}</t></is></c>`;
    }).join('');
    return `<row r="${r + 1}">${cells}</row>`;
  }).join('');

  const zip = new zipLib();
  zip.file('[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`);
  zip.file('_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.file('xl/workbook.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS}" xmlns:r="${REL}">` +
    `<sheets><sheet name="Jäsenet" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  zip.file('xl/_rels/workbook.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId2" Type="${REL}/styles" Target="styles.xml"/></Relationships>`);
  zip.file('xl/styles.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${NS}">` +
    `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
    `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
    `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
    `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>` +
    `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
  zip.file('xl/worksheets/sheet1.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${NS}">` +
    `<cols><col min="1" max="1" width="28" customWidth="1"/><col min="2" max="2" width="36" customWidth="1"/>` +
    `<col min="3" max="3" width="12" customWidth="1"/></cols><sheetData>${sheetData}</sheetData></worksheet>`);
  return zip;
}
