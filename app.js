/* Laskuttaja – PDF-laskujen generointi selaimessa.
   Riippuvuudet: jsPDF (PDF), JSZip (monta tiedostoa yhdessä paketissa). */
'use strict';

const $ = (id) => document.getElementById(id);
const STORE_KEY = 'laskuttaja.v1';
const A4 = { w: 210, h: 297 };
const M = 18;                       // marginaali mm
const CONTENT_W = A4.w - 2 * M;

let members = [];                   // {name, email, amount|null, badEmail}
let logo = null;                    // {dataUrl, format, ratio}

/* ---------- apufunktiot ---------- */

const money = (n) => {
  const [i, d] = Math.abs(Number(n) || 0).toFixed(2).split('.');
  const sign = Number(n) < 0 ? '-' : '';
  return sign + i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + d + ' €';
};

const parseAmount = (s) => {
  if (s == null) return null;
  const clean = String(s).replace(/[\s €]|eur/gi, '').replace(',', '.');
  if (!clean) return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
};

const fmtDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${Number(d)}.${Number(m)}.${y}`;
};

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

/** Suomalainen viitenumero: runko + 7-3-1-tarkiste. */
function refWithCheck(body) {
  const digits = String(body).replace(/\D/g, '').replace(/^0+/, '');
  if (digits.length < 3 || digits.length > 19) return null;
  const w = [7, 3, 1];
  let sum = 0;
  for (let i = digits.length - 1, k = 0; i >= 0; i--, k++) sum += Number(digits[i]) * w[k % 3];
  return digits + String((10 - (sum % 10)) % 10);
}

/** Onko valmis viite (tarkiste mukana) kelvollinen? */
const refIsValid = (full) => {
  const d = String(full).replace(/\D/g, '');
  return d.length >= 4 && refWithCheck(d.slice(0, -1)) === d;
};

/** Näyttömuoto: 5 numeron ryhmät oikealta. */
const refPretty = (r) => String(r).replace(/\D/g, '').replace(/\B(?=(\d{5})+(?!\d))/g, ' ');

const ibanPretty = (s) => String(s).toUpperCase().replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();

function ibanValid(raw) {
  const s = String(raw).toUpperCase().replace(/[\s-]/g, '');
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  const moved = s.slice(4) + s.slice(0, 4);
  const num = moved.replace(/[A-Z]/g, (c) => c.charCodeAt(0) - 55);
  let rem = 0;
  for (const ch of num) rem = (rem * 10 + Number(ch)) % 97;
  return rem === 1;
}

const slug = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'lasku';

/* ---------- jäsenlistan jäsentäminen ---------- */

function splitCols(line) {
  const sep = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
  // kevyt CSV-jäsennys: tukee lainausmerkkejä
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (c === sep && !q) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseMembers(text) {
  const rows = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  lines.forEach((line, idx) => {
    const cols = splitCols(line);
    // otsikkorivi: ensimmäinen rivi ilman sähköpostia
    if (idx === 0 && !cols.some(isEmail)) return;
    const email = cols.find(isEmail) || cols.find((c) => c.includes('@')) || '';
    const rest = cols.filter((c) => c !== email);
    // nimi = ensimmäinen sarake joka ei ole summa eikä sposti
    let name = rest.find((c) => c && parseAmount(c) === null) || '';
    if (!name && rest.length) name = rest[0];
    const amountCol = rest.find((c) => c !== name && parseAmount(c) !== null);
    rows.push({
      name: name || email.split('@')[0],
      email,
      amount: parseAmount(amountCol),
      badEmail: !isEmail(email)
    });
  });
  return rows;
}

function lineItems() {
  return $('lines').value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const cols = splitCols(l);
    const amount = parseAmount(cols[cols.length - 1]);
    const desc = (amount === null ? cols : cols.slice(0, -1)).join(' ').trim();
    return { desc: desc || 'Laskurivi', amount: amount ?? 0 };
  });
}

/** Laskurivit yhdelle jäsenelle; jäsenkohtainen summa korvaa oletusrivit. */
function itemsFor(member) {
  const base = lineItems();
  if (member.amount === null) return base.length ? base : [{ desc: $('title').value || 'Laskurivi', amount: 0 }];
  return [{ desc: base[0]?.desc || $('title').value || 'Laskurivi', amount: member.amount }];
}

function referenceFor(index) {
  if (document.querySelector('input[name=refMode]:checked').value === 'shared') {
    const raw = $('sharedRef').value.replace(/\D/g, '');
    if (!raw) return '';
    return refIsValid(raw) ? raw : (refWithCheck(raw) || raw);
  }
  const prefix = $('refPrefix').value.replace(/\D/g, '');
  const n = Number($('refStart').value || 1) + index;
  return refWithCheck(prefix + String(n).padStart(4, '0')) || '';
}

/* ---------- PDF ---------- */

function invoiceData(member, index) {
  const items = itemsFor(member);
  return {
    member,
    items,
    total: items.reduce((s, it) => s + it.amount, 0),
    invoiceNo: Number($('invoiceNoStart').value || 1) + index,
    reference: referenceFor(index)
  };
}

function drawInvoice(doc, d) {
  const cfg = {
    title: $('title').value, intro: $('intro').value, footer: $('footer').value,
    payee: $('payee').value, iban: ibanPretty($('iban').value), bic: $('bic').value.trim(),
    invoiceDate: fmtDate($('invoiceDate').value), dueDate: fmtDate($('dueDate').value),
    payNote: $('payNote').value, logoPos: $('logoPos').value, logoW: Number($('logoW').value) || 45
  };
  const gray = () => doc.setTextColor(110, 118, 130);
  const ink = () => doc.setTextColor(25, 28, 34);
  const BOTTOM = A4.h - M - 8;                       // alin sallittu sisällön reuna
  const firstPage = doc.getCurrentPageInfo().pageNumber;
  let y = M;
  /* Vaihtaa sivua, jos seuraava elementti ei mahdu. */
  const ensure = (need) => { if (y + need > BOTTOM) { doc.addPage(); y = M; } };

  /* kuva */
  if (logo) {
    const w = cfg.logoPos === 'banner' ? CONTENT_W : Math.min(cfg.logoW, CONTENT_W);
    const h = w / logo.ratio;
    const x = cfg.logoPos === 'right' ? A4.w - M - w : M;
    doc.addImage(logo.dataUrl, logo.format, x, y, w, h);
    if (cfg.logoPos === 'right') y = Math.max(y, M);       // otsikko samalle riville
    else y += h + 6;
    if (cfg.logoPos === 'right') var logoBottom = M + h;
  }

  /* otsikko + metatiedot */
  doc.setFont('helvetica', 'bold').setFontSize(19);
  ink();
  const titleW = cfg.logoPos === 'right' && logo ? CONTENT_W - cfg.logoW - 6 : CONTENT_W;
  const titleLines = doc.splitTextToSize(cfg.title || 'Lasku', titleW);
  doc.text(titleLines, M, y + 6);
  y += 6 + titleLines.length * 8;
  if (typeof logoBottom === 'number') y = Math.max(y, logoBottom + 8);

  doc.setFont('helvetica', 'normal').setFontSize(9.5);
  const meta = [
    ['Laskunumero', String(d.invoiceNo)],
    ['Laskun päivä', cfg.invoiceDate],
    ['Eräpäivä', cfg.dueDate],
    ['Viite', refPretty(d.reference)]
  ].filter((r) => r[1]);
  let my = y;
  meta.forEach(([k, v]) => {
    gray(); doc.text(k, A4.w - M - 52, my);
    ink(); doc.setFont('helvetica', 'bold'); doc.text(v, A4.w - M, my, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    my += 5.2;
  });

  /* vastaanottaja */
  gray(); doc.setFontSize(9); doc.text('VASTAANOTTAJA', M, y);
  ink(); doc.setFontSize(11.5).setFont('helvetica', 'bold');
  doc.text(d.member.name || '', M, y + 6);
  doc.setFont('helvetica', 'normal').setFontSize(10);
  gray(); doc.text(d.member.email || '', M, y + 11.5);
  y = Math.max(my, y + 16) + 8;

  /* saatesanat */
  if (cfg.intro.trim()) {
    ink(); doc.setFontSize(10.5);
    const paras = cfg.intro.replace(/\r/g, '').split('\n');
    paras.forEach((p) => {
      if (!p.trim()) { y += 4; return; }
      const lines = doc.splitTextToSize(p, CONTENT_W);
      ensure(lines.length * 5.2);
      doc.text(lines, M, y);
      y += lines.length * 5.2;
    });
    y += 8;
  }

  /* laskurivit */
  doc.setDrawColor(215, 220, 228);
  gray(); doc.setFontSize(9);
  doc.text('KUVAUS', M, y);
  doc.text('SUMMA', A4.w - M, y, { align: 'right' });
  y += 2.5;
  doc.line(M, y, A4.w - M, y);
  y += 6;
  ink(); doc.setFontSize(10.5);
  d.items.forEach((it) => {
    const lines = doc.splitTextToSize(it.desc, CONTENT_W - 38);
    ensure(lines.length * 5.2 + 2.5);
    doc.text(lines, M, y);
    doc.text(money(it.amount), A4.w - M, y, { align: 'right' });
    y += Math.max(lines.length * 5.2, 5.2) + 2.5;
  });
  ensure(14);
  doc.line(M, y, A4.w - M, y);
  y += 7;
  doc.setFont('helvetica', 'bold').setFontSize(12);
  doc.text('Yhteensä', M, y);
  doc.text(money(d.total), A4.w - M, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  y += 12;

  /* maksutiedot-laatikko */
  const rows = [
    ['Saaja', cfg.payee],
    ['IBAN', cfg.iban],
    cfg.bic ? ['BIC', cfg.bic] : null,
    ['Viitenumero', refPretty(d.reference)],
    ['Eräpäivä', cfg.dueDate],
    ['Maksettava', money(d.total)]
  ].filter(Boolean);
  const boxH = 14 + Math.ceil(rows.length / 2) * 11 + (cfg.payNote.trim() ? 7 : 0);
  if (y + boxH > BOTTOM) { doc.addPage(); y = M; }
  const boxY = Math.max(y, BOTTOM - boxH);           // kiinni sivun alareunassa
  doc.setFillColor(246, 248, 251);
  doc.roundedRect(M, boxY, CONTENT_W, boxH, 3, 3, 'F');
  ink(); doc.setFont('helvetica', 'bold').setFontSize(10);
  doc.text('MAKSUTIEDOT', M + 6, boxY + 8);
  doc.setFont('helvetica', 'normal');
  rows.forEach((r, i) => {
    const col = i % 2;
    const rowI = Math.floor(i / 2);
    const x = M + 6 + col * (CONTENT_W / 2 - 3);
    const ry = boxY + 18 + rowI * 11;
    gray(); doc.setFontSize(8.5); doc.text(r[0].toUpperCase(), x, ry);
    ink(); doc.setFontSize(11);
    const highlight = r[0] === 'Viitenumero' || r[0] === 'Maksettava';
    doc.setFont('helvetica', highlight ? 'bold' : 'normal');
    doc.text(String(r[1]), x, ry + 5.5);
    doc.setFont('helvetica', 'normal');
  });
  if (cfg.payNote.trim()) {
    gray(); doc.setFontSize(8.5);
    doc.text(cfg.payNote, M + 6, boxY + boxH - 3.5);
  }

  /* alatunniste */
  const lastPage = doc.getCurrentPageInfo().pageNumber;
  for (let p = firstPage; p <= lastPage; p++) {
    doc.setPage(p);
    gray(); doc.setFontSize(8.5);
    if (cfg.footer.trim()) {
      doc.text(doc.splitTextToSize(cfg.footer, CONTENT_W), A4.w / 2, A4.h - 12, { align: 'center' });
    }
    if (lastPage > firstPage) {
      doc.text(`${p - firstPage + 1} / ${lastPage - firstPage + 1}`, A4.w - M, A4.h - 12, { align: 'right' });
    }
  }
  doc.setPage(lastPage);
}

function newDoc() {
  const { jsPDF } = window.jspdf;
  return new jsPDF({ unit: 'mm', format: 'a4', compress: true });
}

/* ---------- toiminnot ---------- */

function refresh() {
  members = parseMembers($('members').value);
  $('memberCount').textContent = `${members.length} jäsentä`;
  renderTable();
  validate();
  save();
}

function renderTable() {
  const wrap = $('memberTableWrap');
  if (!members.length) { wrap.innerHTML = ''; return; }
  const rows = members.map((m, i) => {
    const d = invoiceData(m, i);
    return `<tr>
      <td class="num">${d.invoiceNo}</td>
      <td>${esc(m.name)}</td>
      <td class="${m.badEmail ? 'bad' : ''}">${esc(m.email) || '– puuttuu –'}</td>
      <td>${refPretty(d.reference) || '–'}</td>
      <td class="num">${money(d.total)}</td>
    </tr>`;
  }).join('');
  wrap.innerHTML = `<table><thead><tr><th>Laskunro</th><th>Nimi</th><th>Sähköposti</th><th>Viite</th><th>Summa</th></tr></thead><tbody>${rows}</tbody></table>`;
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function validate() {
  const ib = $('ibanCheck');
  const iban = $('iban').value.trim();
  if (!iban) { ib.textContent = 'IBAN puuttuu.'; ib.className = 'check warn'; }
  else if (ibanValid(iban)) { ib.textContent = `✓ IBAN kelvollinen: ${ibanPretty(iban)}`; ib.className = 'check ok'; }
  else { ib.textContent = '✗ IBAN ei läpäise tarkistusta – tarkista numero.'; ib.className = 'check err'; }

  const rc = $('refCheck');
  const shared = document.querySelector('input[name=refMode]:checked').value === 'shared';
  if (shared) {
    const raw = $('sharedRef').value.replace(/\D/g, '');
    const fixed = referenceFor(0);
    if (!raw) { rc.textContent = 'Anna yhteinen viite.'; rc.className = 'check warn'; }
    else if (refIsValid(raw)) { rc.textContent = `✓ Viite ${refPretty(raw)} on kelvollinen.`; rc.className = 'check ok'; }
    else { rc.textContent = `Tarkiste lisätty automaattisesti → ${refPretty(fixed)}`; rc.className = 'check warn'; }
  } else {
    const first = referenceFor(0);
    const last = members.length ? referenceFor(members.length - 1) : first;
    rc.textContent = first
      ? `Viitteet välillä ${refPretty(first)} – ${refPretty(last)}`
      : 'Tunnusosa + juokseva numero on liian lyhyt (vähintään 3 numeroa yhteensä).';
    rc.className = first ? 'check ok' : 'check err';
  }
}

function guard() {
  if (!members.length) { status('Lisää ensin jäsenlista.', true); return false; }
  if (!window.jspdf) { status('jsPDF ei latautunut – tarkista verkkoyhteys.', true); return false; }
  return true;
}

const status = (msg, isErr) => {
  const el = $('status');
  el.textContent = msg;
  el.style.color = isErr ? 'var(--err)' : '';
};

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function preview() {
  if (!guard()) return;
  const doc = newDoc();
  drawInvoice(doc, invoiceData(members[0], 0));
  const url = URL.createObjectURL(doc.output('blob'));
  const frame = $('preview');
  frame.src = url;
  frame.classList.add('on');
  status(`Esikatselu: ${members[0].name}. Muut laskut noudattavat samaa ulkoasua.`);
}

function onePdf() {
  if (!guard()) return;
  const doc = newDoc();
  members.forEach((m, i) => {
    if (i) doc.addPage();
    drawInvoice(doc, invoiceData(m, i));
  });
  download(doc.output('blob'), `laskut_${new Date().toISOString().slice(0, 10)}.pdf`);
  status(`Valmis: ${members.length} laskua yhdessä PDF-tiedostossa.`);
}

async function zipPdfs() {
  if (!guard()) return;
  if (!window.JSZip) { status('JSZip ei latautunut – tarkista verkkoyhteys.', true); return; }
  const btn = $('zipBtn');
  btn.disabled = true;
  status('Luodaan laskuja…');
  try {
    const zip = new JSZip();
    for (let i = 0; i < members.length; i++) {
      const d = invoiceData(members[i], i);
      const doc = newDoc();
      drawInvoice(doc, d);
      zip.file(`${d.invoiceNo}_${slug(d.member.name)}.pdf`, doc.output('blob'));
      if (i % 20 === 0) { status(`Luodaan laskuja… ${i + 1}/${members.length}`); await new Promise((r) => setTimeout(r, 0)); }
    }
    zip.file('laskut.csv', csvText());
    const blob = await zip.generateAsync({ type: 'blob' });
    download(blob, `laskut_${new Date().toISOString().slice(0, 10)}.zip`);
    status(`Valmis: ${members.length} erillistä PDF:ää + laskut.csv ZIP-paketissa.`);
  } catch (e) {
    status('Virhe ZIP-paketin luonnissa: ' + e.message, true);
  } finally {
    btn.disabled = false;
  }
}

function csvText() {
  const head = 'nimi;sahkoposti;laskunumero;viite;summa;erapaiva';
  const rows = members.map((m, i) => {
    const d = invoiceData(m, i);
    const q = (v) => /[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
    return [m.name, m.email, d.invoiceNo, d.reference, d.total.toFixed(2).replace('.', ','), fmtDate($('dueDate').value)].map(q).join(';');
  });
  return '\uFEFF' + [head, ...rows].join('\r\n');
}

function exportCsv() {
  if (!members.length) { status('Lisää ensin jäsenlista.', true); return; }
  download(new Blob([csvText()], { type: 'text/csv;charset=utf-8' }), 'laskut.csv');
  status('CSV viety – kätevä esim. sähköpostien massalähetykseen.');
}

/* ---------- kuva ---------- */

function loadLogo(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      logo = {
        dataUrl: reader.result,
        format: /png/i.test(file.type) ? 'PNG' : 'JPEG',
        ratio: img.naturalWidth / img.naturalHeight
      };
      $('logoPreview').innerHTML = `<img src="${logo.dataUrl}" alt="logon esikatselu">`;
      save();
    };
    img.onerror = () => status('Kuvaa ei voitu lukea.', true);
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

/* ---------- tilan tallennus ---------- */

const FIELDS = ['members', 'title', 'intro', 'lines', 'footer', 'payee', 'iban', 'bic',
  'invoiceDate', 'dueDate', 'invoiceNoStart', 'payNote', 'refPrefix', 'refStart', 'sharedRef',
  'logoPos', 'logoW'];

function save() {
  const data = {};
  FIELDS.forEach((f) => { data[f] = $(f).value; });
  data.refMode = document.querySelector('input[name=refMode]:checked').value;
  if (logo && logo.dataUrl.length < 1_500_000) data.logo = logo;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch { /* kvootti täynnä */ }
}

function restore() {
  let data;
  try { data = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch { data = null; }
  if (!data) return false;
  FIELDS.forEach((f) => { if (typeof data[f] === 'string') $(f).value = data[f]; });
  if (data.refMode) {
    const r = document.querySelector(`input[name=refMode][value="${data.refMode}"]`);
    if (r) r.checked = true;
  }
  if (data.logo) {
    logo = data.logo;
    $('logoPreview').innerHTML = `<img src="${logo.dataUrl}" alt="logon esikatselu">`;
  }
  return true;
}

const DEMO = `Nimi;Sähköposti;Summa
Matti Meikäläinen;matti.meikalainen@example.com;40,00
Maija Virtanen;maija.virtanen@example.com;40,00
Ömer Äkkinen;omer.akkinen@example.com;20,00
Liisa Lahtinen;liisa@example.com;`;

/* ---------- alustus ---------- */

function init() {
  const today = new Date();
  const plus14 = new Date(today.getTime() + 14 * 864e5);
  $('invoiceDate').value = today.toISOString().slice(0, 10);
  $('dueDate').value = plus14.toISOString().slice(0, 10);

  const had = restore();
  if (!had) $('members').value = DEMO;

  $('parseBtn').onclick = refresh;
  $('demoBtn').onclick = () => { $('members').value = DEMO; refresh(); };
  $('previewBtn').onclick = preview;
  $('onePdfBtn').onclick = onePdf;
  $('zipBtn').onclick = zipPdfs;
  $('csvBtn').onclick = exportCsv;

  $('csvFile').onchange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    f.text().then((t) => { $('members').value = t; refresh(); });
  };
  $('logoFile').onchange = (e) => { if (e.target.files[0]) loadLogo(e.target.files[0]); };

  document.querySelectorAll('input[name=refMode]').forEach((r) => {
    r.onchange = () => { toggleRefMode(); refresh(); };
  });
  FIELDS.forEach((f) => {
    const el = $(f);
    el.addEventListener('input', debounce(refresh, 250));
    el.addEventListener('change', refresh);
  });

  toggleRefMode();
  refresh();
}

function toggleRefMode() {
  const shared = document.querySelector('input[name=refMode]:checked').value === 'shared';
  $('sharedWrap').classList.toggle('hidden', !shared);
  $('prefixWrap').classList.toggle('hidden', shared);
  $('counterWrap').classList.toggle('hidden', shared);
}

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

init();
