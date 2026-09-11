/* Laskutin – käyttöliittymäkerros: lomakkeen luku, tilan tallennus ja lataukset.
   Varsinainen logiikka on moduuleissa members/xlsx/pdf/reference/format. */
import type { Invoice, InvoiceConfig, LogoPosition, Logo, Member, RefMode, ReferenceOptions } from './types.js';
import { csvField, errorMessage, escHtml, fmtDate, money, slug } from './format.js';
import { ibanPretty, ibanValid, refIsValid, refPretty, referenceFor } from './reference.js';
import { itemsFor, parseLineItems, parseMembers } from './members.js';
import { readXlsx, rowsToText, templateXlsxZip, TEMPLATE_CSV, XLSX_MIME } from './xlsx.js';
import { drawInvoice } from './pdf.js';

const STORE_KEY = 'laskutin.v1';
const STORE_KEY_OLD = 'laskuttaja.v1';        // sovelluksen aiempi nimi

/* ---------- DOM-apurit ---------- */

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Elementtiä #${id} ei löytynyt`);
  return node as T;
}
const field = (id: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
  el<HTMLInputElement>(id);
const val = (id: string): string => field(id).value;
const setVal = (id: string, v: string): void => { field(id).value = v; };

const refMode = (): RefMode =>
  (document.querySelector<HTMLInputElement>('input[name=refMode]:checked')?.value as RefMode) ?? 'per';

/* ---------- tila ---------- */

let members: Member[] = [];
let columnInfo = '';
let logo: Logo | null = null;

/* ---------- lomakkeen luku ---------- */

const refOptions = (): ReferenceOptions => ({
  mode: refMode(),
  prefix: val('refPrefix'),
  start: Number(val('refStart') || 1),
  shared: val('sharedRef')
});

const config = (): InvoiceConfig => ({
  title: val('title'),
  intro: val('intro'),
  footer: val('footer'),
  payee: val('payee'),
  iban: ibanPretty(val('iban')),
  bic: val('bic').trim(),
  invoiceDate: fmtDate(val('invoiceDate')),
  dueDate: fmtDate(val('dueDate')),
  payNote: val('payNote'),
  logoPos: val('logoPos') as LogoPosition,
  logoW: Number(val('logoW')) || 45
});

function invoiceFor(member: Member, index: number): Invoice {
  const items = itemsFor(member, parseLineItems(val('lines')), val('title'));
  return {
    member,
    items,
    total: items.reduce((sum, it) => sum + it.amount, 0),
    invoiceNo: Number(val('invoiceNoStart') || 1) + index,
    reference: referenceFor(index, refOptions())
  };
}

/* ---------- näkymän päivitys ---------- */

function refresh(): void {
  const parsed = parseMembers(val('members'));
  members = parsed.members;
  columnInfo = parsed.columnInfo;
  el('memberCount').textContent = `${members.length} jäsentä`;
  renderTable();
  validate();
  save();
}

function renderTable(): void {
  const wrap = el('memberTableWrap');
  const info = el('columnInfo');
  if (!members.length) { wrap.innerHTML = ''; info.textContent = ''; return; }
  const rows = members.map((m, i) => {
    const d = invoiceFor(m, i);
    return `<tr>
      <td class="num">${d.invoiceNo}</td>
      <td>${escHtml(m.name)}</td>
      <td class="${m.badEmail ? 'bad' : ''}">${escHtml(m.email) || '– puuttuu –'}</td>
      <td>${refPretty(d.reference) || '–'}</td>
      <td class="num">${money(d.total)}</td>
    </tr>`;
  }).join('');
  wrap.innerHTML = `<table><thead><tr><th>Laskunro</th><th>Nimi</th><th>Sähköposti</th><th>Viite</th><th>Summa</th></tr></thead><tbody>${rows}</tbody></table>`;

  const bad = members.filter((m) => m.badEmail).length;
  const parts: string[] = [];
  if (columnInfo) parts.push(`Tunnistetut sarakkeet → ${columnInfo}`);
  if (bad) parts.push(`${bad} riviltä puuttuu kelvollinen sähköposti`);
  info.textContent = parts.join(' · ');
}

function validate(): void {
  const ib = el('ibanCheck');
  const iban = val('iban').trim();
  if (!iban) { ib.textContent = 'IBAN puuttuu.'; ib.className = 'check warn'; }
  else if (ibanValid(iban)) { ib.textContent = `✓ IBAN kelvollinen: ${ibanPretty(iban)}`; ib.className = 'check ok'; }
  else { ib.textContent = '✗ IBAN ei läpäise tarkistusta – tarkista numero.'; ib.className = 'check err'; }

  const rc = el('refCheck');
  if (refMode() === 'shared') {
    const raw = val('sharedRef').replace(/\D/g, '');
    if (!raw) { rc.textContent = 'Anna yhteinen viite.'; rc.className = 'check warn'; }
    else if (refIsValid(raw)) { rc.textContent = `✓ Viite ${refPretty(raw)} on kelvollinen.`; rc.className = 'check ok'; }
    else {
      rc.textContent = `Tarkiste lisätty automaattisesti → ${refPretty(referenceFor(0, refOptions()))}`;
      rc.className = 'check warn';
    }
  } else {
    const first = referenceFor(0, refOptions());
    const last = members.length ? referenceFor(members.length - 1, refOptions()) : first;
    rc.textContent = first
      ? `Viitteet välillä ${refPretty(first)} – ${refPretty(last)}`
      : 'Tunnusosa + juokseva numero on liian lyhyt (vähintään 3 numeroa yhteensä).';
    rc.className = first ? 'check ok' : 'check err';
  }
}

function setStatus(msg: string, isErr = false): void {
  const node = el('status');
  node.textContent = msg;
  node.style.color = isErr ? 'var(--err)' : '';
}

/* ---------- PDF-tuotanto ---------- */

function newDoc() {
  const lib = window.jspdf;
  if (!lib) throw new Error('jsPDF ei latautunut – tarkista että vendor/jspdf.umd.min.js on paikallaan.');
  return new lib.jsPDF({ unit: 'mm', format: 'a4', compress: true });
}

function guard(): boolean {
  if (!members.length) { setStatus('Lisää ensin jäsenlista.', true); return false; }
  if (!window.jspdf) { setStatus('jsPDF ei latautunut – tarkista vendor-hakemisto.', true); return false; }
  return true;
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function preview(): void {
  if (!guard()) return;
  const doc = newDoc();
  const first = members[0]!;
  drawInvoice(doc, invoiceFor(first, 0), config(), logo);
  const frame = el<HTMLIFrameElement>('preview');
  frame.src = URL.createObjectURL(doc.output('blob'));
  frame.classList.add('on');
  setStatus(`Esikatselu: ${first.name}. Muut laskut noudattavat samaa ulkoasua.`);
}

function onePdf(): void {
  if (!guard()) return;
  const doc = newDoc();
  const cfg = config();
  members.forEach((m, i) => {
    if (i) doc.addPage();
    drawInvoice(doc, invoiceFor(m, i), cfg, logo);
  });
  download(doc.output('blob'), `laskut_${new Date().toISOString().slice(0, 10)}.pdf`);
  setStatus(`Valmis: ${members.length} laskua yhdessä PDF-tiedostossa.`);
}

async function zipPdfs(): Promise<void> {
  if (!guard()) return;
  if (!window.JSZip) { setStatus('JSZip ei latautunut – tarkista vendor-hakemisto.', true); return; }
  const btn = el<HTMLButtonElement>('zipBtn');
  btn.disabled = true;
  setStatus('Luodaan laskuja…');
  try {
    const zip = new window.JSZip();
    const cfg = config();
    for (let i = 0; i < members.length; i++) {
      const d = invoiceFor(members[i]!, i);
      const doc = newDoc();
      drawInvoice(doc, d, cfg, logo);
      zip.file(`${d.invoiceNo}_${slug(d.member.name)}.pdf`, doc.output('blob'));
      if (i % 20 === 0) {
        setStatus(`Luodaan laskuja… ${i + 1}/${members.length}`);
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    zip.file('laskut.csv', csvText());
    download(await zip.generateAsync({ type: 'blob' }), `laskut_${new Date().toISOString().slice(0, 10)}.zip`);
    setStatus(`Valmis: ${members.length} erillistä PDF:ää + laskut.csv ZIP-paketissa.`);
  } catch (e) {
    setStatus('Virhe ZIP-paketin luonnissa: ' + errorMessage(e), true);
  } finally {
    btn.disabled = false;
  }
}

function csvText(): string {
  const head = 'nimi;sahkoposti;laskunumero;viite;summa;erapaiva';
  const rows = members.map((m, i) => {
    const d = invoiceFor(m, i);
    return [m.name, m.email, d.invoiceNo, d.reference, d.total.toFixed(2).replace('.', ','), fmtDate(val('dueDate'))]
      .map(csvField).join(';');
  });
  return '\uFEFF' + [head, ...rows].join('\r\n');
}

function exportCsv(): void {
  if (!members.length) { setStatus('Lisää ensin jäsenlista.', true); return; }
  download(new Blob([csvText()], { type: 'text/csv;charset=utf-8' }), 'laskut.csv');
  setStatus('CSV viety – kätevä esim. sähköpostien massalähetykseen.');
}

/* ---------- tiedostojen tuonti ---------- */

async function importFile(file: File): Promise<void> {
  try {
    if (/\.xlsx$/i.test(file.name) || /spreadsheetml/.test(file.type)) {
      if (!window.JSZip) throw new Error('JSZip ei latautunut – Excel-tuonti ei käytettävissä.');
      const rows = await readXlsx(file, window.JSZip);
      if (!rows.length) { setStatus('Excel-tiedostosta ei löytynyt rivejä.', true); return; }
      setVal('members', rowsToText(rows));
      refresh();
      setStatus(`Tuotu Excelistä: ${members.length} jäsentä (${rows.length} riviä).`);
    } else if (/\.xls$/i.test(file.name)) {
      setStatus('Vanhaa .xls-muotoa ei tueta. Tallenna Excelissä muodossa .xlsx tai CSV.', true);
    } else {
      setVal('members', await file.text());
      refresh();
      setStatus(`Tuotu tiedostosta: ${members.length} jäsentä.`);
    }
  } catch (e) {
    setStatus('Tiedoston luku epäonnistui: ' + errorMessage(e), true);
  }
}

function loadLogo(file: File): void {
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = String(reader.result);
    const img = new Image();
    img.onload = () => {
      logo = {
        dataUrl,
        format: /png/i.test(file.type) ? 'PNG' : 'JPEG',
        ratio: img.naturalWidth / img.naturalHeight
      };
      el('logoPreview').innerHTML = `<img src="${escHtml(dataUrl)}" alt="logon esikatselu">`;
      save();
    };
    img.onerror = () => setStatus('Kuvaa ei voitu lukea.', true);
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

/* ---------- tilan tallennus ---------- */

const FIELDS = ['members', 'title', 'intro', 'lines', 'footer', 'payee', 'iban', 'bic',
  'invoiceDate', 'dueDate', 'invoiceNoStart', 'payNote', 'refPrefix', 'refStart', 'sharedRef',
  'logoPos', 'logoW'] as const;

interface StoredState {
  refMode?: RefMode;
  logo?: Logo;
  [field: string]: string | RefMode | Logo | undefined;
}

function save(): void {
  const data: StoredState = {};
  FIELDS.forEach((f) => { data[f] = val(f); });
  data.refMode = refMode();
  if (logo && logo.dataUrl.length < 1_500_000) data.logo = logo;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch { /* kvootti täynnä */ }
}

function restore(): boolean {
  let data: StoredState | null = null;
  try {
    const raw = localStorage.getItem(STORE_KEY) ?? localStorage.getItem(STORE_KEY_OLD);
    data = raw ? (JSON.parse(raw) as StoredState) : null;
  } catch { data = null; }
  if (!data) return false;

  FIELDS.forEach((f) => {
    const v = data![f];
    if (typeof v === 'string') setVal(f, v);
  });
  if (data.refMode) {
    const radio = document.querySelector<HTMLInputElement>(`input[name=refMode][value="${data.refMode}"]`);
    if (radio) radio.checked = true;
  }
  if (data.logo) {
    logo = data.logo;
    el('logoPreview').innerHTML = `<img src="${escHtml(logo.dataUrl)}" alt="logon esikatselu">`;
  }
  return true;
}

const DEMO = `Nimi;Sähköposti;Summa
Matti Meikäläinen;matti.meikalainen@example.com;40,00
Maija Virtanen;maija.virtanen@example.com;40,00
Ömer Äkkinen;omer.akkinen@example.com;20,00
Liisa Lahtinen;liisa@example.com;`;

/* ---------- alustus ---------- */

function toggleRefMode(): void {
  const shared = refMode() === 'shared';
  el('sharedWrap').classList.toggle('hidden', !shared);
  el('prefixWrap').classList.toggle('hidden', shared);
  el('counterWrap').classList.toggle('hidden', shared);
}

function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let timer: number | undefined;
  return (...args: A) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms) as unknown as number;
  };
}

function init(): void {
  const today = new Date();
  setVal('invoiceDate', today.toISOString().slice(0, 10));
  setVal('dueDate', new Date(today.getTime() + 14 * 864e5).toISOString().slice(0, 10));

  if (!restore()) setVal('members', DEMO);

  el('parseBtn').onclick = () => refresh();
  el('demoBtn').onclick = () => { setVal('members', DEMO); refresh(); };
  el('previewBtn').onclick = () => preview();
  el('onePdfBtn').onclick = () => onePdf();
  el('zipBtn').onclick = () => { void zipPdfs(); };
  el('csvBtn').onclick = () => exportCsv();

  el<HTMLInputElement>('csvFile').onchange = (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) void importFile(file);
    input.value = '';                       // sama tiedosto voidaan tuoda uudelleen
  };
  el('tplCsvBtn').onclick = () => {
    download(new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' }), 'jasenlista-pohja.csv');
    setStatus('CSV-pohja ladattu. Täytä nimet ja sähköpostit, tuo sitten takaisin.');
  };
  el('tplXlsxBtn').onclick = () => {
    void (async () => {
      try {
        if (!window.JSZip) throw new Error('JSZip ei latautunut – Excel-pohjaa ei voi luoda.');
        const zip = templateXlsxZip(window.JSZip);
        download(await zip.generateAsync({ type: 'blob', mimeType: XLSX_MIME }), 'jasenlista-pohja.xlsx');
        setStatus('Excel-pohja ladattu. Täytä nimet ja sähköpostit, tuo sitten takaisin.');
      } catch (e) {
        setStatus('Excel-pohjan luonti epäonnistui: ' + errorMessage(e), true);
      }
    })();
  };

  // raahaa ja pudota tiedosto jäsenlistakenttään
  const drop = el<HTMLTextAreaElement>('members');
  (['dragover', 'dragenter'] as const).forEach((ev) => drop.addEventListener(ev, (e) => {
    e.preventDefault();
    drop.style.outline = '2px dashed var(--accent)';
  }));
  (['dragleave', 'drop'] as const).forEach((ev) => drop.addEventListener(ev, () => { drop.style.outline = ''; }));
  drop.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    e.preventDefault();
    void importFile(file);
  });

  el<HTMLInputElement>('logoFile').onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) loadLogo(file);
  };

  document.querySelectorAll<HTMLInputElement>('input[name=refMode]').forEach((radio) => {
    radio.onchange = () => { toggleRefMode(); refresh(); };
  });
  const debouncedRefresh = debounce(refresh, 250);
  FIELDS.forEach((f) => {
    const node = field(f);
    node.addEventListener('input', debouncedRefresh);
    node.addEventListener('change', () => refresh());
  });

  toggleRefMode();
  refresh();
}

init();
