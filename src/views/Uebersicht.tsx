// Startseite: Baum Raum → Möbel → Fächer → Boxen → Gegenstände, aufklappbar.
import { useState } from 'react';
import { useKeller } from '../state/KellerContext';
import { OHNE_ORT_ID, RAUM_ID, type Ort } from '../config/orte';
import { gehe, links } from '../router';
import { Icon } from '../components/Icon';
import { OrtWahl, zuletztGenutztMerken } from '../components/OrtWahl';
import { ConfigHinweis } from '../components/ConfigHinweis';
import { AnsichtUmschalter } from '../components/AnsichtUmschalter';

const SPEICHER_KEY = 'keller.baum.offen';

function offeneLaden(): Set<string> {
  try {
    const s = sessionStorage.getItem(SPEICHER_KEY);
    if (s) return new Set(JSON.parse(s));
  } catch {
    /* ignorieren */
  }
  return new Set([RAUM_ID]);
}

export function Uebersicht() {
  const { orte, proOrt, gegenstaende, config } = useKeller();
  const [offen, setOffen] = useState(offeneLaden);
  const [wahl, setWahl] = useState(false);

  const umschalten = (id: string) =>
    setOffen((alt) => {
      const neu = new Set(alt);
      if (neu.has(id)) neu.delete(id);
      else neu.add(id);
      try {
        sessionStorage.setItem(SPEICHER_KEY, JSON.stringify([...neu]));
      } catch {
        /* ignorieren */
      }
      return neu;
    });

  const alleZu = () => setOffen(new Set([RAUM_ID]));
  const raum = orte.get(RAUM_ID)!;
  const entnommen = gegenstaende.filter((g) => g.status === 'entnommen').length;
  const ohneOrt = proOrt.get(OHNE_ORT_ID) ?? [];

  return (
    <div className="seite">
      <header className="kopf">
        <div>
          <p className="kopf-ueber">Inventar</p>
          <h1>{config.raum.name}</h1>
        </div>
        <div className="kopf-stats">
          <span>
            <b>{gegenstaende.length}</b> Gegenstände
          </span>
          {entnommen > 0 && (
            <a className="tag tag-orange" href={links.entnommen}>
              {entnommen} entnommen
            </a>
          )}
        </div>
      </header>

      <ConfigHinweis />

      <AnsichtUmschalter aktiv="baum" />

      <a className="suchpille" href={links.suche()}>
        <Icon name="suche" size={18} /> Was suchst du?
      </a>

      <div className="leiste">
        <button className="btn btn-primaer" onClick={() => setWahl(true)}>
          <Icon name="plus" size={18} /> Erfassen
        </button>
        <button className="btn" onClick={alleZu}>
          Alles zuklappen
        </button>
      </div>

      <ul className="baum" role="tree">
        {raum.kinder.map((id) => (
          <BaumKnoten key={id} ort={orte.get(id)!} tiefe={0} offen={offen} umschalten={umschalten} />
        ))}
        {ohneOrt.length > 0 && (
          <li className="baum-knoten">
            <div className="baum-zeile baum-warnung">
              <span className="baum-pfeil" />
              <span className="baum-name">Ohne Ort ({ohneOrt.length})</span>
            </div>
            <ul>
              {ohneOrt.map((g) => (
                <li key={g.id}>
                  <a className="baum-gegenstand" href={links.gegenstand(g.id)} style={{ paddingLeft: 40 }}>
                    {g.name}
                  </a>
                </li>
              ))}
            </ul>
          </li>
        )}
      </ul>

      {wahl && (
        <OrtWahl
          titel="Wohin kommen die Sachen?"
          onAbbrechen={() => setWahl(false)}
          onWahl={(id) => {
            zuletztGenutztMerken(id);
            gehe(links.ort(id, '?neu=1'));
          }}
        />
      )}
    </div>
  );
}

interface KnotenProps {
  ort: Ort;
  tiefe: number;
  offen: Set<string>;
  umschalten: (id: string) => void;
}

function BaumKnoten({ ort, tiefe, offen, umschalten }: KnotenProps) {
  const { orte, proOrt, zaehlung } = useKeller();
  const items = proOrt.get(ort.id) ?? [];
  const z = zaehlung(ort.id);
  const aufklappbar = ort.kinder.length > 0 || items.length > 0;
  const istOffen = offen.has(ort.id);
  const einzug = 8 + tiefe * 16;

  return (
    <li className={`baum-knoten baum-${ort.typ}`} role="treeitem" aria-expanded={aufklappbar ? istOffen : undefined}>
      <div className="baum-zeile" style={{ paddingLeft: einzug }}>
        <button
          className={`baum-pfeil ${istOffen ? 'offen' : ''}`}
          onClick={() => umschalten(ort.id)}
          disabled={!aufklappbar}
          aria-label={istOffen ? 'Zuklappen' : 'Aufklappen'}
        >
          {aufklappbar && <Icon name="weiter" size={16} />}
        </button>
        <a className="baum-name" href={links.ort(ort.id)}>
          {ort.farbe && <span className="farbpunkt" style={{ background: ort.farbe }} />}
          {ort.name}
        </a>
        {z.gesamt > 0 && (
          <span className={`zahl ${z.entnommen ? 'zahl-teil' : ''}`} title={`${z.entnommen} entnommen`}>
            {z.gesamt}
          </span>
        )}
      </div>
      {istOffen && (
        <ul role="group">
          {ort.kinder.map((id) => (
            <BaumKnoten key={id} ort={orte.get(id)!} tiefe={tiefe + 1} offen={offen} umschalten={umschalten} />
          ))}
          {items.map((g) => (
            <li key={g.id} role="treeitem">
              <a
                className={`baum-gegenstand ${g.status === 'entnommen' ? 'entnommen' : ''}`}
                href={links.gegenstand(g.id)}
                style={{ paddingLeft: einzug + 34 }}
              >
                <span className="status-punkt" />
                {g.menge > 1 && <span className="gz-menge">{g.menge}×</span>}
                {g.name}
              </a>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
