// Gemeinsame Suchlogik für die Suchseite und das Hervorheben in der 3D-Ansicht.
import type { Gegenstand, Status } from '../db/db';
import { pfadText, type Ort } from '../config/orte';
import { normalisieren } from './text';

export function suchTokens(q: string): string[] {
  return normalisieren(q).split(/\s+/).filter(Boolean);
}

/** Normalisierte Pfadtexte aller Orte (für Suche nach "kallax box grau" usw.) */
export function ortTexte(orte: Map<string, Ort>): Map<string, string> {
  const m = new Map<string, string>();
  for (const o of orte.values()) m.set(o.id, normalisieren(pfadText(orte, o.id, ' ')));
  return m;
}

/**
 * Gegenstände, die alle Suchbegriffe enthalten (Name, Kategorie, Notiz oder Ort).
 * Sortiert nach Relevanz: Treffer am Namensanfang zuerst.
 */
export function sucheGegenstaende(
  gegenstaende: Gegenstand[],
  texte: Map<string, string>,
  tokens: string[],
  status?: Status,
): Gegenstand[] {
  if (!tokens.length) return [];
  return gegenstaende
    .filter((g) => !status || g.status === status)
    .map((g) => {
      const name = normalisieren(g.name);
      const rest = `${normalisieren(g.kategorie)} ${normalisieren(g.notiz)} ${texte.get(g.ortId) ?? ''}`;
      let score = 0;
      for (const t of tokens) {
        if (name.startsWith(t)) score += 4;
        else if (name.includes(t)) score += 3;
        else if (rest.includes(t)) score += 1;
        else return null;
      }
      return { g, score };
    })
    .filter((x) => x !== null)
    .sort((a, b) => b.score - a.score || a.g.name.localeCompare(b.g.name, 'de'))
    .map((x) => x.g);
}
