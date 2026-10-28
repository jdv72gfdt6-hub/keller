// Lokale Datenhaltung in IndexedDB (bleibt auf dem Gerät, funktioniert offline).
import { openDB, type DBSchema } from 'idb';

export type Status = 'vorhanden' | 'entnommen';

export interface Gegenstand {
  id: string;
  name: string;
  menge: number;
  kategorie: string;
  notiz: string;
  fotoId?: string;
  status: Status;
  /** Orts-ID aus der Config (Fach, Schublade, Box, freie Position …) */
  ortId: string;
  entnommenAm?: string;
  zurueckgelegtAm?: string;
  erstelltAm: string;
  geaendertAm: string;
}

export interface Foto {
  id: string;
  blob: Blob;
}

interface KellerDB extends DBSchema {
  gegenstaende: { key: string; value: Gegenstand; indexes: { ortId: string } };
  fotos: { key: string; value: Foto };
  einstellungen: { key: string; value: unknown };
}

const dbPromise = openDB<KellerDB>('keller', 1, {
  upgrade(db) {
    const g = db.createObjectStore('gegenstaende', { keyPath: 'id' });
    g.createIndex('ortId', 'ortId');
    db.createObjectStore('fotos', { keyPath: 'id' });
    db.createObjectStore('einstellungen');
  },
});

export const db = {
  async alleGegenstaende(): Promise<Gegenstand[]> {
    return (await dbPromise).getAll('gegenstaende');
  },
  async speichern(...liste: Gegenstand[]): Promise<void> {
    const tx = (await dbPromise).transaction('gegenstaende', 'readwrite');
    await Promise.all([...liste.map((g) => tx.store.put(g)), tx.done]);
  },
  async loeschen(id: string): Promise<void> {
    await (await dbPromise).delete('gegenstaende', id);
  },
  async allesLoeschen(): Promise<void> {
    const d = await dbPromise;
    await d.clear('gegenstaende');
    await d.clear('fotos');
  },

  async foto(id: string): Promise<Blob | undefined> {
    return (await (await dbPromise).get('fotos', id))?.blob;
  },
  async alleFotos(): Promise<Foto[]> {
    return (await dbPromise).getAll('fotos');
  },
  async fotoSpeichern(id: string, blob: Blob): Promise<void> {
    await (await dbPromise).put('fotos', { id, blob });
  },
  async fotoLoeschen(id: string): Promise<void> {
    await (await dbPromise).delete('fotos', id);
  },

  async einstellung<T>(key: string): Promise<T | undefined> {
    return (await (await dbPromise).get('einstellungen', key)) as T | undefined;
  },
  async einstellungSetzen(key: string, value: unknown): Promise<void> {
    await (await dbPromise).put('einstellungen', value, key);
  },
  async einstellungLoeschen(key: string): Promise<void> {
    await (await dbPromise).delete('einstellungen', key);
  },
};
