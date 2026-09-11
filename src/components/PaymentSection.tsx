import type { Invoice } from '../lib/types.js';
import type { InvoiceForm } from '../lib/form.js';
import { ibanPretty, ibanValid } from '../lib/reference.js';
import { barcodePretty, virtualBarcode } from '../lib/barcode.js';
import { Card, Check } from './Card.js';
import { Field } from './Field.js';

interface PaymentSectionProps {
  form: InvoiceForm;
  onChange: <K extends keyof InvoiceForm>(key: K, value: InvoiceForm[K]) => void;
  invoices: Invoice[];
}

function IbanCheck({ iban }: { iban: string }) {
  if (!iban.trim()) return <Check tone="warn">IBAN puuttuu.</Check>;
  if (ibanValid(iban)) return <Check tone="ok">✓ IBAN kelvollinen: {ibanPretty(iban)}</Check>;
  return <Check tone="err">✗ IBAN ei läpäise tarkistusta – tarkista numero.</Check>;
}

function BarcodeCheck({ form, invoices }: { form: InvoiceForm; invoices: Invoice[] }) {
  const first = invoices[0];
  if (!first) return <Check tone="warn">Pankkiviivakoodi muodostetaan, kun vastaanottajia on lisätty.</Check>;

  const { code, error } = virtualBarcode({
    iban: form.iban,
    dueDate: form.dueDate,
    total: first.total,
    reference: first.reference
  });
  if (!code) return <Check tone="err">✗ {error}</Check>;

  return (
    <Check tone="ok">
      ✓ Ensimmäisen laskun virtuaaliviivakoodi: <code>{barcodePretty(code)}</code>
    </Check>
  );
}

export function PaymentSection({ form, onChange, invoices }: PaymentSectionProps) {
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

      <label className="radio">
        <input type="checkbox" checked={form.barcode} onChange={(e) => onChange('barcode', e.target.checked)} />
        <span><b>Pankkiviivakoodi laskuun</b> – Code 128C -viivakoodi ja virtuaaliviivakoodi CSV-vientiin</span>
      </label>

      {form.barcode && <BarcodeCheck form={form} invoices={invoices} />}
    </Card>
  );
}
