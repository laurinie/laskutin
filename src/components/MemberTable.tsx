import type { Invoice } from '../lib/types.js';
import { money } from '../lib/format.js';
import { refPretty } from '../lib/reference.js';

export function MemberTable({ invoices, columnInfo }: { invoices: Invoice[]; columnInfo: string }) {
  if (!invoices.length) return null;

  const missingEmails = invoices.filter((invoice) => invoice.member.badEmail).length;
  const notes = [
    columnInfo && `Tunnistetut sarakkeet → ${columnInfo}`,
    missingEmails && `${missingEmails} riviltä puuttuu kelvollinen sähköposti`
  ].filter(Boolean);

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Laskunro</th><th>Nimi</th><th>Sähköposti</th><th>Viite</th><th>Summa</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.invoiceNo}>
                <td className="num">{invoice.invoiceNo}</td>
                <td>{invoice.member.name}</td>
                <td className={invoice.member.badEmail ? 'bad' : undefined}>
                  {invoice.member.email || '– puuttuu –'}
                </td>
                <td>{refPretty(invoice.reference) || '–'}</td>
                <td className="num">{money(invoice.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {notes.length > 0 && <p className="check">{notes.join(' · ')}</p>}
    </>
  );
}
