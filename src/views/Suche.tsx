// Globale Suche über Gegenstände (Name, Kategorie, Notiz, Ort) und Orte.
import { useMemo, useState } from 'react';
import { useKeller } from '../state/KellerContext';
import { pfadText, TYP_LABEL } from '../config/orte';
import { ortTexte, sucheGegenstaende, suchTokens } from '../lib/suche';
import { ersetzeHash, links } from '../router';
import { GegenstandZeile } from '../components/GegenstandZeile';
import { Icon } from '../components/Icon';

type Filter = 'alle' | 'vorhanden' | 'entnommen';

export function Suche({ query }: { query: URLSearchParams }) {
  const { gegenstaende, orte } = useKeller();
  const [q, setQ] = useState(query.get('q') ?? '');
  const [filter, setFilter] = useState<Filter>('alle');

  const tokens = useMemo(() => suchTokens(q), [q]);
  const texte = useMemo(() => ortTexte(orte), [orte]);

  const treffer = useMemo(
    () => sucheGegenstaende(gegenstaende, texte, tokens, filter === 'alle' ? undefined : filter),
    [tokens, gegenstaende, filter, texte],
  );

  const ortTreffer = useMemo(() => {
    if (!tokens.length) return [];
    return [...orte.values()]
      .filter((o) => o.typ !== 'raum')
      .filter((o) => {
        const n = texte.get(o.id) ?? '';
        return tokens.every((t) => n.includes(t));
      })
      .slice(0, 6);
  }, [tokens, orte, texte]);

  return (
    <div className="seite">
      <div className="such-kopf">
        <Icon name="suche" />
        <input
          className="suchfeld gross"
          type="search"
          placeholder="Was suchst du?"
          value={q}
          autoFocus
          enterKeyHint="search"
          onChange={(e) => {
            setQ(e.target.value);
            ersetzeHash(links.suche(e.target.value));
          }}
        />
      </div>
      <div className="chips">
        {(['alle', 'vorhanden', 'entnommen'] as Filter[]).map((f) => (
          <button key={f} className={`chip ${filter === f ? 'aktiv' : ''}`} onClick={() => setFilter(f)}>
            {f === 'alle' ? 'Alle' : f === 'vorhanden' ? 'Vorhanden' : 'Entnommen'}
          </button>
        ))}
      </div>

      {!tokens.length && <p className="leer">Name, Kategorie, Notiz oder Ort eingeben – z. B. „Akku“, „Werkzeug“ oder „Box grau“.</p>}

      {ortTreffer.length > 0 && (
        <>
          <h2 className="abschnitt">Orte</h2>
          <ul className="wahl-liste">
            {ortTreffer.map((o) => (
              <li key={o.id}>
                <a className="wahl-zeile" href={links.ort(o.id)}>
                  <span className="wahl-typ">{TYP_LABEL[o.typ]}</span>
                  <span>{pfadText(orte, o.id)}</span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}

      {tokens.length > 0 && (
        <>
          <div className="abschnitt-zeile">
            <h2 className="abschnitt">
              Gegenstände <span className="gedimmt">({treffer.length})</span>
            </h2>
            {treffer.length > 0 && (
              <a className="chip" href={links.raum3d({ q })}>
                <Icon name="wuerfel" size={16} /> In 3D zeigen
              </a>
            )}
          </div>
          {treffer.length ? (
            <ul className="gz-liste">
              {treffer.slice(0, 200).map((g) => (
                <GegenstandZeile key={g.id} g={g} mitOrt ziel={links.ort(g.ortId, `?g=${g.id}`)} />
              ))}
            </ul>
          ) : (
            <p className="leer">Nichts gefunden.</p>
          )}
        </>
      )}
    </div>
  );
}
