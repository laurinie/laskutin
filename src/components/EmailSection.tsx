import { useState } from 'react';
import type { Invoice, InvoiceConfig, Logo } from '../lib/types.js';
import {
  blobToBase64, brevoMessage, defaultEmailSettings, renderTemplate, sendViaBrevo, settingsProblem,
  type EmailSettings
} from '../lib/email.js';
import { singleInvoiceBlob } from '../lib/generate.js';
import { errorMessage, slug } from '../lib/format.js';
import { usePersistentState } from '../hooks/usePersistentState.js';
import { Card, Check } from './Card.js';
import { Field } from './Field.js';

interface EmailSectionProps {
  invoices: Invoice[];
  config: InvoiceConfig;
  logo: Logo | null;
  dueDate: string;
}

interface SendResult {
  email: string;
  name: string;
  error?: string;
}

const DELAY_MS = 300;
const FREE_PLAN_DAILY_LIMIT = 300;

export function EmailSection({ invoices, config, logo, dueDate }: EmailSectionProps) {
  const [open, setOpen] = useState(false);
  const { value: settings, setValue: setSettings } = usePersistentState<EmailSettings>(
    'laskutin.email',
    defaultEmailSettings
  );
  const [apiKey, setApiKey] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState<SendResult[]>([]);
  const [busy, setBusy] = useState(false);

  const setField = <K extends keyof EmailSettings>(key: K, value: EmailSettings[K]) =>
    setSettings((current) => ({ ...current, [key]: value }));

  const sendable = invoices.filter((invoice) => !invoice.recipient.badEmail);
  const problem = settingsProblem(settings, apiKey);
  const failures = results.filter((result) => result.error);

  async function sendOne(invoice: Invoice, to = invoice.recipient.email): Promise<void> {
    const pdf = await singleInvoiceBlob(invoice, config, logo);
    const message = brevoMessage(
      settings,
      { ...invoice, recipient: { ...invoice.recipient, email: to } },
      dueDate,
      await blobToBase64(pdf),
      `${invoice.invoiceNo}_${slug(invoice.recipient.name)}.pdf`
    );
    await sendViaBrevo(apiKey, message);
  }

  function run(task: () => Promise<void>): void {
    setBusy(true);
    setResults([]);
    task()
      .catch((e: unknown) => setProgress('Lähetys keskeytyi: ' + errorMessage(e)))
      .finally(() => setBusy(false));
  }

  const sendTest = () => run(async () => {
    const first = sendable[0] ?? invoices[0];
    if (!first) {
      setProgress('Lisää ensin vastaanottajat.');
      return;
    }
    setProgress(`Lähetetään testi osoitteeseen ${settings.senderEmail}…`);
    await sendOne(first, settings.senderEmail);
    setProgress(`Testilasku lähetetty osoitteeseen ${settings.senderEmail}.`);
  });

  const sendAll = () => run(async () => {
    setConfirming(false);
    const sent: SendResult[] = [];

    for (const [index, invoice] of sendable.entries()) {
      setProgress(`Lähetetään ${index + 1}/${sendable.length}: ${invoice.recipient.email}`);
      try {
        await sendOne(invoice);
        sent.push({ email: invoice.recipient.email, name: invoice.recipient.name });
      } catch (e) {
        sent.push({ email: invoice.recipient.email, name: invoice.recipient.name, error: errorMessage(e) });
      }
      setResults([...sent]);
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }

    const failed = sent.filter((result) => result.error).length;
    setProgress(failed
      ? `Valmis: ${sent.length - failed} lähetetty, ${failed} epäonnistui.`
      : `Valmis: ${sent.length} laskua lähetetty.`);
  });

  if (!open) {
    return (
      <section className="card">
        <button type="button" className="ghost" onClick={() => setOpen(true)}>
          ✉️ Näytä sähköpostilähetys (Brevo)
        </button>
      </section>
    );
  }

  return (
    <Card title="6. Sähköpostilähetys (Brevo)">
      <p className="hint">
        Lähettää jokaiselle vastaanottajalle oman laskun PDF-liitteenä suoraan selaimesta Brevon rajapinnan
        kautta. Lähettäjän osoitteen pitää olla vahvistettu Brevossa, tai viestit hylätään.
      </p>
      <Check tone="warn">
        Brevon API-avain antaa täydet oikeudet tiliisi. Avainta ei tallenneta, vaan se on voimassa vain
        tämän istunnon ajan. Luo avain lyhyellä vanhenemisajalla ja poista se laskutuksen jälkeen.
      </Check>

      <div className="grid">
        <label className="full">
          Brevon API-avain
          <input
            type="password"
            value={apiKey}
            autoComplete="off"
            placeholder="xkeysib-…"
            onChange={(e) => setApiKey(e.target.value)}
          />
        </label>
        <Field label="Lähettäjän nimi" value={settings.senderName} onChange={(v) => setField('senderName', v)} />
        <Field label="Lähettäjän osoite" value={settings.senderEmail} onChange={(v) => setField('senderEmail', v)} />
        <Field full label="Viestin aihe" value={settings.subject} onChange={(v) => setField('subject', v)} />
        <Field full rows={9} label="Viesti" value={settings.body} onChange={(v) => setField('body', v)} />
      </div>

      <p className="hint">
        Paikkamerkit: <code>{'{{nimi}}'}</code> <code>{'{{laskunumero}}'}</code> <code>{'{{viite}}'}</code>{' '}
        <code>{'{{summa}}'}</code> <code>{'{{erapaiva}}'}</code>
      </p>

      {sendable[0] && (
        <details>
          <summary className="hint">Esikatsele ensimmäinen viesti</summary>
          <pre className="preview-mail">
            {`Aihe: ${renderTemplate(settings.subject, sendable[0], dueDate)}\n\n${renderTemplate(settings.body, sendable[0], dueDate)}`}
          </pre>
        </details>
      )}

      <div className="row">
        <button type="button" className="secondary" onClick={sendTest} disabled={busy || Boolean(problem)}>
          📧 Lähetä testi itselleni
        </button>
        {confirming ? (
          <button type="button" onClick={sendAll} disabled={busy}>
            ✅ Vahvista: lähetä {sendable.length} laskua
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={busy || Boolean(problem) || !sendable.length}
          >
            ✉️ Lähetä kaikille ({sendable.length})
          </button>
        )}
        {confirming && (
          <button type="button" className="ghost" onClick={() => setConfirming(false)}>Peruuta</button>
        )}
        <button type="button" className="ghost" onClick={() => setOpen(false)}>Piilota osio</button>
      </div>

      {problem && <Check tone="warn">{problem}</Check>}
      {invoices.length !== sendable.length && (
        <Check tone="warn">
          {invoices.length - sendable.length} vastaanottajalta puuttuu kelvollinen sähköposti – ne ohitetaan.
        </Check>
      )}
      {sendable.length > FREE_PLAN_DAILY_LIMIT && (
        <Check tone="warn">
          Brevon ilmaistason raja on {FREE_PLAN_DAILY_LIMIT} viestiä vuorokaudessa.
        </Check>
      )}

      {progress && <p className="status">{progress}</p>}

      {failures.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Vastaanottaja</th><th>Virhe</th></tr></thead>
            <tbody>
              {failures.map((failure) => (
                <tr key={failure.email}>
                  <td>{failure.name} ({failure.email})</td>
                  <td className="bad">{failure.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
