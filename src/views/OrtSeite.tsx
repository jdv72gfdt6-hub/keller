// Detailseite eines Ortes (Möbel, Fach, Schublade, Box …): Unterorte, Inhalt, Schnellerfassung.
// Hierher führen auch die QR-Codes.
import { useEffect, useState, type ReactNode } from 'react';
import { useKeller } from '../state/KellerContext';
import { pfad, TYP_LABEL, RAUM_ID } from '../config/orte';
import { links, zurueck } from '../router';
import { Icon } from '../components/Icon';
import { GegenstandZeile } from '../components/GegenstandZeile';
import { Schnellerfassung } from '../components/Schnellerfassung';
import { QrCode } from '../components/QrCode';
import { zuletztGenutztMerken } from '../components/OrtWahl';
import { ortUrl, qrBasisLaden } from '../lib/qrBasis';
import { neueId } from '../lib/text';
import { MoebelBereich } from './MoebelBereich';

export function OrtSeite({ id, query }: { id: string; query: URLSearchParams }) {
  const { orte, proOrt, zaehlung, config, configSpeichern, verschieben, zeigeToast } = useKeller();
  const [qrOffen, setQrOffen] = useState(false);
  const ort = orte.get(id);
  const markiert = query.get('g');

  useEffect(() => {
    if (ort?.ablage) zuletztGenutztMerken(id);
  }, [id, ort?.ablage]);

  // Markierten Gegenstand (aus der Suche) ins Bild scrollen
  useEffect(() => {
    if (markiert) document.getElementById(`g-${markiert}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [markiert]);

  if (!ort) {
    return (
      <div className="seite">
        <p className="leer">
          Diesen Ort gibt es nicht (mehr): <code>{id}</code>
          <br />
          Vielleicht wurde das Möbel umgebaut.
        </p>
        <a className="btn" href={links.start}>
          Zur Übersicht
        </a>
      </div>
    );
  }

  const items = proOrt.get(id) ?? [];
  const p = pfad(orte, id);
  const eltern = ort.parentId && ort.parentId !== RAUM_ID ? ort.parentId : null;

  async function umbenennen() {
    const name = prompt(`Neuer Name für „${ort!.name}“ (leer = Standard „${ort!.standardName}“):`, ort!.name);
    if (name === null) return;
    const bezeichnungen = { ...(config.bezeichnungen ?? {}) };
    if (ort!.zusatzBox) {
      if (!name.trim()) return;
      await configSpeichern({ ...config, boxen: (config.boxen ?? []).map((b) => (b.id === id ? { ...b, name: name.trim() } : b)) });
    } else {
      if (name.trim() && name.trim() !== ort!.standardName) bezeichnungen[id] = name.trim();
      else delete bezeichnungen[id];
      await configSpeichern({ ...config, bezeichnungen });
    }
    zeigeToast('Umbenannt');
  }

  async function boxHinzufuegen() {
    const name = prompt('Name der Box (z. B. „Box blau“ oder „Weihnachtsdeko“):', 'Box');
    if (!name?.trim()) return;
    const boxId = `box-${neueId().slice(0, 8)}`;
    await configSpeichern({ ...config, boxen: [...(config.boxen ?? []), { id: boxId, name: name.trim(), in: id }] });
    zeigeToast(`„${name.trim()}“ angelegt`);
  }

  async function boxEntfernen() {
    const ziel = ort!.parentId && orte.get(ort!.parentId)?.ablage ? ort!.parentId : null;
    const frage = items.length
      ? `Box entfernen? Die ${items.length} Gegenstände darin ${ziel ? `kommen nach „${orte.get(ziel)!.name}“` : 'landen unter „Ohne Ort“'}.`
      : 'Box entfernen?';
    if (!confirm(frage)) return;
    if (ziel && items.length) await verschieben(items.map((g) => g.id), ziel);
    await configSpeichern({ ...config, boxen: (config.boxen ?? []).filter((b) => b.id !== id) });
    zeigeToast('Box entfernt');
    location.hash = ort!.parentId && ort!.parentId !== RAUM_ID ? links.ort(ort!.parentId) : links.start;
  }

  return (
    <div className="seite seite-mit-erfassung">
      <nav className="krume" aria-label="Pfad">
        <button className="icon-btn" onClick={() => zurueck(eltern ? links.ort(eltern) : links.start)} aria-label="Zurück">
          <Icon name="zurueck" />
        </button>
        <a href={links.start}>{config.raum.name}</a>
        {p.slice(0, -1).map((o) => (
          <span key={o.id}>
            <span className="krume-trenner">›</span>
            <a href={links.ort(o.id)}>{o.name}</a>
          </span>
        ))}
      </nav>

      <header className="ort-kopf">
        <span className="ort-typ">{TYP_LABEL[ort.typ]}</span>
        <h1>
          {ort.farbe && <span className="farbpunkt gross" style={{ background: ort.farbe }} />}
          {ort.name}
        </h1>
        {ort.name !== ort.standardName && <p className="gedimmt">{ort.standardName}</p>}
        {ort.info && <p className="gedimmt">{ort.info}</p>}
      </header>

      <div className="leiste">
        <button className="btn" onClick={() => setQrOffen(true)}>
          <Icon name="qr" size={18} /> QR
        </button>
        <a className="btn" href={links.raum3d({ ort: id })}>
          <Icon name="wuerfel" size={18} /> 3D
        </a>
        {ort.typ !== 'moebel' && (
          <button className="btn" onClick={umbenennen}>
            <Icon name="stift" size={18} /> Name
          </button>
        )}
        {ort.ablage && ort.typ !== 'box' && (
          <button className="btn" onClick={boxHinzufuegen}>
            <Icon name="box" size={18} /> Box rein
          </button>
        )}
        {ort.zusatzBox && (
          <button className="btn btn-gefahr" onClick={boxEntfernen}>
            <Icon name="muell" size={18} /> Box weg
          </button>
        )}
        {ort.typ === 'moebel' && (
          <a className="btn" href={`#/einrichtung/moebel/${ort.id}`}>
            <Icon name="stift" size={18} /> Bearbeiten
          </a>
        )}
      </div>

      {ort.typ === 'moebel' && <MoebelBereich moebelId={id} startWahl={query.get('wahl')} />}

      {ort.kinder.length > 0 && (
        <AlsListe ausklappbar={ort.typ === 'moebel'}>
          <ul className="karten">
            {ort.kinder.map((kid) => {
              const k = orte.get(kid)!;
              const z = zaehlung(kid);
              return (
                <li key={kid}>
                  <a className="karte" href={links.ort(kid)}>
                    <span className="karte-titel">
                      {k.farbe && <span className="farbpunkt" style={{ background: k.farbe }} />}
                      {k.name}
                    </span>
                    <span className="karte-info">
                      {TYP_LABEL[k.typ]}
                      {k.kinder.length > 0 && k.typ === 'fach' && ` · ${orte.get(k.kinder[0])!.name}`}
                    </span>
                    <span className="karte-zahl">
                      {z.gesamt > 0 ? `${z.gesamt} Ggst.` : 'leer'}
                      {z.entnommen > 0 && <span className="tag tag-orange">{z.entnommen} raus</span>}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </AlsListe>
      )}

      {(ort.ablage || items.length > 0) && (
        <>
          <h2 className="abschnitt">
            Inhalt <span className="gedimmt">({items.length})</span>
          </h2>
          {items.length ? (
            <ul className="gz-liste">
              {items.map((g) => (
                <GegenstandZeile key={g.id} g={g} markiert={g.id === markiert} />
              ))}
            </ul>
          ) : (
            <p className="leer">Noch leer. Unten eintippen und mit Enter hinzufügen.</p>
          )}
        </>
      )}

      {ort.ablage && <Schnellerfassung ortId={id} autoFokus={query.get('neu') === '1'} />}

      {qrOffen && <QrDialog ortId={id} name={ort.name} onClose={() => setQrOffen(false)} />}
    </div>
  );
}

/** Bei Möbeln ist die Fächerliste nur noch Ausweichmöglichkeit unter dem 3D-Modell. */
function AlsListe({ ausklappbar, children }: { ausklappbar: boolean; children: ReactNode }) {
  if (!ausklappbar) return <>{children}</>;
  return (
    <details className="als-liste">
      <summary>
        <Icon name="liste" size={18} /> Als Liste anzeigen
      </summary>
      {children}
    </details>
  );
}

function QrDialog({ ortId, name, onClose }: { ortId: string; name: string; onClose: () => void }) {
  const [basis, setBasis] = useState<string | null>(null);
  useEffect(() => {
    qrBasisLaden().then(setBasis);
  }, []);
  return (
    <div className="overlay overlay-mitte" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="glas qr-karte" onClick={(e) => e.stopPropagation()}>
        <h2>{name}</h2>
        {basis && <QrCode text={ortUrl(basis, ortId)} className="qr-gross" />}
        <p className="gedimmt klein">{ortId}</p>
        <div className="leiste">
          <a className="btn btn-primaer" href={`${links.etiketten}?ids=${encodeURIComponent(ortId)}`}>
            <Icon name="drucker" size={18} /> Etikett drucken
          </a>
          <button className="btn" onClick={onClose}>
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
