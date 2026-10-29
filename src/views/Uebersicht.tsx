// Startseite im Aufbau der Erinnerungen-App: Übersichtskacheln, großer Titel, Möbel als Liste, 3D-Ansicht.
import { useState } from 'react';
import { useKeller } from '../state/KellerContext';
import { OHNE_ORT_ID, RAUM_ID, type Ort } from '../config/orte';
import type { KellerConfig } from '../config/types';
import { gehe, links } from '../router';
import { Icon, RundSymbol, Symbol, type GlyphName, type SystemFarbe } from '../components/Icon';
import { Kapsel, KapselKnopf, Menue, PlusKnopf, Seitenkopf, useGrossTitel } from '../components/Ios';
import { OrtWahl, zuletztGenutztMerken } from '../components/OrtWahl';
import { ConfigHinweis } from '../components/ConfigHinweis';
import { GegenstandZeile } from '../components/GegenstandZeile';

const TITEL = 'Mein Keller';
const FARBEN: SystemFarbe[] = ['blau', 'tuerkis', 'orange', 'braun', 'grau', 'rot', 'gelb'];

/** Passendes Symbol je Möbelart */
function moebelGlyph(config: KellerConfig, o: Ort): GlyphName {
  const m = config.moebel.find((x) => x.id === o.id);
  if (!m) return 'archiv';
  if (m.typ === 'kallax') return m.spalten >= 3 ? 'regal' : 'regalKlein';
  if (m.typ === 'pax') return 'schrank';
  return 'schrankTueren';
}

export function Uebersicht() {
  const { orte, proOrt, gegenstaende, config, zaehlung } = useKeller();
  const [wahl, setWahl] = useState(false);
  const [menue, setMenue] = useState(false);
  const [titelRef, kompakt] = useGrossTitel();

  const raum = orte.get(RAUM_ID)!;
  const kinder = raum.kinder.map((id) => orte.get(id)!);
  const moebel = kinder.filter((o) => o.typ !== 'frei');
  const frei = kinder.filter((o) => o.typ === 'frei');
  const freiZahl = frei.reduce((s, o) => s + zaehlung(o.id).gesamt, 0);
  const entnommen = gegenstaende.filter((g) => g.status === 'entnommen').length;
  const ohneOrt = proOrt.get(OHNE_ORT_ID) ?? [];

  return (
    <div className="seite">
      <Seitenkopf
        titel={TITEL}
        grossTitel={false}
        kompakt={kompakt}
        aktionen={
          <Kapsel>
            <KapselKnopf icon="neu" label="Gegenstände hinzufügen" onClick={() => setWahl(true)} />
            <KapselKnopf icon="mehr" label="Mehr" onClick={() => setMenue(true)} />
            <KapselKnopf icon="suche" label="Suche" href={links.suche()} />
          </Kapsel>
        }
      />

      <ConfigHinweis />

      <div className="kacheln">
        <a className="kachel kachel-orange" href={links.entnommen}>
          <Symbol glyph="raus" size={30} />
          <span className="kachel-zahl">{entnommen}</span>
          <span className="kachel-titel">Entnommen</span>
        </a>
        <a className="kachel kachel-blau" href={links.alle}>
          <Symbol glyph="archiv" size={30} />
          <span className="kachel-zahl">{gegenstaende.length}</span>
          <span className="kachel-titel">Alle Gegenstände</span>
        </a>
      </div>

      <h1 className="grosstitel abstand-oben" ref={titelRef}>
        {TITEL}
      </h1>

      <ul className="gruppe">
        {moebel.map((o, i) => (
          <li key={o.id}>
            <a className="zeile" href={links.ort(o.id)}>
              <RundSymbol glyph={o.typ === 'moebel' ? moebelGlyph(config, o) : 'archiv'} farbe={FARBEN[i % FARBEN.length]} />
              <span className="zeile-titel">{o.name}</span>
              <span className="zeile-wert">{zaehlung(o.id).gesamt}</span>
              <Icon name="weiter" size={18} />
            </a>
          </li>
        ))}
        {frei.length > 0 && (
          <li>
            <a className="zeile" href={links.frei}>
              <RundSymbol glyph="koffer" farbe="gruen" />
              <span className="zeile-titel">Freie Positionen</span>
              <span className="zeile-wert">{freiZahl}</span>
              <Icon name="weiter" size={18} />
            </a>
          </li>
        )}
      </ul>

      <ul className="gruppe">
        <li>
          <a className="zeile" href={links.raum3d()}>
            <RundSymbol glyph="wuerfel" farbe="grau" />
            <span className="zeile-titel">3D-Ansicht</span>
            <Icon name="weiter" size={18} />
          </a>
        </li>
      </ul>

      {ohneOrt.length > 0 && (
        <>
          <h2 className="gruppe-titel">Ohne Ort</h2>
          <ul className="gruppe gz-liste">
            {ohneOrt.map((g) => (
              <GegenstandZeile key={g.id} g={g} />
            ))}
          </ul>
        </>
      )}

      <PlusKnopf label="Gegenstände erfassen" onClick={() => setWahl(true)} />

      {menue && (
        <Menue
          onClose={() => setMenue(false)}
          punkte={[
            { icon: 'wuerfel', text: '3D-Ansicht', href: links.raum3d() },
            { icon: 'qr', text: 'QR-Etiketten drucken', href: links.etiketten },
            { icon: 'stift', text: 'Raum & Möbel bearbeiten', href: links.einrichtung },
            { icon: 'sonne', text: 'Darstellung & Backup', href: links.mehr },
          ]}
        />
      )}

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
