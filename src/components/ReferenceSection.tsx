import type { Invoice } from '../lib/types.js';
import type { InvoiceForm } from '../lib/form.js';
import { referenceOptionsOf } from '../lib/form.js';
import { refIsValid, refPretty, referenceFor } from '../lib/reference.js';
import { Card, Check } from './Card.js';
import { Field } from './Field.js';

interface ReferenceSectionProps {
  form: InvoiceForm;
  onChange: <K extends keyof InvoiceForm>(key: K, value: InvoiceForm[K]) => void;
  invoices: Invoice[];
}

function SharedRefCheck({ form }: { form: InvoiceForm }) {
  const digits = form.sharedRef.replace(/\D/g, '');
  if (!digits) return <Check tone="warn">Anna yhteinen viite.</Check>;
  if (refIsValid(digits)) return <Check tone="ok">✓ Viite {refPretty(digits)} on kelvollinen.</Check>;
  return <Check tone="warn">Tarkiste lisätty automaattisesti → {refPretty(referenceFor(0, referenceOptionsOf(form)))}</Check>;
}

function RunningRefCheck({ form, invoices }: { form: InvoiceForm; invoices: Invoice[] }) {
  const first = referenceFor(0, referenceOptionsOf(form));
  if (!first) {
    return <Check tone="err">Tunnusosa + juokseva numero on liian lyhyt (vähintään 3 numeroa yhteensä).</Check>;
  }
  const last = invoices.length ? referenceFor(invoices.length - 1, referenceOptionsOf(form)) : first;
  return <Check tone="ok">Viitteet välillä {refPretty(first)} – {refPretty(last)}</Check>;
}

export function ReferenceSection({ form, onChange, invoices }: ReferenceSectionProps) {
  const shared = form.refMode === 'shared';

  return (
    <Card title="4. Viitenumerot">
      <div className="radios">
        <label className="radio">
          <input type="radio" checked={!shared} onChange={() => onChange('refMode', 'per')} />
          <span><b>Oma viite jokaiselle</b> – generoidaan suomalainen viitenumero tarkisteella</span>
        </label>
        <label className="radio">
          <input type="radio" checked={shared} onChange={() => onChange('refMode', 'shared')} />
          <span><b>Yhteinen viite</b> – sama viite kaikissa laskuissa</span>
        </label>
      </div>

      <div className="grid">
        <Field
          hidden={shared}
          label="Viitteen tunnusosa (etuliite)"
          value={form.refPrefix}
          onChange={(v) => onChange('refPrefix', v)}
        />
        <Field
          hidden={shared}
          label="Juokseva numero alkaa"
          type="number"
          min={1}
          value={form.refStart}
          onChange={(v) => onChange('refStart', v)}
        />
        <Field
          hidden={!shared}
          label="Yhteinen viite"
          value={form.sharedRef}
          onChange={(v) => onChange('sharedRef', v)}
        />
      </div>

      <p className="hint">
        Viite muodostuu muodossa <code>etuliite + juokseva numero + tarkistenumero</code> (7-3-1-menetelmä,
        Finanssiala ry:n ohje). Yhteiselle viitteelle lasketaan tarkiste automaattisesti, jos annat vain rungon.
      </p>

      {shared ? <SharedRefCheck form={form} /> : <RunningRefCheck form={form} invoices={invoices} />}
    </Card>
  );
}
