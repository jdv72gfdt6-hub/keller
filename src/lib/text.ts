// Hilfsfunktionen für Text, Suche und Datumsanzeige.

/** Eindeutige ID, auch ohne sicheren Kontext (crypto.randomUUID braucht HTTPS). */
export function neueId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto && window.isSecureContext) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/** Lesbare ID aus einem Namen, z. B. "PAX Mitte" → "pax-mitte" */
export function slug(s: string): string {
  return (
    normalisieren(s)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'ort'
  );
}

/**
 * Normalisiert Text für die Suche: Kleinschreibung, Umlaute und ihre Umschreibungen
 * werden gleich behandelt ("Schlüssel" = "schluessel" = "schlussel"), "ß" = "ss".
 */
export function normalisieren(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u');
}

export interface Zeile {
  name: string;
  menge: number;
  kategorie?: string;
}

/**
 * Schnelleingabe einer Zeile:
 *   "Schrauben"            → 1× Schrauben
 *   "3x Schrauben M6"      → 3× Schrauben M6
 *   "3 Glühbirnen #Elektro" → 3× Glühbirnen, Kategorie Elektro
 */
export function parseZeile(zeile: string): Zeile | null {
  let s = zeile.trim();
  if (!s) return null;
  let kategorie: string | undefined;
  const k = /\s*#([^#]+)$/.exec(s);
  if (k) {
    kategorie = k[1].trim();
    s = s.slice(0, k.index).trim();
  }
  let menge = 1;
  const m = /^(\d+)\s*(?:x|×|stk\.?|stück)?\s+(.+)$/i.exec(s);
  if (m) {
    menge = Math.max(1, parseInt(m[1], 10));
    s = m[2].trim();
  }
  if (!s) return null;
  return { name: s, menge, kategorie };
}

const datumsFormat = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
const zeitFormat = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function datum(iso?: string): string {
  return iso ? datumsFormat.format(new Date(iso)) : '–';
}

export function datumZeit(iso?: string): string {
  return iso ? zeitFormat.format(new Date(iso)) : '–';
}

/** "gerade eben", "vor 5 Min.", "gestern", "vor 3 Tagen" … */
export function relativ(iso?: string): string {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'gerade eben';
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`;
  const tage = Math.floor(diff / 86400);
  if (tage === 1) return 'gestern';
  if (tage < 30) return `vor ${tage} Tagen`;
  return `am ${datum(iso)}`;
}

/** Einfacher Hash (djb2) zum Erkennen von Config-Änderungen. */
export function hashText(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
