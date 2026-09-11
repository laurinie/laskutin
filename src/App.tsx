import { useMemo, useState } from 'react';
import type { Logo } from './lib/types.js';
import { configOf, csvOf, defaultForm, invoicesFor, type InvoiceForm } from './lib/form.js';
import { parseMembers } from './lib/members.js';
import { usePersistentState } from './hooks/usePersistentState.js';
import { MembersSection } from './components/MembersSection.js';
import { ContentSection } from './components/ContentSection.js';
import { PaymentSection } from './components/PaymentSection.js';
import { ReferenceSection } from './components/ReferenceSection.js';
import { OutputSection } from './components/OutputSection.js';

const STORE_KEY = 'laskutin.v1';
const LEGACY_STORE_KEY = 'laskuttaja.v1';
const MAX_STORED_LOGO = 1_500_000;

interface Status {
  message: string;
  isError: boolean;
}

export function App() {
  const { value: form, setValue: setForm, storageFull } = usePersistentState<InvoiceForm>(
    STORE_KEY,
    defaultForm,
    LEGACY_STORE_KEY
  );
  const { value: logo, setValue: setLogo } = usePersistentState<Logo | null>('laskutin.logo', () => null);
  const [status, setStatus] = useState<Status>({ message: '', isError: false });

  const setField = <K extends keyof InvoiceForm>(key: K, value: InvoiceForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const showStatus = (message: string, isError = false) => setStatus({ message, isError });

  const { members, columnInfo } = useMemo(() => parseMembers(form.members), [form.members]);
  const invoices = useMemo(() => invoicesFor(members, form), [members, form]);
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
        <h1>🧾 Laskutin</h1>
        <p className="sub">Generoi PDF-laskut vastaanottajalistasta. Kaikki tapahtuu selaimessa – tietoja ei lähetetä mihinkään.</p>
      </header>

      <main>
        <MembersSection
          text={form.members}
          onText={(text) => setField('members', text)}
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
      </main>

      <footer className="foot">
        <p>
          Tietosi pysyvät koneellasi: lomakkeen arvot tallentuvat vain selaimen localStorageen, eikä vastaanottajalistaa
          lähetetä verkkoon.
          {storageFull && ' Huom: selaimen tallennustila on täynnä, joten asetukset eivät säily.'}
        </p>
      </footer>
    </>
  );
}
