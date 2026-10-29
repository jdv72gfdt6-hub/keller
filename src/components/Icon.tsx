// Symbole im Stil von SF Symbols als Inline-SVG (offline, keine Icon-Bibliothek nötig).
// Icon: Linien-Symbole für Leisten und Knöpfe. Symbol: gefüllte Glyphen für die runden Farbkreise.
import type { ReactNode } from 'react';

const PFADE = {
  haus: 'M3 10.5 12 3l9 7.5M5 9v10.5a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9',
  suche: 'M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20.5 20.5l-5-5',
  scan: 'M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3M7 12h10',
  raus: 'M12 15V3.5M7.5 8 12 3.5 16.5 8M4 13v5.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V13',
  rein: 'M12 3.5V15M7.5 10.5 12 15l4.5-4.5M4 13v5.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V13',
  mehr: 'M5.5 12h.01M12 12h.01M18.5 12h.01',
  mehrKreis: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12h.01M12 12h.01M16 12h.01',
  neu: 'M3 6h13M3 12h9M3 18h9M18 13v8M14 17h8',
  plus: 'M12 5v14M5 12h14',
  zurueck: 'M15 19l-7-7 7-7',
  weiter: 'M9 6l6 6-6 6',
  runter: 'M6 9l6 6 6-6',
  hoch: 'M18 15l-6-6-6 6',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2M17 17h.01',
  box: 'M3 7.5 12 3l9 4.5v9L12 21l-9-4.5zM3 7.5l9 4.5 9-4.5M12 12v9',
  stift: 'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4',
  muell: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  kamera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  drucker: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',
  check: 'M5 12l5 5 9-10',
  x: 'M6 6l12 12M18 6L6 18',
  liste: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  speichern: 'M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  wuerfel: 'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5',
  zielkreuz: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v2M12 15v2M7 12h2M15 12h2',
  zu: 'M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7',
  sonne: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
} as const;

/** Punkte brauchen dickere Striche, damit sie sichtbar sind */
const DICK: Partial<Record<IconName, number>> = { mehr: 3.2, mehrKreis: 2 };

export type IconName = keyof typeof PFADE;

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={DICK[name] ?? 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PFADE[name]} />
    </svg>
  );
}

// ---------- Gefüllte Glyphen ----------

const GLYPHEN = {
  regal: (
    <>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.6" />
      <rect x="13" y="13" width="7.5" height="7.5" rx="1.6" />
    </>
  ),
  regalKlein: (
    <>
      <rect x="5" y="3" width="6" height="5" rx="1.2" />
      <rect x="13" y="3" width="6" height="5" rx="1.2" />
      <rect x="5" y="9.5" width="6" height="5" rx="1.2" />
      <rect x="13" y="9.5" width="6" height="5" rx="1.2" />
      <rect x="5" y="16" width="6" height="5" rx="1.2" />
      <rect x="13" y="16" width="6" height="5" rx="1.2" />
    </>
  ),
  schrank: (
    <>
      <rect x="4.5" y="2.5" width="7" height="19" rx="1.6" />
      <rect x="12.5" y="2.5" width="7" height="19" rx="1.6" />
    </>
  ),
  schrankTueren: (
    <>
      <rect x="5" y="2.5" width="14" height="5.6" rx="1.4" />
      <rect x="5" y="9.2" width="14" height="5.6" rx="1.4" />
      <rect x="5" y="15.9" width="14" height="5.6" rx="1.4" />
    </>
  ),
  koffer: (
    <>
      <path d="M9 7.5V5.8A1.3 1.3 0 0 1 10.3 4.5h3.4A1.3 1.3 0 0 1 15 5.8v1.7" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="3" y="7.5" width="18" height="13" rx="2.6" />
    </>
  ),
  wuerfel: (
    <>
      <path d="M12 2.6 20.3 7 12 11.4 3.7 7z" />
      <path d="M3.2 8.1 11.3 12.4v9.1L3.2 17.2z" opacity="0.78" />
      <path d="M20.8 8.1 12.7 12.4v9.1l8.1-4.3z" opacity="0.58" />
    </>
  ),
  archiv: (
    <>
      <rect x="2.5" y="3.5" width="19" height="5" rx="1.5" />
      <path fillRule="evenodd" d="M4 10h16v8.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm5.5 2.8a1 1 0 0 0 0 2h5a1 1 0 0 0 0-2z" />
    </>
  ),
  raus: (
    <>
      <path d="M12 2.5 17 8h-3.2v6.5h-3.6V8H7z" />
      <path d="M3.5 12.5h3V18h11v-5.5h3v6.2a2.3 2.3 0 0 1-2.3 2.3H5.8a2.3 2.3 0 0 1-2.3-2.3z" />
    </>
  ),
  frage: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      d="M8.8 8.6a3.3 3.3 0 0 1 6.4 1.1c0 2.2-3.2 2.8-3.2 4.9M12 18.6h.01"
    />
  ),
  qr: (
    <path
      fillRule="evenodd"
      d="M3 4.5A1.5 1.5 0 0 1 4.5 3h5A1.5 1.5 0 0 1 11 4.5v5A1.5 1.5 0 0 1 9.5 11h-5A1.5 1.5 0 0 1 3 9.5zm3 1.5v2h2V6zM13 4.5A1.5 1.5 0 0 1 14.5 3h5A1.5 1.5 0 0 1 21 4.5v5a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 13 9.5zm3 1.5v2h2V6zM3 14.5A1.5 1.5 0 0 1 4.5 13h5a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 9.5 21h-5A1.5 1.5 0 0 1 3 19.5zm3 1.5v2h2v-2zM13 13h3v3h-3zM18 13h3v3h-3zM13 18h3v3h-3zM18 18h3v3h-3z"
    />
  ),
  stift: <path d="M15.6 3.6a2.6 2.6 0 0 1 3.7 0l1.1 1.1a2.6 2.6 0 0 1 0 3.7L9.2 19.6 3.5 21l1.4-5.7z" />,
  speicher: (
    <>
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3h10.4L20 7.1v11.4a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z" />
      <rect x="8" y="3" width="7" height="5" rx="0.8" opacity="0.45" />
    </>
  ),
  pfeilRein: (
    <>
      <path d="M12 15.5 7 10h3.2V2.5h3.6V10H17z" />
      <path d="M3.5 12.5h3V18h11v-5.5h3v6.2a2.3 2.3 0 0 1-2.3 2.3H5.8a2.3 2.3 0 0 1-2.3-2.3z" />
    </>
  ),
  datei: (
    <path
      fillRule="evenodd"
      d="M6.5 2.5h7l5 5v12a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2zm6.5 1v4.5h4.5zM8 12.5a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2zm0 4a1 1 0 0 0 0 2h5a1 1 0 0 0 0-2z"
    />
  ),
  info: (
    <path
      fillRule="evenodd"
      d="M12 21.5a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19zM12 6.8a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zm-1.2 4.2h2.4v6.5h-2.4z"
    />
  ),
} satisfies Record<string, ReactNode>;

export type GlyphName = keyof typeof GLYPHEN;

/** iOS-Systemfarben (passen sich über CSS-Variablen an Hell/Dunkel an) */
export type SystemFarbe = 'blau' | 'orange' | 'gruen' | 'rot' | 'grau' | 'tuerkis' | 'braun' | 'gelb';

/** Rundes Farbsymbol wie in der Erinnerungen-App: weiße Glyphe auf farbigem Kreis */
export function RundSymbol({ glyph, farbe, size = 32 }: { glyph: GlyphName; farbe: SystemFarbe; size?: number }) {
  return (
    <span className="rund-symbol" style={{ width: size, height: size, background: `var(--${farbe})` }} aria-hidden="true">
      <Symbol glyph={glyph} size={Math.round(size * 0.56)} />
    </span>
  );
}

export function Symbol({ glyph, size = 22 }: { glyph: GlyphName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {GLYPHEN[glyph]}
    </svg>
  );
}
