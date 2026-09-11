import { useState } from 'react';
import type { Invoice, InvoiceConfig, Logo } from '../lib/types.js';
import { combinedPdfBlob, singleInvoiceBlob, zipOfInvoices } from '../lib/generate.js';
import { download, dateStamp } from '../lib/download.js';
import { errorMessage } from '../lib/format.js';
import { Card } from './Card.js';

interface OutputSectionProps {
  invoices: Invoice[];
  config: InvoiceConfig;
  logo: Logo | null;
  csv: string;
  status: { message: string; isError: boolean };
  onStatus: (message: string, isError?: boolean) => void;
}

export function OutputSection({ invoices, config, logo, csv, status, onStatus }: OutputSectionProps) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [busy, setBusy] = useState(false);

  function run(action: (invoices: Invoice[]) => Promise<void>) {
    if (!invoices.length) {
      onStatus('Lisää ensin jäsenlista.', true);
      return;
    }
    setBusy(true);
    action(invoices)
      .catch((e: unknown) => onStatus('Laskujen luonti epäonnistui: ' + errorMessage(e), true))
      .finally(() => setBusy(false));
  }

  const preview = () => run(async ([first]) => {
    const blob = await singleInvoiceBlob(first!, config, logo);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(blob);
    });
    onStatus(`Esikatselu: ${first!.member.name}. Muut laskut noudattavat samaa ulkoasua.`);
  });

  const onePdf = () => run(async (all) => {
    download(await combinedPdfBlob(all, config, logo), `laskut_${dateStamp()}.pdf`);
    onStatus(`Valmis: ${all.length} laskua yhdessä PDF-tiedostossa.`);
  });

  const zip = () => run(async (all) => {
    onStatus('Luodaan laskuja…');
    const blob = await zipOfInvoices(all, config, logo, csv, (done, total) =>
      onStatus(`Luodaan laskuja… ${done}/${total}`));
    download(blob, `laskut_${dateStamp()}.zip`);
    onStatus(`Valmis: ${all.length} erillistä PDF:ää + laskut.csv ZIP-paketissa.`);
  });

  const exportCsv = () => {
    if (!invoices.length) {
      onStatus('Lisää ensin jäsenlista.', true);
      return;
    }
    download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'laskut.csv');
    onStatus('CSV viety – kätevä esim. sähköpostien massalähetykseen.');
  };

  return (
    <Card title="5. Luo laskut">
      <div className="row">
        <button type="button" onClick={preview} disabled={busy}>👁 Esikatsele ensimmäinen</button>
        <button type="button" onClick={onePdf} disabled={busy}>📄 Yksi PDF (kaikki sivuina)</button>
        <button type="button" onClick={zip} disabled={busy}>🗂 ZIP – oma PDF per jäsen</button>
        <button type="button" className="secondary" onClick={exportCsv}>⬇️ Vie CSV</button>
      </div>

      <p className="status" style={status.isError ? { color: 'var(--err)' } : undefined}>{status.message}</p>
      {previewUrl && <iframe title="Laskun esikatselu" src={previewUrl} />}
    </Card>
  );
}
