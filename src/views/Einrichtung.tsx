// Raum, Möbel und freie Positionen in der App bearbeiten.
// Änderungen landen im App-Overlay der Config; unter "Mehr" lässt sich daraus eine neue keller.config.json laden.
import { useState, type ReactNode } from 'react';
import { useKeller } from '../state/KellerContext';
import type { FreiePosition, KallaxMoebel, KellerConfig, Moebel, MoebelTyp, PaxMoebel, PaxSegment, SchrankMoebel, Wand } from '../config/types';
import { buildOrte, parseKallaxZelle, farbName } from '../config/orte';
import { gehe, links, zurueck } from '../router';
import { slug } from '../lib/text';
import { Icon } from '../components/Icon';

const TYP_NAMEN: Record<MoebelTyp, string> = { kallax: 'Kallax-Regal', pax: 'PAX-Schrank', schrank: 'Schrank mit Drehtüren' };
const WAENDE: Wand[] = ['links', 'rechts', 'hinten', 'vorne'];
const ZELLEN = ['offen', 'box-grau', 'box-weiss', 'box-schwarz', 'box-beige', 'schubladeneinsatz-2', 'schubladeneinsatz-3'];
const SEGMENTE: { typ: PaxSegment['typ']; name: string }[] = [
  { typ: 'schublade', name: 'Schublade' },
  { typ: 'drahtkorb', name: 'Drahtkorb' },
  { typ: 'boden', name: 'Boden' },
  { typ: 'kleiderstange', name: 'Kleiderstange' },
];

function zellenName(z: string): string {
  const b = parseKallaxZelle(z);
  if (b.art === 'box') return `Box ${farbName(b.farbe)}`;
  if (b.art === 'schubladen') return `${b.anzahl} Schubladen`;
  return 'offen';
}

/** Speichert eine neue Config und warnt, wenn Gegenstände dadurch ihren Ort verlieren. */
function useSpeichern() {
  const { orte, gegenstaende, configSpeichern, zeigeToast } = useKeller();
  return async (neu: KellerConfig): Promise<boolean> => {
    const neueOrte = buildOrte(neu);
    const verloren = gegenstaende.filter((g) => orte.has(g.ortId) && !neueOrte.has(g.ortId));
    if (verloren.length && !confirm(`${verloren.length} Gegenstände verlieren dadurch ihren Ort und erscheinen unter „Ohne Ort“. Trotzdem speichern?`))
      return false;
    await configSpeichern(neu);
    zeigeToast('Gespeichert');
    return true;
  };
}

export function Einrichtung({ pfad, query }: { pfad: string[]; query: URLSearchParams }) {
  const [art, id] = pfad;
  if (art === 'raum') return <RaumEditor />;
  if (art === 'moebel') return <MoebelEditor id={id} neuTyp={query.get('neu') as MoebelTyp | null} />;
  if (art === 'frei') return <FreiEditor id={id} />;
  return <EinrichtungListe />;
}

function Kopf({ titel, zurueckZu }: { titel: string; zurueckZu: string }) {
  return (
    <nav className="krume">
      <button className="icon-btn" onClick={() => zurueck(zurueckZu)} aria-label="Zurück">
        <Icon name="zurueck" />
      </button>
      <span>{titel}</span>
    </nav>
  );
}

function EinrichtungListe() {
  const { config } = useKeller();
  return (
    <div className="seite">
      <Kopf titel="Mehr" zurueckZu={links.mehr} />
      <h1>Raum & Möbel</h1>
      <ul className="menue">
        <li>
          <a href="#/einrichtung/raum">
            <Icon name="wuerfel" /> {config.raum.name}
            <span className="rechts gedimmt klein">
              {config.raum.laenge} × {config.raum.breite} × {config.raum.hoehe} cm
            </span>
          </a>
        </li>
      </ul>
      <h2 className="abschnitt">Möbel</h2>
      <ul className="menue">
        {config.moebel.map((m) => (
          <li key={m.id}>
            <a href={`#/einrichtung/moebel/${m.id}`}>
              <Icon name="box" /> {m.name}
              <span className="rechts gedimmt klein">
                {m.wand}, x = {m.x}
              </span>
            </a>
          </li>
        ))}
      </ul>
      <div className="leiste">
        {(Object.keys(TYP_NAMEN) as MoebelTyp[]).map((t) => (
          <a key={t} className="btn" href={`#/einrichtung/moebel/neu?neu=${t}`}>
            <Icon name="plus" size={16} /> {TYP_NAMEN[t]}
          </a>
        ))}
      </div>
      <h2 className="abschnitt">Freie Positionen</h2>
      <ul className="menue">
        {config.freie_positionen.map((f) => (
          <li key={f.id}>
            <a href={`#/einrichtung/frei/${f.id}`}>
              <Icon name="box" /> {f.name}
              <span className="rechts gedimmt klein">{f.ort}</span>
            </a>
          </li>
        ))}
      </ul>
      <a className="btn" href="#/einrichtung/frei/neu">
        <Icon name="plus" size={16} /> Freie Position
      </a>
    </div>
  );
}

// ---------- Eingabe-Bausteine ----------

function Feld({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label>
      {label}
      {children}
    </label>
  );
}

function Zahl({ label, wert, setze, min = 0 }: { label: string; wert: number | undefined; setze: (n: number) => void; min?: number }) {
  return (
    <Feld label={label}>
      <input type="number" inputMode="decimal" min={min} value={wert ?? ''} onChange={(e) => setze(Number(e.target.value))} />
    </Feld>
  );
}

// ---------- Raum ----------

function RaumEditor() {
  const { config } = useKeller();
  const speichern = useSpeichern();
  const [raum, setRaum] = useState(config.raum);
  return (
    <div className="seite">
      <Kopf titel="Raum & Möbel" zurueckZu={links.einrichtung} />
      <h1>Raum</h1>
      <div className="formular">
        <Feld label="Name">
          <input value={raum.name} onChange={(e) => setRaum({ ...raum, name: e.target.value })} />
        </Feld>
        <div className="formular-reihe">
          <Zahl label="Länge (x) cm" wert={raum.laenge} setze={(n) => setRaum({ ...raum, laenge: n })} />
          <Zahl label="Breite (y) cm" wert={raum.breite} setze={(n) => setRaum({ ...raum, breite: n })} />
          <Zahl label="Höhe cm" wert={raum.hoehe} setze={(n) => setRaum({ ...raum, hoehe: n })} />
        </div>
        <button
          className="btn btn-primaer breit"
          onClick={async () => (await speichern({ ...config, raum })) && gehe(links.einrichtung)}
        >
          <Icon name="speichern" size={18} /> Speichern
        </button>
      </div>
    </div>
  );
}

// ---------- Möbel ----------

function neuesMoebel(typ: MoebelTyp): Moebel {
  const basis = { name: '', wand: 'rechts' as Wand, x: 0, breite: 80, tiefe: 40, hoehe: 200 };
  const id = '';
  const name = TYP_NAMEN[typ];
  if (typ === 'kallax')
    return { ...basis, id, name, typ, breite: 77, tiefe: 39, hoehe: 77, spalten: 2, reihen: 2, fach_innenmass: 33, belegung_oben_nach_unten: [['offen', 'offen'], ['offen', 'offen']] };
  if (typ === 'pax')
    return { ...basis, id, name, typ, breite: 75, tiefe: 58, hoehe: 201, einteilung_von_unten: [{ typ: 'boden' }, { typ: 'kleiderstange' }] };
  return { ...basis, id, name, typ, tueren: { art: 'drehtuer', anzahl: 2, anordnung: 'übereinander' }, faecher: 4 };
}

function MoebelEditor({ id, neuTyp }: { id: string; neuTyp: MoebelTyp | null }) {
  const { config, gegenstaende, orte } = useKeller();
  const speichern = useSpeichern();
  const istNeu = id === 'neu';
  const vorhanden = config.moebel.find((m) => m.id === id);
  const [m, setM] = useState<Moebel | null>(() =>
    istNeu ? neuesMoebel(neuTyp ?? 'kallax') : vorhanden ? structuredClone(vorhanden) : null,
  );
  if (!m) return <div className="seite"><p className="leer">Möbel nicht gefunden.</p></div>;

  const setze = (patch: Partial<Moebel>) => setM({ ...m, ...patch } as Moebel);
  const laenge = m.wand === 'links' || m.wand === 'rechts' ? config.raum.laenge : config.raum.breite;
  const zuLang = m.x + m.breite > laenge;

  async function sichern() {
    let neu = m!;
    if (istNeu) {
      // ID aus dem Namen ableiten; sie bleibt danach fest, damit QR-Codes gültig bleiben.
      const belegt = (x: string) => config.moebel.some((y) => y.id === x) || config.freie_positionen.some((y) => y.id === x);
      let nid = slug(m!.name);
      for (let i = 2; belegt(nid); i++) nid = `${slug(m!.name)}-${i}`;
      neu = { ...m!, id: nid };
    }
    const liste = istNeu ? [...config.moebel, neu] : config.moebel.map((x) => (x.id === id ? neu : x));
    if (await speichern({ ...config, moebel: liste })) gehe(links.einrichtung);
  }

  async function entfernen() {
    const anzahl = gegenstaende.filter((g) => orte.get(g.ortId)?.moebelId === id).length;
    if (!confirm(`„${m!.name}“ entfernen?${anzahl ? ` ${anzahl} Gegenstände darin landen unter „Ohne Ort“.` : ''}`)) return;
    await speichern({ ...config, moebel: config.moebel.filter((x) => x.id !== id), boxen: (config.boxen ?? []).filter((b) => !b.in.startsWith(`${id}/`)) });
    gehe(links.einrichtung);
  }

  return (
    <div className="seite">
      <Kopf titel="Raum & Möbel" zurueckZu={links.einrichtung} />
      <p className="ort-typ">{TYP_NAMEN[m.typ]}</p>
      <h1>{m.name || 'Ohne Namen'}</h1>
      <div className="formular">
        <Feld label="Name">
          <input value={m.name} onChange={(e) => setze({ name: e.target.value })} />
        </Feld>
        <div className="formular-reihe">
          <Feld label="Wand">
            <select value={m.wand} onChange={(e) => setze({ wand: e.target.value as Wand })}>
              {WAENDE.map((w) => (
                <option key={w}>{w}</option>
              ))}
            </select>
          </Feld>
          <Zahl label="Start x (cm)" wert={m.x} setze={(n) => setze({ x: n })} />
        </div>
        <div className="formular-reihe">
          <Zahl label="Breite" wert={m.breite} setze={(n) => setze({ breite: n })} />
          <Zahl label="Tiefe" wert={m.tiefe} setze={(n) => setze({ tiefe: n })} />
          <Zahl label="Höhe" wert={m.hoehe} setze={(n) => setze({ hoehe: n })} />
        </div>
        {zuLang && <p className="warnung klein">Achtung: x + Breite ({m.x + m.breite} cm) ist länger als die Wand ({laenge} cm).</p>}

        {m.typ === 'kallax' && <KallaxTeil m={m} setM={setM} />}
        {m.typ === 'pax' && <PaxTeil m={m} setM={setM} />}
        {m.typ === 'schrank' && <SchrankTeil m={m} setM={setM} />}

        <button className="btn btn-primaer breit" onClick={sichern} disabled={!m.name.trim()}>
          <Icon name="speichern" size={18} /> {istNeu ? 'Anlegen' : 'Speichern'}
        </button>
        {!istNeu && (
          <button className="btn btn-gefahr breit" onClick={entfernen}>
            <Icon name="muell" size={18} /> Möbel entfernen
          </button>
        )}
      </div>
    </div>
  );
}

function KallaxTeil({ m, setM }: { m: KallaxMoebel; setM: (m: Moebel) => void }) {
  // Raster an neue Spalten/Reihen anpassen, vorhandene Belegung bleibt erhalten.
  const raster = (reihen: number, spalten: number) =>
    Array.from({ length: reihen }, (_, r) => Array.from({ length: spalten }, (_, c) => m.belegung_oben_nach_unten[r]?.[c] ?? 'offen'));
  const setGroesse = (reihen: number, spalten: number) => {
    reihen = Math.max(1, Math.min(8, reihen || 1));
    spalten = Math.max(1, Math.min(8, spalten || 1));
    setM({ ...m, reihen, spalten, belegung_oben_nach_unten: raster(reihen, spalten) });
  };
  const setZelle = (r: number, c: number, wert: string) => {
    const b = raster(m.reihen, m.spalten);
    b[r][c] = wert;
    setM({ ...m, belegung_oben_nach_unten: b });
  };
  return (
    <>
      <div className="formular-reihe">
        <Zahl label="Spalten" min={1} wert={m.spalten} setze={(n) => setGroesse(m.reihen, n)} />
        <Zahl label="Reihen" min={1} wert={m.reihen} setze={(n) => setGroesse(n, m.spalten)} />
      </div>
      <p className="klein gedimmt">Belegung (oben → unten). Achtung: Wird eine Box zu „offen“, verlieren ihre Gegenstände den Ort.</p>
      <div className="kallax-raster" style={{ gridTemplateColumns: `repeat(${m.spalten}, 1fr)` }}>
        {raster(m.reihen, m.spalten).map((reihe, r) =>
          reihe.map((zelle, c) => (
            <select key={`${r}-${c}`} value={zelle} onChange={(e) => setZelle(r, c, e.target.value)} aria-label={`Reihe ${r + 1}, Spalte ${c + 1}`}>
              {[...new Set([zelle, ...ZELLEN])].map((z) => (
                <option key={z} value={z}>
                  {zellenName(z)}
                </option>
              ))}
            </select>
          )),
        )}
      </div>
    </>
  );
}

function PaxTeil({ m, setM }: { m: PaxMoebel; setM: (m: Moebel) => void }) {
  const segs = m.einteilung_von_unten;
  const setSegs = (s: PaxSegment[]) => setM({ ...m, einteilung_von_unten: s });
  const tausche = (i: number, j: number) => {
    if (j < 0 || j >= segs.length) return;
    const s = [...segs];
    [s[i], s[j]] = [s[j], s[i]];
    setSegs(s);
  };
  // Anzeige von oben nach unten, gespeichert wird von unten nach oben.
  const vonOben = segs.map((s, i) => ({ s, i })).reverse();
  return (
    <>
      <p className="klein gedimmt">Einteilung (oben → unten)</p>
      <ul className="segmente">
        {vonOben.map(({ s, i }) => (
          <li key={i} className="segment">
            <select value={s.typ} onChange={(e) => setSegs(segs.map((x, k) => (k === i ? { ...x, typ: e.target.value as PaxSegment['typ'] } : x)))}>
              {SEGMENTE.map((t) => (
                <option key={t.typ} value={t.typ}>
                  {t.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              className="anzahl"
              value={s.anzahl ?? 1}
              aria-label="Anzahl"
              onChange={(e) => setSegs(segs.map((x, k) => (k === i ? { ...x, anzahl: Math.max(1, Number(e.target.value)) } : x)))}
            />
            <button className="icon-btn" onClick={() => tausche(i, i + 1)} aria-label="Nach oben">
              <Icon name="hoch" size={18} />
            </button>
            <button className="icon-btn" onClick={() => tausche(i, i - 1)} aria-label="Nach unten">
              <Icon name="runter" size={18} />
            </button>
            <button className="icon-btn" onClick={() => setSegs(segs.filter((_, k) => k !== i))} aria-label="Entfernen">
              <Icon name="x" size={18} />
            </button>
          </li>
        ))}
      </ul>
      <button className="btn" onClick={() => setSegs([...segs, { typ: 'boden' }])}>
        <Icon name="plus" size={16} /> Oben hinzufügen
      </button>
    </>
  );
}

function SchrankTeil({ m, setM }: { m: SchrankMoebel; setM: (m: Moebel) => void }) {
  const verteilung = m.tueren.faecher_je_tuer_von_unten ?? [];
  const summe = verteilung.reduce((a, b) => a + b, 0);
  const [text, setText] = useState(verteilung.join(', '));
  return (
    <>
      <div className="formular-reihe">
        <Zahl label="Fächer" min={1} wert={m.faecher} setze={(n) => setM({ ...m, faecher: Math.max(1, n) })} />
        <Zahl label="Türen" wert={m.tueren.anzahl} setze={(n) => setM({ ...m, tueren: { ...m.tueren, anzahl: Math.max(0, n) } })} />
      </div>
      <Feld label="Fächer je Tür, von unten (z. B. 2, 2, 1)">
        <input
          value={text}
          inputMode="numeric"
          onChange={(e) => {
            setText(e.target.value);
            const zahlen = e.target.value.split(/[,\s]+/).filter(Boolean).map(Number).filter((n) => n > 0);
            setM({ ...m, tueren: { ...m.tueren, faecher_je_tuer_von_unten: zahlen.length ? zahlen : undefined } });
          }}
        />
      </Feld>
      {verteilung.length > 0 && (verteilung.length !== m.tueren.anzahl || summe !== m.faecher) && (
        <p className="warnung klein">
          Passt nicht: {verteilung.length} Werte für {m.tueren.anzahl} Türen, Summe {summe} statt {m.faecher} Fächer. Dann wird gleichmäßig verteilt.
        </p>
      )}
      <Feld label="Optik">
        <input value={m.optik ?? ''} onChange={(e) => setM({ ...m, optik: e.target.value || undefined })} />
      </Feld>
    </>
  );
}

// ---------- Freie Positionen ----------

function FreiEditor({ id }: { id: string }) {
  const { config, proOrt } = useKeller();
  const speichern = useSpeichern();
  const istNeu = id === 'neu';
  const [f, setF] = useState<FreiePosition | null>(() => {
    if (istNeu) return { id: '', name: '', ort: '' };
    const v = config.freie_positionen.find((x) => x.id === id);
    return v ? structuredClone(v) : null;
  });
  if (!f) return <div className="seite"><p className="leer">Position nicht gefunden.</p></div>;

  async function sichern() {
    let neu = f!;
    if (istNeu) {
      let nid = slug(f!.name);
      for (let i = 2; config.freie_positionen.some((x) => x.id === nid) || config.moebel.some((x) => x.id === nid); i++) nid = `${slug(f!.name)}-${i}`;
      neu = { ...f!, id: nid };
    }
    const liste = istNeu ? [...config.freie_positionen, neu] : config.freie_positionen.map((x) => (x.id === id ? neu : x));
    if (await speichern({ ...config, freie_positionen: liste })) gehe(links.einrichtung);
  }

  async function entfernen() {
    const n = proOrt.get(id)?.length ?? 0;
    if (!confirm(`„${f!.name}“ entfernen?${n ? ` ${n} Gegenstände landen unter „Ohne Ort“.` : ''}`)) return;
    await speichern({ ...config, freie_positionen: config.freie_positionen.filter((x) => x.id !== id) });
    gehe(links.einrichtung);
  }

  return (
    <div className="seite">
      <Kopf titel="Raum & Möbel" zurueckZu={links.einrichtung} />
      <p className="ort-typ">Freie Position</p>
      <h1>{f.name || 'Neue Position'}</h1>
      <div className="formular">
        <Feld label="Name">
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Feld>
        <Feld label="Wo ist das?">
          <input value={f.ort ?? ''} onChange={(e) => setF({ ...f, ort: e.target.value })} placeholder="z. B. oben auf dem Kallax" />
        </Feld>
        <div className="formular-reihe">
          <Zahl label="x (cm, optional)" wert={f.x} setze={(n) => setF({ ...f, x: n })} />
          <Zahl label="y (cm, optional)" wert={f.y} setze={(n) => setF({ ...f, y: n })} />
        </div>
        <button className="btn btn-primaer breit" onClick={sichern} disabled={!f.name.trim()}>
          <Icon name="speichern" size={18} /> {istNeu ? 'Anlegen' : 'Speichern'}
        </button>
        {!istNeu && (
          <button className="btn btn-gefahr breit" onClick={entfernen}>
            <Icon name="muell" size={18} /> Entfernen
          </button>
        )}
      </div>
    </div>
  );
}
