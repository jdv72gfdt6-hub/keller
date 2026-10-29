// Detailseite eines Ortes (Möbel, Fach, Schublade, Box …): Unterorte, Inhalt, Schnellerfassung.
// Hierher führen auch die QR-Codes.
import { useEffect, useState, type ReactNode } from 'react';
import { useKeller } from '../state/KellerContext';
import { TYP_LABEL, RAUM_ID } from '../config/orte';
import { links, zurueck } from '../router';
import { Icon } from '../components/Icon';
import { Kapsel, KapselKnopf, Menue, Seitenkopf, Sheet, type MenuePunkt } from '../components/Ios';
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
  const [menue, setMenue] = useState(false);
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
        <Seitenkopf titel="Nicht gefunden" zurueck={{ text: 'Mein Keller', onClick: () => zurueck(links.start) }} />
        <p className="leer">
          Diesen Ort gibt es nicht (mehr): <code>{id}</code>
          <br />
          Vielleicht wurde das Möbel umgebaut.
        </p>
      </div>
    );
  }

  const items = proOrt.get(id) ?? [];
  const eltern = ort.parentId && ort.parentId !== RAUM_ID ? orte.get(ort.parentId) : undefined;

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

  const menuePunkte: MenuePunkt[] = [
    { icon: 'qr', text: 'QR-Code & Etikett', onClick: () => setQrOffen(true) },
    { icon: 'wuerfel', text: 'Im Raum zeigen (3D)', href: links.raum3d({ ort: id }) },
  ];
  if (ort.typ === 'moebel') menuePunkte.push({ icon: 'stift', text: 'Möbel bearbeiten', href: `#/einrichtung/moebel/${ort.id}` });
  else menuePunkte.push({ icon: 'stift', text: 'Umbenennen', onClick: umbenennen });
  if (ort.ablage && ort.typ !== 'box') menuePunkte.push({ icon: 'box', text: 'Box hineinstellen', onClick: boxHinzufuegen });
  if (ort.zusatzBox) menuePunkte.push({ icon: 'muell', text: 'Box entfernen', onClick: boxEntfernen, gefahr: true });

  const unter = [TYP_LABEL[ort.typ], ort.name !== ort.standardName ? ort.standardName : '', ort.info ?? ''].filter(Boolean).join(' · ');

  return (
    <div className="seite seite-mit-erfassung">
      <Seitenkopf
        titel={ort.name}
        zurueck={{
          text: eltern?.name ?? (ort.typ === 'frei' ? 'Freie Positionen' : 'Mein Keller'),
          onClick: () => zurueck(eltern ? links.ort(eltern.id) : ort.typ === 'frei' ? links.frei : links.start),
        }}
        aktionen={
          <Kapsel>
            <KapselKnopf icon="qr" label="QR-Code" onClick={() => setQrOffen(true)} />
            <KapselKnopf icon="mehr" label="Mehr" onClick={() => setMenue(true)} />
          </Kapsel>
        }
        unter={
          <p className="gedimmt">
            {ort.farbe && <span className="farbpunkt" style={{ background: ort.farbe }} />}
            {unter}
          </p>
        }
      />

      {ort.typ === 'moebel' && <MoebelBereich moebelId={id} startWahl={query.get('wahl')} />}

      {ort.kinder.length > 0 && (
        <AlsListe ausklappbar={ort.typ === 'moebel'}>
          <ul className="gruppe">
            {ort.kinder.map((kid) => {
              const k = orte.get(kid)!;
              const z = zaehlung(kid);
              const info = [TYP_LABEL[k.typ], k.kinder.length > 0 && k.typ === 'fach' ? orte.get(k.kinder[0])!.name : '']
                .filter(Boolean)
                .join(' · ');
              return (
                <li key={kid}>
                  <a className="zeile zeile-zweizeilig" href={links.ort(kid)}>
                    {k.farbe && <span className="farbpunkt gross" style={{ background: k.farbe }} />}
                    <span className="zeile-text">
                      <span className="zeile-titel">{k.name}</span>
                      <span className="zeile-unter">
                        {info}
                        {z.entnommen > 0 && <span className="text-orange"> · {z.entnommen} entnommen</span>}
                      </span>
                    </span>
                    <span className="zeile-wert">{z.gesamt || ''}</span>
                    <Icon name="weiter" size={18} />
                  </a>
                </li>
              );
            })}
          </ul>
        </AlsListe>
      )}

      {(ort.ablage || items.length > 0) && (
        <>
          <h2 className="gruppe-titel">
            Inhalt <span className="gedimmt">{items.length}</span>
          </h2>
          {items.length ? (
            <ul className="gruppe gz-liste">
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

      {menue && <Menue punkte={menuePunkte} onClose={() => setMenue(false)} />}
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
        <span className="als-liste-pfeil">
          <Icon name="weiter" size={16} />
        </span>
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
    <Sheet titel={name} onClose={onClose} label={`QR-Code für ${name}`}>
      <div className="qr-karte">
        {basis && <QrCode text={ortUrl(basis, ortId)} className="qr-gross" />}
        <p className="gedimmt klein">{ortId}</p>
        <a className="btn btn-primaer breit" href={`${links.etiketten}?ids=${encodeURIComponent(ortId)}`}>
          <Icon name="drucker" size={18} /> Etikett drucken
        </a>
      </div>
    </Sheet>
  );
}
