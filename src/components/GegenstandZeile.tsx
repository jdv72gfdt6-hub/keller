// Eine Zeile pro Gegenstand: antippen öffnet die Details als Sheet.
// Wischen nach links = entnehmen, nach rechts = zurücklegen; rechts zusätzlich ein kleiner Knopf.
import { useRef, useState, type PointerEvent } from 'react';
import type { Gegenstand } from '../db/db';
import { pfadText } from '../config/orte';
import { links } from '../router';
import { useKeller } from '../state/KellerContext';
import { relativ } from '../lib/text';
import { Icon } from './Icon';

interface Props {
  g: Gegenstand;
  /** Ort mit anzeigen (Suche, Entnommen-Liste) */
  mitOrt?: boolean;
  markiert?: boolean;
  /** Linkziel beim Antippen (Standard: Details des Gegenstands) */
  ziel?: string;
}

/** Ab dieser Strecke löst das Wischen beim Loslassen aus */
const SCHWELLE = 88;

export function GegenstandZeile({ g, mitOrt, markiert, ziel }: Props) {
  const { orte, statusSetzen } = useKeller();
  const entnommen = g.status === 'entnommen';
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number; aktiv: boolean } | null>(null);
  const gewischt = useRef(false);

  const umschalten = () => statusSetzen(g.id, entnommen ? 'vorhanden' : 'entnommen');

  // Nur die sinnvolle Richtung ist möglich: vorhanden → links (raus), entnommen → rechts (zurück)
  const begrenzen = (x: number) => (entnommen ? Math.max(0, x) : Math.min(0, x));

  const wisch = {
    onPointerDown: (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      start.current = { x: e.clientX, y: e.clientY, aktiv: false };
      gewischt.current = false;
    },
    onPointerMove: (e: PointerEvent) => {
      const s = start.current;
      if (!s) return;
      const x = e.clientX - s.x;
      if (!s.aktiv) {
        // erst entscheiden, ob waagerecht gewischt oder senkrecht gescrollt wird
        if (Math.abs(e.clientY - s.y) > 10) return void (start.current = null);
        if (Math.abs(x) < 10) return;
        s.aktiv = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
      gewischt.current = true;
      const v = begrenzen(x);
      // hinter der Schwelle gedämpft weiter
      setDx(Math.abs(v) > SCHWELLE ? Math.sign(v) * (SCHWELLE + (Math.abs(v) - SCHWELLE) * 0.35) : v);
    },
    onPointerUp: () => {
      const s = start.current;
      start.current = null;
      if (s?.aktiv && Math.abs(dx) >= SCHWELLE) {
        navigator.vibrate?.(12);
        umschalten();
      }
      setDx(0);
    },
  };

  const weit = Math.abs(dx) >= SCHWELLE;
  return (
    <li className={`gz ${entnommen ? 'gz-entnommen' : ''} ${markiert ? 'gz-markiert' : ''}`} id={`g-${g.id}`}>
      {/* Aktion hinter der Zeile, wird beim Wischen sichtbar */}
      {dx !== 0 && (
        <div className={`gz-aktion ${entnommen ? 'gz-aktion-zurueck' : 'gz-aktion-raus'} ${weit ? 'weit' : ''}`} aria-hidden="true">
          <Icon name={entnommen ? 'rein' : 'raus'} size={20} />
          <span>{entnommen ? 'Zurückgelegt' : 'Entnommen'}</span>
        </div>
      )}
      <div
        className={`gz-vorne ${dx === 0 ? 'ruhe' : ''}`}
        style={dx ? { transform: `translateX(${dx}px)` } : undefined}
        {...wisch}
        onPointerCancel={wisch.onPointerUp}
      >
        <a
          className="gz-haupt"
          href={ziel ?? links.gegenstand(g.id)}
          draggable={false}
          onClick={(e) => gewischt.current && e.preventDefault()}
        >
          <span className="gz-name">
            {g.menge > 1 && <span className="gz-menge">{g.menge}×</span>}
            {g.name}
            {g.fotoId && (
              <span className="gz-foto" title="Foto vorhanden">
                <Icon name="kamera" size={14} />
              </span>
            )}
          </span>
          {(entnommen || g.kategorie || mitOrt) && (
            <span className="gz-meta">
              {entnommen && <span className="gz-raus">Entnommen {relativ(g.entnommenAm)}</span>}
              {g.kategorie && <span>{g.kategorie}</span>}
              {mitOrt && <span>{pfadText(orte, g.ortId, ' › ')}</span>}
            </span>
          )}
        </a>
        <button
          className={`gz-status ${entnommen ? 'gz-status-zurueck' : ''}`}
          onClick={umschalten}
          aria-label={entnommen ? `${g.name} zurücklegen` : `${g.name} entnehmen`}
        >
          {entnommen ? 'Zurück' : 'Raus'}
        </button>
      </div>
    </li>
  );
}
