import type { ChangeEvent } from 'react';
import type { InvoiceForm } from '../lib/form.js';
import type { Logo } from '../lib/types.js';
import { Card } from './Card.js';
import { Field } from './Field.js';

interface ContentSectionProps {
  form: InvoiceForm;
  onChange: <K extends keyof InvoiceForm>(key: K, value: InvoiceForm[K]) => void;
  logo: Logo | null;
  onLogo: (file: File) => void;
}

const LOGO_POSITIONS = [
  { value: 'right', label: 'Oikea ylänurkka' },
  { value: 'left', label: 'Vasen ylänurkka (otsikon yllä)' },
  { value: 'banner', label: 'Leveä banneri ylhäällä' }
];

export function ContentSection({ form, onChange, logo, onLogo }: ContentSectionProps) {
  function pickLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onLogo(file);
  }

  return (
    <Card title="2. Laskun sisältö">
      <div className="grid">
        <Field full label="Otsikko" value={form.title} onChange={(v) => onChange('title', v)} />
        <Field full rows={5} label="Saatesanat" value={form.intro} onChange={(v) => onChange('intro', v)} />
        <Field
          full
          rows={3}
          label={<>Laskurivit – yksi rivi per kohta, muodossa <code>Kuvaus;summa</code></>}
          value={form.lines}
          onChange={(v) => onChange('lines', v)}
        />

        <label>
          Kuva / logo
          <input type="file" accept="image/png,image/jpeg" onChange={pickLogo} />
        </label>

        <Field
          label="Kuvan sijainti"
          value={form.logoPos}
          options={LOGO_POSITIONS}
          onChange={(v) => onChange('logoPos', v as InvoiceForm['logoPos'])}
        />
        <Field
          label="Kuvan leveys (mm)"
          type="number"
          min={10}
          max={170}
          value={form.logoW}
          onChange={(v) => onChange('logoW', v)}
        />

        <div className="logo-preview">
          {logo ? <img src={logo.dataUrl} alt="logon esikatselu" /> : <span>ei kuvaa</span>}
        </div>

        <Field
          full
          label="Alatunniste (esim. yhteystiedot, y-tunnus)"
          value={form.footer}
          onChange={(v) => onChange('footer', v)}
        />
      </div>
    </Card>
  );
}
