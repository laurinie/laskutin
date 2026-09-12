import { useState } from 'react';
import { clearStoredData, storedBytes, storedKeys } from '../lib/storage.js';
import { Card, Check } from './Card.js';

interface StorageSectionProps {
  persist: boolean;
  onPersist: (enabled: boolean) => void;
  onReset: () => void;
}

export function StorageSection({ persist, onPersist, onReset }: StorageSectionProps) {
  const [confirming, setConfirming] = useState<'clear' | 'reset' | null>(null);
  const [status, setStatus] = useState('');
  const [saved, setSaved] = useState(() => ({ keys: storedKeys().length, bytes: storedBytes() }));

  const refreshSaved = () => setSaved({ keys: storedKeys().length, bytes: storedBytes() });

  function togglePersist(enabled: boolean) {
    onPersist(enabled);
    setStatus(enabled
      ? 'Tallennus päällä: lomake, logo ja viestipohja säilyvät seuraavalle kerralle.'
      : 'Tallennus pois päältä ja tallennetut tiedot poistettu selaimesta.');
    setTimeout(refreshSaved, 0);
  }

  function clearData() {
    const removed = clearStoredData();
    setConfirming(null);
    refreshSaved();
    setStatus(removed
      ? `Poistettu ${removed} tallennettua kohdetta.${persist ? ' Tallennus on yhä päällä, joten muutokset tallentuvat uudelleen.' : ''}`
      : 'Selaimeen ei ollut tallennettu mitään.');
  }

  function resetForm() {
    onReset();
    setConfirming(null);
    setTimeout(refreshSaved, 0);
    setStatus('Lomake palautettu oletusarvoihin.');
  }

  return (
    <Card title="Selaimeen tallennetut tiedot">
      <p className="hint">
        Tiedot eivät poistu koneeltasi: lomakkeen arvot, logo ja sähköpostin viestipohja tallentuvat vain tämän
        selaimen localStorageen. API-avainta ei tallenneta koskaan.
      </p>

      <label className="radio">
        <input type="checkbox" checked={persist} onChange={(e) => togglePersist(e.target.checked)} />
        <span>
          <b>Tallenna tiedot selaimeen</b> – ilman tätä kaikki katoaa, kun suljet välilehden. Kannattaa ottaa pois
          jaetulla koneella.
        </span>
      </label>

      <div className="row">
        {confirming === 'clear' ? (
          <button type="button" onClick={clearData}>✅ Vahvista: tyhjennä tiedot</button>
        ) : (
          <button type="button" className="secondary" onClick={() => setConfirming('clear')} disabled={!saved.keys}>
            🧹 Tyhjennä tallennetut tiedot
          </button>
        )}

        {confirming === 'reset' ? (
          <button type="button" onClick={resetForm}>✅ Vahvista: nollaa lomake</button>
        ) : (
          <button type="button" className="secondary" onClick={() => setConfirming('reset')}>
            ↩️ Nollaa lomake
          </button>
        )}

        {confirming && (
          <button type="button" className="ghost" onClick={() => setConfirming(null)}>Peruuta</button>
        )}

        <span className="badge">
          {saved.keys ? `${saved.keys} kohdetta · ${Math.max(1, Math.round(saved.bytes / 1024))} kt` : 'ei tallennettuja tietoja'}
        </span>
      </div>

      {confirming === 'reset' && (
        <Check tone="warn">Nollaus palauttaa lomakkeen, logon ja vastaanottajalistan oletuksiin.</Check>
      )}
      {status && <p className="status">{status}</p>}
    </Card>
  );
}
