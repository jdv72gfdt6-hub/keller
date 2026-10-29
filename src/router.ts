// Minimaler Hash-Router: "#/ort/kallax-3x4/r2c3/box" → { pfad: ['ort','kallax-3x4','r2c3','box'] }.
// Hash-URLs funktionieren auf GitHub Pages ohne Server-Konfiguration und offline.
import { useEffect, useState } from 'react';

export interface Route {
  pfad: string[];
  query: URLSearchParams;
}

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const [p, q = ''] = raw.split('?');
  return {
    pfad: p.split('/').filter(Boolean).map(decodeURIComponent),
    query: new URLSearchParams(q),
  };
}

export function useRoute(): Route {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const f = () => setHash(location.hash);
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return parseHash(hash);
}

export function gehe(ziel: string) {
  location.hash = ziel;
}

/** Ersetzt den aktuellen Eintrag (z. B. Suchbegriff), ohne die Zurück-Historie zu füllen. */
export function ersetzeHash(ziel: string) {
  history.replaceState(null, '', ziel);
}

export const links = {
  start: '#/',
  ort: (id: string, extra = '') => `#/ort/${id}${extra}`,
  gegenstand: (id: string) => `#/g/${id}`,
  suche: (q = '') => `#/suche${q ? `?q=${encodeURIComponent(q)}` : ''}`,
  /** Alle Gegenstände (Suchseite ohne Suchbegriff, ohne Tastatur) */
  alle: '#/suche?alle=1',
  frei: '#/frei',
  entnommen: '#/entnommen',
  scan: '#/scan',
  etiketten: '#/etiketten',
  mehr: '#/mehr',
  einrichtung: '#/einrichtung',
  /** 3D-Ansicht, optional mit Ort (Kamera fährt hin) oder Suchbegriff (Treffer leuchten) */
  raum3d: (p: { ort?: string; q?: string } = {}) =>
    p.ort ? `#/3d?ort=${encodeURIComponent(p.ort)}` : p.q ? `#/3d?q=${encodeURIComponent(p.q)}` : '#/3d',
};

/** Zurück in der Historie, sonst Fallback-Ziel. */
export function zurueck(fallback: string) {
  if (history.length > 1) history.back();
  else gehe(fallback);
}
