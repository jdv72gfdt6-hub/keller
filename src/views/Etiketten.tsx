// Druckbare Etikettenseite: QR-Code + Name + Pfad je Box/Fach/Schublade/Korb.
import { useEffect, useMemo, useState } from 'react';
import { useKeller } from '../state/KellerContext';
import { etikettStandard, pfad, RAUM_ID, TYP_LABEL } from '../config/orte';
import { aktuelleBasis, ortUrl, qrBasisLaden, qrBasisSetzen } from '../lib/qrBasis';
import { QrCode } from '../components/QrCode';
import { Icon } from '../components/Icon';
import { links, zurueck } from '../router';

type Groesse = 'klein' | 'mittel' | 'gross';
const GROESSEN: Record<Groesse, string> = { klein: 'Klein (3,5 cm)', mittel: 'Mittel (5 cm)', gross: 'Groß (7 cm)' };

export function Etiketten({ query }: { query: URLSearchParams }) {
  const { orte } = useKeller();
  const [basis, setBasis] = useState('');
  const [groesse, setGroesse] = useState<Groesse>('mittel');

  // Alle etikettierbaren Orte, nach Möbel gruppiert
  const gruppen = useMemo(() => {
    const raum = orte.get(RAUM_ID)!;
    return raum.kinder.map((mid) => {
      const m = orte.get(mid)!;
      const ids: string[] = [];
      const rek = (id: string) => {
        const o = orte.get(id)!;
        if (o.typ !== 'moebel' && o.typ !== 'tuer') ids.push(id);
        o.kinder.forEach(rek);
      };
      if (m.typ === 'frei') ids.push(m.id);
      else m.kinder.forEach(rek);
      return { id: mid, name: m.name, ids };
    });
  }, [orte]);

  const [auswahl, setAuswahl] = useState<Set<string>>(() => {
    const ids = query.get('ids');
    if (ids) return new Set(ids.split(','));
    return new Set([...orte.values()].filter(etikettStandard).map((o) => o.id));
  });

  useEffect(() => {
    qrBasisLaden().then(setBasis);
  }, []);

  const umschalten = (ids: string[], an: boolean) =>
    setAuswahl((alt) => {
      const neu = new Set(alt);
      ids.forEach((id) => (an ? neu.add(id) : neu.delete(id)));
      return neu;
    });

  const gewaehlt = gruppen.flatMap((g) => g.ids).filter((id) => auswahl.has(id));
  const lokal = /localhost|127\.0\.0\.1|^http:\/\/(192|10|172)\./.test(basis);

  return (
    <div className="seite etiketten">
      <div className="nicht-drucken">
        <nav className="krume">
          <button className="icon-btn" onClick={() => zurueck(links.mehr)} aria-label="Zurück">
            <Icon name="zurueck" />
          </button>
          <span>Etiketten</span>
        </nav>
        <h1>QR-Etiketten</h1>

        <label className="formular">
          Adresse in den QR-Codes
          <input
            value={basis}
            onChange={(e) => setBasis(e.target.value)}
            onBlur={() => qrBasisSetzen(basis)}
            placeholder={aktuelleBasis()}
          />
        </label>
        {lokal && (
          <p className="hinweis klein">
            Achtung: Das ist eine lokale Adresse. Drucke die Etiketten am besten erst, wenn die App auf GitHub Pages läuft – oder trage
            die spätere Adresse hier ein (z. B. https://deinname.github.io/keller/). Der In-App-Scanner funktioniert mit jeder Adresse.
          </p>
        )}

        <div className="chips">
          {(Object.keys(GROESSEN) as Groesse[]).map((g) => (
            <button key={g} className={`chip ${groesse === g ? 'aktiv' : ''}`} onClick={() => setGroesse(g)}>
              {GROESSEN[g]}
            </button>
          ))}
        </div>

        {gruppen.map((gr) => {
          const alle = gr.ids.every((id) => auswahl.has(id));
          return (
            <details key={gr.id} className="etikett-gruppe">
              <summary>
                <input
                  type="checkbox"
                  checked={alle}
                  onChange={(e) => umschalten(gr.ids, e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`${gr.name} komplett auswählen`}
                />
                {gr.name} <span className="gedimmt">({gr.ids.filter((id) => auswahl.has(id)).length}/{gr.ids.length})</span>
              </summary>
              {gr.ids.map((id) => {
                const o = orte.get(id)!;
                return (
                  <label key={id} className="check-zeile">
                    <input type="checkbox" checked={auswahl.has(id)} onChange={(e) => umschalten([id], e.target.checked)} />
                    {pfad(orte, id)
                      .slice(1)
                      .map((x) => x.name)
                      .join(' › ') || o.name}
                    <span className="gedimmt klein"> {TYP_LABEL[o.typ]}</span>
                  </label>
                );
              })}
            </details>
          );
        })}

        <div className="leiste">
          <button className="btn btn-primaer" onClick={() => window.print()} disabled={!gewaehlt.length}>
            <Icon name="drucker" size={18} /> {gewaehlt.length} Etiketten drucken
          </button>
          <button className="btn" onClick={() => setAuswahl(new Set())}>
            Keine
          </button>
        </div>
        <h2 className="abschnitt">Vorschau</h2>
      </div>

      <div className={`etikett-bogen etikett-${groesse}`}>
        {basis &&
          gewaehlt.map((id) => {
            const p = pfad(orte, id);
            const o = orte.get(id)!;
            return (
              <div key={id} className="etikett">
                <QrCode text={ortUrl(basis, id)} />
                <div className="etikett-text">
                  <b>{o.name}</b>
                  <span>{p.slice(0, -1).map((x) => x.name).join(' › ')}</span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
