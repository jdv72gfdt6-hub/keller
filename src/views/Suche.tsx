// Globale Suche über Gegenstände (Name, Kategorie, Notiz, Ort) und Orte.
// Ohne Suchbegriff: alle Gegenstände (Kachel "Alle Gegenstände" auf der Startseite).
import { useMemo, useState } from 'react';
import { useKeller } from '../state/KellerContext';
import { pfadText, TYP_LABEL } from '../config/orte';
import { ortTexte, sucheGegenstaende, suchTokens } from '../lib/suche';
import { ersetzeHash, links, zurueck } from '../router';
import { GegenstandZeile } from '../components/GegenstandZeile';
import { Icon } from '../components/Icon';
import { Kapsel, KapselKnopf, Seitenkopf } from '../components/Ios';

type Filter = 'alle' | 'vorhanden' | 'entnommen';

export function Suche({ query }: { query: URLSearchParams }) {
  const { gegenstaende, orte } = useKeller();
  const [q, setQ] = useState(query.get('q') ?? '');
  const [filter, setFilter] = useState<Filter>('alle');
  const alleAnsicht = query.get('alle') === '1';

  const tokens = useMemo(() => suchTokens(q), [q]);
  const texte = useMemo(() => ortTexte(orte), [orte]);

  const treffer = useMemo(() => {
    if (tokens.length) return sucheGegenstaende(gegenstaende, texte, tokens, filter === 'alle' ? undefined : filter);
    return gegenstaende
      .filter((g) => filter === 'alle' || g.status === filter)
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }, [tokens, gegenstaende, filter, texte]);

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
      <Seitenkopf
        titel={alleAnsicht ? 'Alle Gegenstände' : 'Suche'}
        zurueck={alleAnsicht ? { text: 'Mein Keller', onClick: () => zurueck(links.start) } : undefined}
        aktionen={
          tokens.length > 0 &&
          treffer.length > 0 && (
            <Kapsel>
              <KapselKnopf icon="wuerfel" label="Treffer in 3D zeigen" href={links.raum3d({ q })} />
            </Kapsel>
          )
        }
      />
      <label className="suchfeld-ios">
        <Icon name="suche" size={17} />
        <input
          type="search"
          placeholder="Gegenstand, Kategorie oder Ort"
          value={q}
          autoFocus={!alleAnsicht}
          enterKeyHint="search"
          aria-label="Suchbegriff"
          onChange={(e) => {
            setQ(e.target.value);
            ersetzeHash(alleAnsicht && !e.target.value ? links.alle : links.suche(e.target.value));
          }}
        />
      </label>
      <div className="segment-steuerung" role="tablist">
        {(['alle', 'vorhanden', 'entnommen'] as Filter[]).map((f) => (
          <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? 'aktiv' : ''} onClick={() => setFilter(f)}>
            {f === 'alle' ? 'Alle' : f === 'vorhanden' ? 'Vorhanden' : 'Entnommen'}
          </button>
        ))}
      </div>

      {ortTreffer.length > 0 && (
        <>
          <h2 className="gruppe-titel">Orte</h2>
          <ul className="gruppe">
            {ortTreffer.map((o) => (
              <li key={o.id}>
                <a className="zeile zeile-zweizeilig" href={links.ort(o.id)}>
                  <span className="zeile-text">
                    <span className="zeile-titel">{o.name}</span>
                    <span className="zeile-unter">
                      {TYP_LABEL[o.typ]} · {pfadText(orte, o.id, ' › ')}
                    </span>
                  </span>
                  <Icon name="weiter" size={18} />
                </a>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="gruppe-titel">
        Gegenstände <span className="gedimmt">{treffer.length}</span>
      </h2>
      {treffer.length ? (
        <ul className="gruppe gz-liste">
          {treffer.slice(0, 300).map((g) => (
            <GegenstandZeile key={g.id} g={g} mitOrt ziel={tokens.length ? links.ort(g.ortId, `?g=${g.id}`) : undefined} />
          ))}
        </ul>
      ) : (
        <p className="leer">{tokens.length ? 'Nichts gefunden.' : 'Noch keine Gegenstände erfasst.'}</p>
      )}
    </div>
  );
}
