// 3D-Ansicht des Kellers: Canvas + Bedienelemente (Suche, Ansicht zurücksetzen) + Infokarte.
// Wird per lazy() nachgeladen, damit die Listenansicht schnell startet (offline trotzdem vorab gecacht).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useKeller } from '../state/KellerContext';
import { pfadText, TYP_LABEL } from '../config/orte';
import type { Gegenstand } from '../db/db';
import { ortTexte, sucheGegenstaende, suchTokens } from '../lib/suche';
import { ersetzeHash, links } from '../router';
import { Icon } from '../components/Icon';
import { GegenstandZeile } from '../components/GegenstandZeile';
import { AnsichtUmschalter } from '../components/AnsichtUmschalter';
import { elementOrt, layoutRaum, lokalZuWelt, mitte, zielFuerOrt, type Vec3 } from './layout';
import { Szene, type Beschriftung, type KameraAuftrag, type SzenenAktionen, type SzenenZustand } from './Szene';

const cm = (v: Vec3): Vec3 => [v[0] / 100, v[1] / 100, v[2] / 100];

export default function Ansicht3D({ query }: { query: URLSearchParams }) {
  const { config, orte, proOrt, gegenstaende } = useKeller();
  const r = useMemo(() => layoutRaum(config, orte), [config, orte]);

  const [auswahl, setAuswahl] = useState<string | null>(null);
  const [ausgezogen, setAusgezogen] = useState<string | null>(null);
  const [schiebeOffen, setSchiebeOffen] = useState<string | null>(null);
  const [tueren, setTueren] = useState<Set<string>>(new Set());
  const [suche, setSuche] = useState(query.get('q') ?? '');
  const [kamera, setKamera] = useState<KameraAuftrag | null>(null);

  // Startblick: von der Tür (x = 0) in den Raum, etwas erhöht, damit beide Wände sichtbar sind.
  const start = useMemo(() => {
    const { laenge: L, breite: B } = config.raum;
    return { pos: [-2.4, 3.1, B / 200] as Vec3, ziel: [(L / 100) * 0.55, 0.55, B / 200] as Vec3 };
  }, [config.raum]);

  const fokus = useCallback(
    (ortId: string) => {
      const z = zielFuerOrt(r, orte, ortId);
      if (!z) return;
      const m = cm(z.mitte);
      const n = z.normale;
      // Ziel etwas unter das Objekt legen → Objekt erscheint in der oberen Bildhälfte, über der Infokarte
      setKamera({ nr: Date.now(), ziel: [m[0], m[1] - 0.28, m[2]], pos: [m[0] + n[0] * 1.3, m[1] + 0.3, m[2] + n[2] * 1.3] });
    },
    [r, orte],
  );

  /** Ort auswählen: Hülle öffnen (Schiebe-/Drehtür), Box/Schublade herausziehen. */
  const waehle = useCallback(
    (id: string, mitFokus = false) => {
      const el = elementOrt(r, orte, id);
      const t = r.index.get(el);
      // Nochmal antippen schiebt wieder hinein
      if (el === auswahl && t?.e.auszug) {
        setAuswahl(null);
        setAusgezogen(null);
        return;
      }
      setAuswahl(el);
      setAusgezogen(t && t.e.auszug > 0 ? (t.e.mit ?? el) : null);
      const huelle = t?.e.huelle;
      if (huelle?.art === 'schiebe') setSchiebeOffen(huelle.moebelId);
      if (huelle?.art === 'dreh') setTueren((alt) => new Set(alt).add(huelle.tuerId));
      if (orte.get(el)?.typ === 'tuer') setTueren((alt) => new Set(alt).add(el));
      if (r.schiebe?.ueber.includes(el)) setSchiebeOffen(el);
      if (mitFokus) fokus(el);
    },
    [r, orte, auswahl, fokus],
  );

  const aktionen: SzenenAktionen = useMemo(
    () => ({
      waehle: (id) => waehle(id),
      drehtuer: (id) => {
        const neu = new Set(tueren);
        if (neu.has(id)) {
          neu.delete(id);
          // Auswahl hinter der geschlossenen Tür aufheben
          const h = auswahl ? r.index.get(auswahl)?.e.huelle : undefined;
          if (auswahl === id || (h?.art === 'dreh' && h.tuerId === id)) setAuswahl(null);
        } else {
          neu.add(id);
          setAuswahl(id);
        }
        setTueren(neu);
      },
      schiebe: (moebelId) => {
        setSchiebeOffen(moebelId);
        setAuswahl(moebelId);
        setAusgezogen(null);
      },
    }),
    [waehle, auswahl, tueren, r],
  );

  // Deep-Link: #/3d?ort=<id> wählt den Ort aus und fährt hin (nur beim Öffnen)
  const deepLinkErledigt = useRef(false);
  useEffect(() => {
    if (deepLinkErledigt.current) return;
    deepLinkErledigt.current = true;
    const id = query.get('ort');
    if (id && orte.has(id)) waehle(id, true);
  }, [query, orte, waehle]);

  // Suchtreffer hervorheben
  const texte = useMemo(() => ortTexte(orte), [orte]);
  const treffer = useMemo(() => sucheGegenstaende(gegenstaende, texte, suchTokens(suche)), [gegenstaende, texte, suche]);
  const trefferOrte = useMemo(() => {
    const m = new Map<string, Gegenstand[]>();
    for (const g of treffer) {
      if (!orte.has(g.ortId)) continue;
      const el = elementOrt(r, orte, g.ortId);
      m.set(el, [...(m.get(el) ?? []), g]);
    }
    return m;
  }, [treffer, r, orte]);

  const zustand: SzenenZustand = useMemo(() => {
    const mitInhalt = new Set<string>();
    for (const [id, liste] of proOrt) if (liste.length) mitInhalt.add(id);
    const freiInhalt = new Map<string, Gegenstand[]>();
    for (const f of r.frei) freiInhalt.set(f.fp.id, proOrt.get(f.fp.id) ?? []);
    return { auswahl, ausgezogen, schiebeOffen, tueren, hervor: new Set(trefferOrte.keys()), mitInhalt, freiInhalt };
  }, [auswahl, ausgezogen, schiebeOffen, tueren, trefferOrte, proOrt, r]);

  // Beschriftungen: Möbelnamen über der Front, freie Positionen über ihrem Objekt
  const beschriftungsEbene = useRef<HTMLDivElement>(null);
  const beschriftungen: Beschriftung[] = useMemo(
    () => [
      ...r.moebel.map((m3d) => ({
        text: m3d.m.name,
        pos: cm(lokalZuWelt(m3d.lage, [m3d.m.breite / 2, m3d.m.hoehe + 10, m3d.m.tiefe])),
      })),
      ...r.frei.map((f) => ({ text: f.fp.name, pos: cm([mitte(f.q)[0], f.q.max[1] + 10, mitte(f.q)[2]]), klein: true })),
    ],
    [r],
  );

  function alleZu() {
    setSchiebeOffen(null);
    setTueren(new Set());
    setAusgezogen(null);
    setAuswahl(null);
  }

  return (
    <div className="raum3d">
      <Canvas
        frameloop="demand"
        dpr={[1, 1.75]}
        camera={{ position: start.pos, fov: 55, near: 0.05, far: 60 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onPointerMissed={() => {
          setAuswahl(null);
          setAusgezogen(null);
        }}
      >
        <Szene r={r} z={zustand} a={aktionen} start={start} kamera={kamera} beschriftungen={beschriftungen} beschriftungsEbene={beschriftungsEbene} />
      </Canvas>

      <div className="label-ebene" ref={beschriftungsEbene} aria-hidden="true">
        {beschriftungen.map((b, i) => (
          <span key={i} className={`label3d ${b.klein ? 'klein' : ''}`}>
            {b.text}
          </span>
        ))}
      </div>

      <div className="raum3d-oben">
        <AnsichtUmschalter aktiv="3d" />
        <div className="raum3d-suche glas">
          <Icon name="suche" size={18} />
          <input
            type="search"
            value={suche}
            placeholder="Im Raum suchen …"
            enterKeyHint="search"
            onChange={(e) => {
              setSuche(e.target.value);
              ersetzeHash(links.raum3d({ q: e.target.value }));
            }}
          />
        </div>
        {trefferOrte.size > 0 && (
          <div className="chips raum3d-treffer">
            {[...trefferOrte].slice(0, 12).map(([id, liste]) => (
              <button key={id} className={`chip ${auswahl === id ? 'aktiv' : ''}`} onClick={() => waehle(id, true)}>
                {orte.get(id)?.name ?? id} <span className="zahl">{liste.length}</span>
              </button>
            ))}
          </div>
        )}
        {suche && !treffer.length && <p className="raum3d-hinweis glas">Nichts gefunden.</p>}
      </div>

      <div className="raum3d-knoepfe">
        <button
          className="icon-btn glas"
          aria-label="Blick von der Tür"
          title="Blick von der Tür"
          onClick={() => setKamera({ nr: Date.now(), pos: start.pos, ziel: start.ziel })}
        >
          <Icon name="wuerfel" />
        </button>
        <button className="icon-btn glas" aria-label="Alles schließen" title="Alles schließen" onClick={alleZu}>
          <Icon name="x" />
        </button>
      </div>

      {auswahl && orte.has(auswahl) && (
        <InfoKarte
          ortId={auswahl}
          treffer={trefferOrte.get(auswahl)}
          onClose={() => {
            setAuswahl(null);
            setAusgezogen(null);
          }}
          onWaehle={(id) => waehle(id, true)}
        />
      )}
    </div>
  );
}

/** Glas-Infokarte unten: Inhalt des gewählten Ortes, Entnehmen/Zurücklegen direkt hier. */
function InfoKarte(p: { ortId: string; treffer?: Gegenstand[]; onClose: () => void; onWaehle: (id: string) => void }) {
  const { orte, proOrt, zaehlung } = useKeller();
  const ort = orte.get(p.ortId)!;
  const items = proOrt.get(p.ortId) ?? [];
  const trefferIds = new Set(p.treffer?.map((g) => g.id));
  // Unterorte zeigen, wenn der Ort selbst keine Ablage ist (Möbel, Tür, Fach mit Einsatz)
  const kinder = ort.ablage ? ort.kinder.filter((k) => orte.get(k)?.zusatzBox) : ort.kinder;

  return (
    <section className="infokarte glas" aria-label={`Inhalt von ${ort.name}`}>
      <header className="infokarte-kopf">
        <div>
          <p className="ort-typ">{TYP_LABEL[ort.typ]}</p>
          <h2>
            {ort.farbe && <span className="farbpunkt" style={{ background: ort.farbe }} />}
            {ort.name}
          </h2>
          <p className="gedimmt klein">{pfadText(orte, p.ortId)}</p>
        </div>
        <button className="icon-btn" onClick={p.onClose} aria-label="Schließen">
          <Icon name="x" />
        </button>
      </header>
      <div className="infokarte-inhalt">
        {kinder.length > 0 && (
          <div className="chips umbrechen">
            {kinder.map((k) => {
              const z = zaehlung(k);
              return (
                <button key={k} className="chip" onClick={() => p.onWaehle(k)}>
                  {orte.get(k)!.name}
                  {z.gesamt > 0 && <span className="zahl">{z.gesamt}</span>}
                </button>
              );
            })}
          </div>
        )}
        {items.length > 0 ? (
          <ul className="gz-liste">
            {items.map((g) => (
              <GegenstandZeile key={g.id} g={g} markiert={trefferIds.has(g.id)} />
            ))}
          </ul>
        ) : (
          ort.ablage && <p className="leer">Leer.</p>
        )}
      </div>
      <div className="leiste">
        <a className="btn" href={links.ort(p.ortId)}>
          <Icon name="liste" size={18} /> Öffnen
        </a>
        {ort.ablage && (
          <a className="btn btn-primaer" href={links.ort(p.ortId, '?neu=1')}>
            <Icon name="plus" size={18} /> Hinzufügen
          </a>
        )}
      </div>
    </section>
  );
}
