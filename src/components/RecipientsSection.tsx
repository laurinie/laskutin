import { useRef, type DragEvent } from 'react';
import type { Invoice } from '../lib/types.js';
import { readXlsx, rowsToText, templateXlsx, TEMPLATE_CSV, XLSX_MIME } from '../lib/xlsx.js';
import { download } from '../lib/download.js';
import { errorMessage } from '../lib/format.js';
import { DEMO_MEMBERS } from '../lib/form.js';
import { Card } from './Card.js';
import { RecipientTable } from './RecipientTable.js';

interface RecipientsSectionProps {
  text: string;
  onText: (text: string) => void;
  invoices: Invoice[];
  columnInfo: string;
  onStatus: (message: string, isError?: boolean) => void;
}

const isExcel = (file: File): boolean => /\.xlsx$/i.test(file.name) || /spreadsheetml/.test(file.type);

export function RecipientsSection({ text, onText, invoices, columnInfo, onStatus }: RecipientsSectionProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const dropZone = useRef<HTMLTextAreaElement>(null);

  async function importFile(file: File) {
    try {
      if (isExcel(file)) {
        const rows = await readXlsx(file);
        if (!rows.length) {
          onStatus('Excel-tiedostosta ei löytynyt rivejä.', true);
          return;
        }
        onText(rowsToText(rows));
        onStatus(`Tuotu Excelistä: ${rows.length} riviä.`);
      } else if (/\.xls$/i.test(file.name)) {
        onStatus('Vanhaa .xls-muotoa ei tueta. Tallenna Excelissä muodossa .xlsx tai CSV.', true);
      } else {
        onText(await file.text());
        onStatus('Tuotu tiedostosta.');
      }
    } catch (e) {
      onStatus('Tiedoston luku epäonnistui: ' + errorMessage(e), true);
    }
  }

  function onDrop(event: DragEvent<HTMLTextAreaElement>) {
    const file = event.dataTransfer.files[0];
    if (!file) return;
    event.preventDefault();
    setDropHighlight(false);
    void importFile(file);
  }

  function setDropHighlight(on: boolean) {
    if (dropZone.current) dropZone.current.style.outline = on ? '2px dashed var(--accent)' : '';
  }

  async function downloadExcelTemplate() {
    try {
      download(await templateXlsx(), 'vastaanottajat-pohja.xlsx');
      onStatus('Excel-pohja ladattu. Täytä nimet ja sähköpostit, tuo sitten takaisin.');
    } catch (e) {
      onStatus('Excel-pohjan luonti epäonnistui: ' + errorMessage(e), true);
    }
  }

  return (
    <Card title="1. Vastaanottajat">
      <p className="hint">
        Liitä lista vastaanottajista, tuo <b>CSV- tai Excel-tiedosto</b> (.xlsx) tai raahaa tiedosto kenttään.
        Sarakkeet: <code>Nimi;sähköposti</code>, erottimena <code>;</code>, <code>,</code> tai tab. Ylimääräiset
        sarakkeet ohitetaan – laskun summa tulee aina laskuriveiltä.
        Otsikkorivi tunnistetaan automaattisesti.
      </p>

      <textarea
        ref={dropZone}
        rows={8}
        spellCheck={false}
        value={text}
        onChange={(e) => onText(e.target.value)}
        onDragOver={(e) => { e.preventDefault(); setDropHighlight(true); }}
        onDragLeave={() => setDropHighlight(false)}
        onDrop={onDrop}
      />

      <div className="row">
        <input
          ref={fileInput}
          type="file"
          hidden
          accept={`.csv,.txt,.xlsx,text/csv,text/plain,${XLSX_MIME}`}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importFile(file);
            e.target.value = '';
          }}
        />
        <button type="button" className="secondary" onClick={() => fileInput.current?.click()}>
          📂 Tuo CSV tai Excel
        </button>
        <button type="button" className="secondary" onClick={() => void downloadExcelTemplate()}>
          ⬇️ Excel-pohja
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            download(new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' }), 'vastaanottajat-pohja.csv');
            onStatus('CSV-pohja ladattu.');
          }}
        >
          ⬇️ CSV-pohja
        </button>
        <button type="button" className="ghost" onClick={() => onText(DEMO_MEMBERS)}>
          Täytä esimerkkidata
        </button>
        <span className="badge">{invoices.length} vastaanottajaa</span>
      </div>

      <RecipientTable invoices={invoices} columnInfo={columnInfo} />
    </Card>
  );
}
