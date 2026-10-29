// Oberer Teil der Möbelseite: das Möbel in 3D zum Antippen, darunter der Inhalt des gewählten
// Fachs/der Box/Schublade mit Entnehmen/Zurücklegen und Schnellerfassung.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useKeller } from '../state/KellerContext';
import { pfad, TYP_LABEL } from '../config/orte';
import { layoutRaum } from '../raum3d/layout';
import type { SzenenAktionen, SzenenZustand } from '../raum3d/Szene';
import { ersetzeHash, links } from '../router';
import { Icon } from '../components/Icon';
import { GegenstandZeile } from '../components/GegenstandZeile';
import { Schnellerfassung } from '../components/Schnellerfassung';

const MoebelModell = lazy(() => import('../raum3d/MoebelModell'));

export function MoebelBereich({ moebelId, startWahl }: { moebelId: string; startWahl: string | null }) {
  const { config, orte, proOrt, zaehlung } = useKeller();
  const r = useMemo(() => layoutRaum(config, orte), [config, orte]);
  const m3d = r.moebel.find((m) => m.m.id === moebelId);

  const [auswahl, setAuswahl] = useState<string | null>(() => (startWahl && r.index.has(startWahl) ? startWahl : null));
  // Drehtüren stehen in dieser Ansicht offen, damit alles direkt antippbar ist
  const [tueren, setTueren] = useState<Set<string>>(() => new Set(m3d?.drehtueren.map((t) => t.id)));

  /** Auswahl merken (auch in der Adresse, damit "Zurück" von einem Gegenstand hierher passt) */
  const setze = (id: string | null) => {
    setAuswahl(id);
    ersetzeHash(links.ort(moebelId, id ? `?wahl=${id}` : ''));
  };

  const aktionen: SzenenAktionen = {
    waehle: (id) => {
      // Korpus oder erneutes Antippen → Auswahl aufheben (Box fährt wieder hinein)
      if (id === moebelId || id === auswahl) return setze(null);
      const h = r.index.get(id)?.e.huelle;
      if (h?.art === 'dreh') setTueren((alt) => new Set(alt).add(h.tuerId));
      setze(id);
    },
    drehtuer: (id) =>
      setTueren((alt) => {
        const neu = new Set(alt);
        if (neu.has(id)) neu.delete(id);
        else neu.add(id);
        return neu;
      }),
    schiebe: () => undefined,
  };

  // Nach dem Antippen so weit scrollen, dass der Inhalt über der Schnellerfassung sichtbar ist
  const bereich = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!auswahl) return;
    const id = requestAnimationFrame(() => {
      const el = bereich.current;
      if (!el) return;
      const ziel = window.innerHeight - 420; // Platz für Kopf der Auswahl + Erfassung + Navigation
      const oben = el.getBoundingClientRect().top;
      if (oben > ziel) window.scrollBy({ top: oben - ziel, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [auswahl]);

  const e = auswahl ? r.index.get(auswahl)?.e : undefined;
  const zustand: SzenenZustand = useMemo(() => {
    const mitInhalt = new Set<string>();
    for (const [id, liste] of proOrt) if (liste.length) mitInhalt.add(id);
    return {
      auswahl,
      ausgezogen: e && e.auszug > 0 ? (e.mit ?? e.ortId) : null,
      schiebeOffen: moebelId,
      tueren,
      hervor: new Set(),
      mitInhalt,
      freiInhalt: new Map(),
      flaechenZeigen: true,
    };
  }, [auswahl, e, moebelId, tueren, proOrt]);

  if (!m3d) return null;

  const ort = auswahl ? orte.get(auswahl) : undefined;
  const items = auswahl ? (proOrt.get(auswahl) ?? []) : [];
  const z = zaehlung(moebelId);

  return (
    <>
      <Suspense fallback={<div className="moebel3d moebel3d-laden">Lade 3D …</div>}>
        <MoebelModell m3d={m3d} z={zustand} a={aktionen} onLeer={() => setze(null)} />
      </Suspense>

      {ort ? (
        <section className="auswahl" aria-live="polite" ref={bereich}>
          <header className="auswahl-kopf">
            <div>
              <p className="auswahl-typ">{TYP_LABEL[ort.typ]}</p>
              <h2>
                {ort.farbe && <span className="farbpunkt" style={{ background: ort.farbe }} />}
                {ort.name}
              </h2>
              {/* Pfad innerhalb des Möbels, z. B. "Reihe 2, Spalte 3" */}
              <p className="gedimmt klein">
                {pfad(orte, ort.id)
                  .slice(1, -1)
                  .map((o) => o.name)
                  .join(' · ') || ort.standardName}
              </p>
            </div>
            <a className="glas glas-knopf rund" href={links.ort(ort.id)} aria-label={`${ort.name} öffnen`}>
              <Icon name="weiter" size={20} />
            </a>
          </header>
          {items.length ? (
            <ul className="gruppe gz-liste">
              {items.map((g) => (
                <GegenstandZeile key={g.id} g={g} />
              ))}
            </ul>
          ) : (
            <p className="leer">Noch leer. Unten eintippen und mit Enter hinzufügen.</p>
          )}
          {ort.ablage && <Schnellerfassung key={ort.id} ortId={ort.id} />}
        </section>
      ) : (
        <p className="gedimmt zentriert klein auswahl-hinweis">
          Tippe auf eine Box, Schublade oder ein Fach. {z.gesamt > 0 && `${z.gesamt} Gegenstände in diesem Möbel.`}
        </p>
      )}
    </>
  );
}
