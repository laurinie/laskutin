import type { Invoice } from './types.js';
import { fmtDate, money } from './format.js';
import { refPretty } from './reference.js';

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

export interface EmailSettings {
  senderName: string;
  senderEmail: string;
  subject: string;
  body: string;
}

export const defaultEmailSettings = (): EmailSettings => ({
  senderName: '',
  senderEmail: '',
  subject: 'Lasku {{laskunumero}}',
  body: `Hei {{nimi}},

ohessa lasku {{laskunumero}}.

Summa: {{summa}}
Eräpäivä: {{erapaiva}}
Viitenumero: {{viite}}

Ystävällisin terveisin`
});

export const PLACEHOLDERS = ['nimi', 'laskunumero', 'viite', 'summa', 'erapaiva'] as const;

export function renderTemplate(template: string, invoice: Invoice, dueDate: string): string {
  const values: Record<string, string> = {
    nimi: invoice.recipient.name,
    laskunumero: String(invoice.invoiceNo),
    viite: refPretty(invoice.reference),
    summa: money(invoice.total),
    erapaiva: fmtDate(dueDate)
  };
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => values[key] ?? match);
}

export interface BrevoMessage {
  sender: { name: string; email: string };
  to: Array<{ email: string; name: string }>;
  subject: string;
  textContent: string;
  attachment: Array<{ content: string; name: string }>;
}

export function brevoMessage(
  settings: EmailSettings,
  invoice: Invoice,
  dueDate: string,
  pdfBase64: string,
  filename: string
): BrevoMessage {
  return {
    sender: { name: settings.senderName, email: settings.senderEmail },
    to: [{ email: invoice.recipient.email, name: invoice.recipient.name }],
    subject: renderTemplate(settings.subject, invoice, dueDate),
    textContent: renderTemplate(settings.body, invoice, dueDate),
    attachment: [{ content: pdfBase64, name: filename }]
  };
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = '';
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function settingsProblem(settings: EmailSettings, apiKey: string): string | null {
  if (!apiKey.trim()) return 'Anna Brevon API-avain.';
  if (!settings.senderEmail.trim()) return 'Anna lähettäjän sähköpostiosoite.';
  if (!settings.senderName.trim()) return 'Anna lähettäjän nimi.';
  if (!settings.subject.trim()) return 'Anna viestin aihe.';
  return null;
}

export async function sendViaBrevo(apiKey: string, message: BrevoMessage): Promise<void> {
  const response = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(message)
  });
  if (response.ok) return;

  const detail = await response.text().catch(() => '');
  throw new Error(brevoError(response.status, detail));
}

function brevoError(status: number, detail: string): string {
  if (status === 401) return 'Brevo hylkäsi API-avaimen (401).';
  if (status === 400 && /sender/i.test(detail)) return 'Lähettäjän osoitetta ei ole vahvistettu Brevossa (400).';
  if (status === 429) return 'Brevon lähetysraja tuli vastaan (429).';

  try {
    const message = (JSON.parse(detail) as { message?: string }).message;
    if (message) return `${status}: ${message}`;
  } catch {
    if (detail) return `${status}: ${detail.slice(0, 120)}`;
  }
  return `Brevo vastasi virheellä ${status}.`;
}
