// Bausteine im iOS-Stil: Navigationsleiste mit großem Titel, Glas-Kapseln, Bottom Sheet, Menü, "+"-Knopf.
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from './Icon';

// ---------- Navigationsleiste mit großem Titel ----------

/** Beobachtet den großen Titel: verschwindet er unter der Leiste, erscheint der kleine Titel in der Leiste. */
export function useGrossTitel() {
  const ref = useRef<HTMLHeadingElement>(null);
  const [kompakt, setKompakt] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setKompakt(!e.isIntersecting), {
      // Leistenhöhe (ohne Safe Area, die liegt über dem Viewport-Rand) abziehen
      rootMargin: '-52px 0px 0px 0px',
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, kompakt] as const;
}

interface KopfProps {
  titel: string;
  /** Zurück-Knopf links (Text = Titel der vorigen Seite) */
  zurueck?: { text: string; onClick: () => void };
  /** Glas-Kapsel rechts */
  aktionen?: ReactNode;
  /** Zeile unter dem großen Titel */
  unter?: ReactNode;
  /** false: Der große Titel steht woanders auf der Seite (dann `kompakt` selbst übergeben) */
  grossTitel?: boolean;
  kompakt?: boolean;
}

export function Seitenkopf({ titel, zurueck, aktionen, unter, grossTitel = true, kompakt }: KopfProps) {
  const [ref, eigenKompakt] = useGrossTitel();
  const klein = kompakt ?? eigenKompakt;
  return (
    <>
      <header className={`navleiste ${klein ? 'kompakt' : ''}`}>
        <div className="navleiste-links">
          {zurueck && (
            <button className="glas glas-knopf zurueck-knopf" onClick={zurueck.onClick} aria-label={`Zurück zu ${zurueck.text}`}>
              <Icon name="zurueck" size={22} />
              <span className="zurueck-text">{zurueck.text}</span>
            </button>
          )}
        </div>
        <div className="navleiste-titel" aria-hidden={!klein}>
          {titel}
        </div>
        <div className="navleiste-rechts">{aktionen}</div>
      </header>
      {grossTitel && (
        <div className="grosstitel-block">
          <h1 className="grosstitel" ref={ref}>
            {titel}
          </h1>
          {unter && <div className="grosstitel-unter">{unter}</div>}
        </div>
      )}
    </>
  );
}

// ---------- Glas-Kapsel mit Symbolknöpfen ----------

export function Kapsel({ children }: { children: ReactNode }) {
  return <div className="glas kapsel">{children}</div>;
}

interface KnopfProps {
  icon: IconName;
  label: string;
  onClick?: () => void;
  href?: string;
}

export function KapselKnopf({ icon, label, onClick, href }: KnopfProps) {
  if (href)
    return (
      <a className="kapsel-knopf" href={href} aria-label={label} title={label}>
        <Icon name={icon} size={23} />
      </a>
    );
  return (
    <button className="kapsel-knopf" onClick={onClick} aria-label={label} title={label}>
      <Icon name={icon} size={23} />
    </button>
  );
}

/** Schwebender runder "+"-Knopf unten rechts (blaues Glas) */
export function PlusKnopf({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button className="plus-knopf" onClick={onClick} aria-label={label} title={label}>
      <Icon name="plus" size={30} />
    </button>
  );
}

// ---------- Bottom Sheet ----------

const SCHLIESS_MS = 260;
let offeneSheets = 0;

interface SheetProps {
  onClose: () => void;
  titel?: string;
  /** Knopf rechts in der Kopfzeile (z. B. Speichern) */
  rechts?: ReactNode;
  /** "gross": fast bildschirmhoch (Listen, Formulare); sonst so hoch wie der Inhalt */
  gross?: boolean;
  children: ReactNode;
  label?: string;
}

/** Glas-Panel, das von unten hochfährt. Schließen: X, Tipp daneben, nach unten ziehen oder Escape. */
export function Sheet({ onClose, titel, rechts, gross, children, label }: SheetProps) {
  const [zu, setZu] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const zug = useRef<{ y: number; dy: number } | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const schliessen = () => {
    if (zu) return;
    setZu(true);
    const reduziert = matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => closeRef.current(), reduziert ? 0 : SCHLIESS_MS);
  };

  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === 'Escape' && schliessen();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  });

  // Seite dahinter nicht mitscrollen (auch bei mehreren Sheets übereinander)
  useEffect(() => {
    if (offeneSheets++ === 0) document.documentElement.classList.add('sheet-offen');
    return () => {
      if (--offeneSheets === 0) document.documentElement.classList.remove('sheet-offen');
    };
  }, []);

  // Nach unten ziehen (am Griff bzw. an der Kopfzeile)
  const ziehen = {
    onPointerDown: (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('button, a, input')) return;
      zug.current = { y: e.clientY, dy: 0 };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: PointerEvent) => {
      if (!zug.current || !panel.current) return;
      zug.current.dy = Math.max(0, e.clientY - zug.current.y);
      panel.current.style.transition = 'none';
      panel.current.style.transform = `translateY(${zug.current.dy}px)`;
    },
    onPointerUp: () => {
      if (!zug.current || !panel.current) return;
      const weit = zug.current.dy > 110;
      zug.current = null;
      panel.current.style.transition = '';
      panel.current.style.transform = '';
      if (weit) schliessen();
    },
  };

  return createPortal(
    <div className={`sheet-ebene ${zu ? 'zu' : ''}`} role="dialog" aria-modal="true" aria-label={label ?? titel}>
      <div className="sheet-hintergrund" onClick={schliessen} />
      <div ref={panel} className={`sheet-panel glas-sheet ${gross ? 'gross' : ''}`}>
        <div className="sheet-kopf" {...ziehen} onPointerCancel={ziehen.onPointerUp}>
          <span className="sheet-griff" aria-hidden="true" />
          <button className="glas glas-knopf rund" onClick={schliessen} aria-label="Schließen">
            <Icon name="x" size={20} />
          </button>
          <h2 className="sheet-titel">{titel}</h2>
          <div className="sheet-rechts">{rechts}</div>
        </div>
        <div className="sheet-inhalt">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

// ---------- Menü (Glas-Popover oben rechts) ----------

export interface MenuePunkt {
  icon: IconName;
  text: string;
  onClick?: () => void;
  href?: string;
  gefahr?: boolean;
}

export function Menue({ punkte, onClose }: { punkte: MenuePunkt[]; onClose: () => void }) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [onClose]);
  return createPortal(
    <div className="menue-ebene" onClick={onClose}>
      <ul className="glas glas-menue" role="menu" onClick={(e) => e.stopPropagation()}>
        {punkte.map((p) => {
          const inhalt = (
            <>
              <span>{p.text}</span>
              <Icon name={p.icon} size={20} />
            </>
          );
          return (
            <li key={p.text} role="none">
              {p.href ? (
                <a role="menuitem" className={p.gefahr ? 'gefahr' : ''} href={p.href} onClick={onClose}>
                  {inhalt}
                </a>
              ) : (
                <button
                  role="menuitem"
                  className={p.gefahr ? 'gefahr' : ''}
                  onClick={() => {
                    onClose();
                    p.onClick?.();
                  }}
                >
                  {inhalt}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>,
    document.body,
  );
}
