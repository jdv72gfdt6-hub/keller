// Schnellerfassung am unteren Bildschirmrand (Daumenbereich).
// Einzeln: tippen, Enter, nächster. Mehrfach: eine Zeile pro Gegenstand, z. B. "3x Schrauben #Werkzeug".
import { useEffect, useRef, useState } from 'react';
import { useKeller } from '../state/KellerContext';
import { parseZeile } from '../lib/text';
import { Icon } from './Icon';

export function Schnellerfassung({ ortId, autoFokus }: { ortId: string; autoFokus?: boolean }) {
  const { hinzufuegen, kategorien, zeigeToast } = useKeller();
  const [mehrfach, setMehrfach] = useState(false);
  const [text, setText] = useState('');
  const [kategorie, setKategorie] = useState('');
  const eingabe = useRef<HTMLInputElement>(null);
  const feld = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFokus) eingabe.current?.focus();
  }, [autoFokus]);

  const zeilen = text.split('\n').map(parseZeile).filter((z) => z !== null);

  async function speichern() {
    if (!zeilen.length) return;
    await hinzufuegen(
      zeilen.map((z) => ({ name: z.name, menge: z.menge, kategorie: z.kategorie ?? kategorie.trim() })),
      ortId,
    );
    zeigeToast(zeilen.length === 1 ? `„${zeilen[0].name}“ hinzugefügt` : `${zeilen.length} Gegenstände hinzugefügt`);
    setText('');
    (mehrfach ? feld : eingabe).current?.focus();
  }

  // Zusatzzeile (Mehrere, Kategorie) nur beim Tippen zeigen, damit die Leiste klein bleibt.
  // Schließen leicht verzögert: Ein Tipp auf "Mehrere" nimmt dem Feld erst den Fokus.
  const [offen, setOffen] = useState(false);
  const zuTimer = useRef<number | undefined>(undefined);
  const zusatz = offen || mehrfach || !!kategorie.trim();

  return (
    <form
      className="schnell"
      onSubmit={(e) => {
        e.preventDefault();
        speichern();
      }}
      onFocus={() => {
        window.clearTimeout(zuTimer.current);
        setOffen(true);
      }}
      onBlur={() => {
        zuTimer.current = window.setTimeout(() => setOffen(false), 250);
      }}
    >
      <div className="schnell-zeile">
        {mehrfach ? (
          <textarea
            ref={feld}
            className="schnell-feld"
            rows={5}
            value={text}
            placeholder={'Ein Gegenstand pro Zeile\n3x Schrauben M6\nAkkuschrauber #Werkzeug'}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
        ) : (
          <input
            ref={eingabe}
            className="schnell-feld"
            value={text}
            placeholder="Gegenstand hinzufügen"
            onChange={(e) => setText(e.target.value)}
            enterKeyHint="done"
            autoComplete="off"
          />
        )}
        <button type="submit" className="btn btn-primaer" disabled={!zeilen.length} aria-label="Hinzufügen">
          <Icon name="plus" size={20} />
          {zeilen.length > 1 ? zeilen.length : ''}
        </button>
      </div>
      {zusatz && (
        <div className="schnell-leiste">
          <button type="button" className="chip" onClick={() => setMehrfach((m) => !m)}>
            <Icon name="liste" size={16} /> {mehrfach ? 'Einzeln' : 'Mehrere'}
          </button>
          <input
            className="chip-input"
            list="kategorien"
            value={kategorie}
            onChange={(e) => setKategorie(e.target.value)}
            placeholder="Kategorie (optional)"
            aria-label="Kategorie für neue Gegenstände"
          />
          <datalist id="kategorien">
            {kategorien.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
        </div>
      )}
      {zusatz && !mehrfach && <p className="schnell-tipp">Tipp: „3x Schrauben #Werkzeug“ setzt Menge und Kategorie.</p>}
    </form>
  );
}
