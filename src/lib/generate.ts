import type { Invoice, InvoiceConfig, Logo } from './types.js';
import { createDoc, loadJSZip } from './lazy.js';
import { drawInvoice } from './pdf.js';
import { slug } from './format.js';

export async function singleInvoiceBlob(invoice: Invoice, config: InvoiceConfig, logo: Logo | null): Promise<Blob> {
  const doc = await createDoc();
  drawInvoice(doc, invoice, config, logo);
  return doc.output('blob');
}

export async function combinedPdfBlob(invoices: Invoice[], config: InvoiceConfig, logo: Logo | null): Promise<Blob> {
  const doc = await createDoc();
  invoices.forEach((invoice, index) => {
    if (index) doc.addPage();
    drawInvoice(doc, invoice, config, logo);
  });
  return doc.output('blob');
}

export async function zipOfInvoices(
  invoices: Invoice[],
  config: InvoiceConfig,
  logo: Logo | null,
  csv: string,
  onProgress?: (done: number, total: number) => void
): Promise<Blob> {
  const JSZip = await loadJSZip();
  const zip = new JSZip();

  for (const [index, invoice] of invoices.entries()) {
    zip.file(`${invoice.invoiceNo}_${slug(invoice.recipient.name)}.pdf`, await singleInvoiceBlob(invoice, config, logo));
    if (index % 20 === 0) {
      onProgress?.(index + 1, invoices.length);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  zip.file('laskut.csv', csv);
  return zip.generateAsync({ type: 'blob' });
}
