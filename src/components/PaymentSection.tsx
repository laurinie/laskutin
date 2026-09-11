import type { InvoiceForm } from '../lib/form.js';
import { ibanPretty, ibanValid } from '../lib/reference.js';
import { Card, Check } from './Card.js';
import { Field } from './Field.js';

interface PaymentSectionProps {
  form: InvoiceForm;
  onChange: <K extends keyof InvoiceForm>(key: K, value: InvoiceForm[K]) => void;
}

function IbanCheck({ iban }: { iban: string }) {
  if (!iban.trim()) return <Check tone="warn">IBAN puuttuu.</Check>;
  if (ibanValid(iban)) return <Check tone="ok">✓ IBAN kelvollinen: {ibanPretty(iban)}</Check>;
  return <Check tone="err">✗ IBAN ei läpäise tarkistusta – tarkista numero.</Check>;
}

export function PaymentSection({ form, onChange }: PaymentSectionProps) {
  return (
    <Card title="3. Maksutiedot">
      <div className="grid">
        <Field label="Saaja" value={form.payee} onChange={(v) => onChange('payee', v)} />
        <Field label="IBAN" value={form.iban} onChange={(v) => onChange('iban', v)} />
        <Field label="BIC (valinnainen)" value={form.bic} onChange={(v) => onChange('bic', v)} />
        <Field label="Laskun päivä" type="date" value={form.invoiceDate} onChange={(v) => onChange('invoiceDate', v)} />
        <Field label="Eräpäivä" type="date" value={form.dueDate} onChange={(v) => onChange('dueDate', v)} />
        <Field
          label="Laskunumeron alkuarvo"
          type="number"
          min={1}
          value={form.invoiceNoStart}
          onChange={(v) => onChange('invoiceNoStart', v)}
        />
        <Field
          full
          label="Lisätiedot maksuosioon (valinnainen)"
          value={form.payNote}
          onChange={(v) => onChange('payNote', v)}
        />
      </div>
      <IbanCheck iban={form.iban} />
    </Card>
  );
}
