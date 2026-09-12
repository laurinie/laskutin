import { useMemo, useState } from 'react';
import type { Logo } from './lib/types.js';
import { configOf, csvOf, defaultForm, invoicesFor, migrateForm, type InvoiceForm } from './lib/form.js';
import { parseRecipients } from './lib/recipients.js';
import { usePersistentState } from './hooks/usePersistentState.js';
import { RecipientsSection } from './components/RecipientsSection.js';
import { ContentSection } from './components/ContentSection.js';
import { PaymentSection } from './components/PaymentSection.js';
import { ReferenceSection } from './components/ReferenceSection.js';
import { OutputSection } from './components/OutputSection.js';
import { EmailSection } from './components/EmailSection.js';
import { StorageSection } from './components/StorageSection.js';
import { persistEnabled, setPersistEnabled } from './lib/storage.js';

const STORE_KEY = 'luolaskut.v1';
const LEGACY_STORE_KEY = 'laskutin.v1';
const LOGO_KEY = 'luolaskut.logo';
const LEGACY_LOGO_KEY = 'laskutin.logo';
const MAX_STORED_LOGO = 1_500_000;

interface Status {
  message: string;
  isError: boolean;
}

export function App() {
  const [persist, setPersist] = useState(persistEnabled);
  const { value: form, setValue: setForm, storageFull } = usePersistentState<InvoiceForm>(
    STORE_KEY,
    defaultForm,
    { legacyKey: LEGACY_STORE_KEY, migrate: migrateForm, persist }
  );
  const { value: logo, setValue: setLogo } = usePersistentState<Logo | null>(LOGO_KEY, () => null, { legacyKey: LEGACY_LOGO_KEY, persist });
  const [status, setStatus] = useState<Status>({ message: '', isError: false });

  const setField = <K extends keyof InvoiceForm>(key: K, value: InvoiceForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const showStatus = (message: string, isError = false) => setStatus({ message, isError });

  function changePersist(enabled: boolean) {
    setPersistEnabled(enabled);
    setPersist(enabled);
  }

  function resetForm() {
    setForm(defaultForm());
    setLogo(null);
    showStatus('Lomake nollattu.');
  }

  const { recipients, columnInfo } = useMemo(() => parseRecipients(form.recipients), [form.recipients]);
  const invoices = useMemo(() => invoicesFor(recipients, form), [recipients, form]);
  const config = useMemo(() => configOf(form), [form]);
  const csv = useMemo(() => csvOf(invoices, form.dueDate), [invoices, form.dueDate]);

  function loadLogo(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const image = new Image();
      image.onload = () => {
        if (dataUrl.length > MAX_STORED_LOGO) showStatus('Kuva on suuri eikä tallennu selaimeen seuraavaa kertaa varten.');
        setLogo({ dataUrl, format: /png/i.test(file.type) ? 'PNG' : 'JPEG', ratio: image.naturalWidth / image.naturalHeight });
      };
      image.onerror = () => showStatus('Kuvaa ei voitu lukea.', true);
      image.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  return (
    <>
      <header className="topbar">
        <h1>🕯️ Luolaskut</h1>
        <p className="sub">Kaiva laskut esiin vastaanottajalistasta. Kaikki tapahtuu selaimessa, syvällä oman koneesi uumenissa.</p>
      </header>

      <main>
        <RecipientsSection
          text={form.recipients}
          onText={(text) => setField('recipients', text)}
          invoices={invoices}
          columnInfo={columnInfo}
          onStatus={showStatus}
        />
        <ContentSection form={form} onChange={setField} logo={logo} onLogo={loadLogo} />
        <PaymentSection form={form} onChange={setField} invoices={invoices} />
        <ReferenceSection form={form} onChange={setField} invoices={invoices} />
        <OutputSection
          invoices={invoices}
          config={config}
          logo={logo}
          csv={csv}
          status={status}
          onStatus={showStatus}
        />
        <EmailSection invoices={invoices} config={config} logo={logo} dueDate={form.dueDate} persist={persist} />
        <StorageSection persist={persist} onPersist={changePersist} onReset={resetForm} />
      </main>

      <footer className="foot">
        <p>
          Vastaanottajien tiedot pysyvät koneellasi: lomakkeen arvot tallentuvat vain selaimen localStorageen, eikä
          laskujen luonti ota yhteyttä verkkoon. Tiedot lähtevät ulos vain jos käytät sähköpostilähetystä, jolloin
          lasku ja vastaanottajan osoite välitetään Brevolle.
          {storageFull && ' Huom: selaimen tallennustila on täynnä, joten asetukset eivät säily.'}
        </p>
      </footer>
    </>
  );
}
