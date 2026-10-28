// JSON-Backup: Gegenstände, Fotos und die aktuelle Möbel-Config in einer Datei.
import type { KellerConfig } from '../config/types';
import { blobZuDataUrl, dataUrlZuBlob } from '../lib/dateien';
import { db, type Gegenstand } from './db';

export interface Backup {
  app: 'keller';
  version: 1;
  exportiertAm: string;
  config: KellerConfig;
  gegenstaende: Gegenstand[];
  fotos: { id: string; dataUrl: string }[];
}

export async function backupErstellen(config: KellerConfig): Promise<string> {
  const [gegenstaende, fotos] = await Promise.all([db.alleGegenstaende(), db.alleFotos()]);
  const backup: Backup = {
    app: 'keller',
    version: 1,
    exportiertAm: new Date().toISOString(),
    config,
    gegenstaende,
    fotos: await Promise.all(fotos.map(async (f) => ({ id: f.id, dataUrl: await blobZuDataUrl(f.blob) }))),
  };
  await db.einstellungSetzen('letztesBackup', backup.exportiertAm);
  return JSON.stringify(backup);
}

export function backupPruefen(text: string): Backup {
  let daten: unknown;
  try {
    daten = JSON.parse(text);
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.');
  }
  const b = daten as Partial<Backup>;
  if (b.app !== 'keller' || !Array.isArray(b.gegenstaende)) throw new Error('Das ist keine Keller-Backup-Datei.');
  return { fotos: [], ...b } as Backup;
}

/**
 * Spielt ein Backup ein.
 * - ersetzen = true: alle lokalen Gegenstände und Fotos werden vorher gelöscht.
 * - sonst Zusammenführen: bei gleicher ID gewinnt der neuere Stand.
 */
export async function backupEinspielen(b: Backup, ersetzen: boolean): Promise<{ neu: number; aktualisiert: number }> {
  if (ersetzen) await db.allesLoeschen();
  const vorhanden = new Map((await db.alleGegenstaende()).map((g) => [g.id, g]));
  let neu = 0;
  let aktualisiert = 0;
  const speichern: Gegenstand[] = [];
  for (const g of b.gegenstaende) {
    const lokal = vorhanden.get(g.id);
    if (!lokal) neu++;
    else if (lokal.geaendertAm < g.geaendertAm) aktualisiert++;
    else continue;
    speichern.push(g);
  }
  await db.speichern(...speichern);
  const benoetigt = new Set(speichern.map((g) => g.fotoId).filter(Boolean));
  for (const f of b.fotos) {
    if (benoetigt.has(f.id)) await db.fotoSpeichern(f.id, await dataUrlZuBlob(f.dataUrl));
  }
  return { neu, aktualisiert };
}

export function configPruefen(text: string): KellerConfig {
  let c: Partial<KellerConfig>;
  try {
    c = JSON.parse(text);
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.');
  }
  // Auch ein Backup enthält eine Config – dann diese verwenden.
  if ((c as Partial<Backup>).app === 'keller') c = (c as Backup).config;
  if (!c?.raum || !Array.isArray(c.moebel)) throw new Error('Keine gültige Keller-Config (raum/moebel fehlt).');
  return { freie_positionen: [], ...c } as KellerConfig;
}
