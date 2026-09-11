const XML_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
export const xmlDecode = (s) => String(s).replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos);/g, (_match, entity) => {
    if (entity[0] !== '#')
        return XML_ENTITIES[entity] ?? '';
    const isHex = entity[1] === 'x' || entity[1] === 'X';
    return String.fromCodePoint(Number(isHex ? '0x' + entity.slice(2) : entity.slice(1)));
});
const XML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const xmlEscape = (s) => String(s).replace(/[&<>"]/g, (c) => XML_ESCAPES[c] ?? c);
export function colIndex(ref) {
    const letters = (String(ref).match(/^[A-Z]+/) ?? ['A'])[0];
    let index = 0;
    for (const letter of letters)
        index = index * 26 + (letter.charCodeAt(0) - 64);
    return index - 1;
}
export function colRef(index) {
    let ref = '';
    let n = index + 1;
    while (n > 0) {
        const remainder = (n - 1) % 26;
        ref = String.fromCharCode(65 + remainder) + ref;
        n = Math.floor((n - remainder) / 26);
    }
    return ref;
}
export function textOf(xml) {
    let text = '';
    String(xml).replace(/<t[^>]*>([\s\S]*?)<\/t>/g, (match, content) => {
        text += xmlDecode(content);
        return match;
    });
    return text;
}
function firstSheetPath(zip) {
    const path = Object.keys(zip.files)
        .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
        .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))[0];
    if (!path)
        throw new Error('Tiedostosta ei löytynyt Excel-taulukkoa.');
    return path;
}
async function sharedStringsOf(zip) {
    const file = zip.file('xl/sharedStrings.xml');
    if (!file)
        return [];
    const strings = [];
    const xml = await file.async('string');
    xml.replace(/<si\b[^>]*>([\s\S]*?)<\/si>/g, (match, item) => {
        strings.push(textOf(item));
        return match;
    });
    return strings;
}
function parseRow(xml, sharedStrings) {
    const cells = [];
    let nextIndex = 0;
    xml.replace(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, (match, attrs, body = '') => {
        const ref = attrs.match(/r="([A-Z]+\d+)"/)?.[1];
        const type = attrs.match(/t="([^"]+)"/)?.[1] ?? 'n';
        const rawValue = String(body).match(/<v>([\s\S]*?)<\/v>/)?.[1];
        let value = '';
        if (type === 's')
            value = sharedStrings[Number(rawValue)] ?? '';
        else if (type === 'inlineStr')
            value = textOf(body);
        else if (rawValue != null)
            value = xmlDecode(rawValue);
        const at = ref ? colIndex(ref) : nextIndex;
        cells[at] = value;
        nextIndex = at + 1;
        return match;
    });
    return Array.from(cells, (cell) => (cell == null ? '' : String(cell).trim()));
}
export async function readXlsx(file, zipLib) {
    const zip = await zipLib.loadAsync(file);
    const sharedStrings = await sharedStringsOf(zip);
    const sheet = await zip.file(firstSheetPath(zip)).async('string');
    const rows = [];
    sheet.replace(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g, (match, body = '') => {
        rows.push(parseRow(String(body), sharedStrings));
        return match;
    });
    return rows.filter((row) => row.some((cell) => cell));
}
export const rowsToText = (rows) => rows.map((cols) => cols.map((cell) => (/[;"\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(';')).join('\n');
export const TEMPLATE_ROWS = [
    ['Nimi', 'Sähköposti', 'Summa'],
    ['Matti Meikäläinen', 'matti.meikalainen@example.com', 40],
    ['Maija Virtanen', 'maija.virtanen@example.com', 40],
    ['Ömer Äkkinen', 'omer.akkinen@example.com', 20]
];
const BOM = '\uFEFF';
export const TEMPLATE_CSV = BOM + TEMPLATE_ROWS
    .map((row) => row.map((cell) => (typeof cell === 'number' ? cell.toFixed(2).replace('.', ',') : cell)).join(';'))
    .join('\r\n') + '\r\n';
export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const SHEET_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const HEADER_STYLE = 1;
function cellXml(value, ref, style) {
    const styleAttr = style ? ` s="${style}"` : '';
    return typeof value === 'number'
        ? `<c r="${ref}"${styleAttr}><v>${value}</v></c>`
        : `<c r="${ref}"${styleAttr} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
}
function sheetDataXml() {
    return TEMPLATE_ROWS.map((row, rowIndex) => {
        const style = rowIndex === 0 ? HEADER_STYLE : 0;
        const cells = row.map((value, col) => cellXml(value, colRef(col) + (rowIndex + 1), style)).join('');
        return `<row r="${rowIndex + 1}">${cells}</row>`;
    }).join('');
}
export function templateXlsxZip(zipLib) {
    const zip = new zipLib();
    zip.file('[Content_Types].xml', `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`);
    zip.file('_rels/.rels', `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="${REL_NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
    zip.file('xl/workbook.xml', `${XML_HEADER}<workbook xmlns="${SHEET_NS}" xmlns:r="${REL_NS}">` +
        `<sheets><sheet name="Jäsenet" sheetId="1" r:id="rId1"/></sheets></workbook>`);
    zip.file('xl/_rels/workbook.xml.rels', `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="${REL_NS}/worksheet" Target="worksheets/sheet1.xml"/>` +
        `<Relationship Id="rId2" Type="${REL_NS}/styles" Target="styles.xml"/></Relationships>`);
    zip.file('xl/styles.xml', `${XML_HEADER}<styleSheet xmlns="${SHEET_NS}">` +
        `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
        `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
        `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
        `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
        `<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
        `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>` +
        `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
    zip.file('xl/worksheets/sheet1.xml', `${XML_HEADER}<worksheet xmlns="${SHEET_NS}">` +
        `<cols><col min="1" max="1" width="28" customWidth="1"/><col min="2" max="2" width="36" customWidth="1"/>` +
        `<col min="3" max="3" width="12" customWidth="1"/></cols><sheetData>${sheetDataXml()}</sheetData></worksheet>`);
    return zip;
}
//# sourceMappingURL=xlsx.js.map