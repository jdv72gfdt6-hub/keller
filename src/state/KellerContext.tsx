// Zentraler App-Zustand: wirksame Config (Datei + App-Overlay), abgeleitete Orte und alle Gegenstände.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import basisJson from '../../keller.config.json';
import type { KellerConfig } from '../config/types';
import { buildOrte, OHNE_ORT_ID, type Ort } from '../config/orte';
import { db, type Gegenstand, type Status } from '../db/db';
import { hashText, neueId } from '../lib/text';

/** Config aus keller.config.json (wird beim Build eingebunden). */
export const BASIS_CONFIG = basisJson as unknown as KellerConfig;
const BASIS_HASH = hashText(JSON.stringify(BASIS_CONFIG));

/** In der App bearbeitete Config, gespeichert in IndexedDB. */
interface Overlay {
  /** Hash der Datei, auf der die App-Änderungen beruhen */
  basisHash: string;
  config: KellerConfig;
  geaendertAm: string;
}

export interface Toast {
  id: number;
  text: string;
  rueckgaengig?: () => void;
}

export type NeuerGegenstand = Partial<Omit<Gegenstand, 'id' | 'ortId'>> & { name: string };

export interface Zaehlung {
  gesamt: number;
  entnommen: number;
}

interface KellerCtx {
  geladen: boolean;
  config: KellerConfig;
  orte: Map<string, Ort>;
  gegenstaende: Gegenstand[];
  /** Gegenstände je Orts-ID; Gegenstände mit ungültigem Ort unter OHNE_ORT_ID */
  proOrt: Map<string, Gegenstand[]>;
  /** Anzahl Gegenstände im Teilbaum eines Ortes */
  zaehlung: (ortId: string) => Zaehlung;
  kategorien: string[];
  overlayAktiv: boolean;
  /** keller.config.json wurde geändert, seit in der App bearbeitet wurde */
  dateiGeaendert: boolean;

  hinzufuegen: (eintraege: NeuerGegenstand[], ortId: string) => Promise<Gegenstand[]>;
  aktualisieren: (id: string, patch: Partial<Gegenstand>) => Promise<void>;
  statusSetzen: (id: string, status: Status) => Promise<void>;
  loeschen: (id: string) => Promise<void>;
  verschieben: (ids: string[], ortId: string) => Promise<void>;

  configSpeichern: (cfg: KellerConfig) => Promise<void>;
  configAufDateiZuruecksetzen: () => Promise<void>;
  overlayBehalten: () => Promise<void>;
  neuLaden: () => Promise<void>;

  toast: Toast | null;
  zeigeToast: (text: string, rueckgaengig?: () => void) => void;
}

const Ctx = createContext<KellerCtx | null>(null);

export function useKeller(): KellerCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useKeller außerhalb von KellerProvider');
  return c;
}

const jetzt = () => new Date().toISOString();

export function KellerProvider({ children }: { children: ReactNode }) {
  const [geladen, setGeladen] = useState(false);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [gegenstaende, setGegenstaende] = useState<Gegenstand[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const config = overlay?.config ?? BASIS_CONFIG;
  const orte = useMemo(() => buildOrte(config), [config]);

  const neuLaden = useCallback(async () => {
    const [ov, alle] = await Promise.all([db.einstellung<Overlay>('configOverlay'), db.alleGegenstaende()]);
    setOverlay(ov ?? null);
    setGegenstaende(alle);
  }, []);

  // Erststart: Daten laden, Inhalte freier Positionen (z. B. Koffer) einmalig anlegen.
  const gestartet = useRef(false);
  useEffect(() => {
    if (gestartet.current) return; // StrictMode führt Effekte doppelt aus
    gestartet.current = true;
    (async () => {
      await neuLaden();
      const ov = await db.einstellung<Overlay>('configOverlay');
      const cfg = ov?.config ?? BASIS_CONFIG;
      const geseedet = (await db.einstellung<string[]>('geseedet')) ?? [];
      const neu: Gegenstand[] = [];
      for (const f of cfg.freie_positionen) {
        if (!f.inhalt?.length || geseedet.includes(f.id)) continue;
        for (const name of f.inhalt) neu.push(erzeugen({ name }, f.id));
        geseedet.push(f.id);
      }
      if (neu.length) {
        await db.speichern(...neu);
        await db.einstellungSetzen('geseedet', geseedet);
        setGegenstaende((g) => [...g, ...neu]);
      }
      // Browser bitten, die Daten nicht automatisch zu löschen.
      navigator.storage?.persist?.().catch(() => undefined);
      setGeladen(true);
    })();
  }, [neuLaden]);

  const proOrt = useMemo(() => {
    const map = new Map<string, Gegenstand[]>();
    for (const g of gegenstaende) {
      const key = orte.has(g.ortId) ? g.ortId : OHNE_ORT_ID;
      const arr = map.get(key);
      if (arr) arr.push(g);
      else map.set(key, [g]);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    return map;
  }, [gegenstaende, orte]);

  // Zählungen je Teilbaum einmal pro Änderung berechnen.
  const zaehlungen = useMemo(() => {
    const res = new Map<string, Zaehlung>();
    const rek = (id: string): Zaehlung => {
      const o = orte.get(id);
      const eigene = proOrt.get(id) ?? [];
      const z = { gesamt: eigene.length, entnommen: eigene.filter((g) => g.status === 'entnommen').length };
      for (const k of o?.kinder ?? []) {
        const kz = rek(k);
        z.gesamt += kz.gesamt;
        z.entnommen += kz.entnommen;
      }
      res.set(id, z);
      return z;
    };
    for (const o of orte.values()) if (!o.parentId) rek(o.id);
    return res;
  }, [orte, proOrt]);

  const zaehlung = useCallback((id: string) => zaehlungen.get(id) ?? { gesamt: 0, entnommen: 0 }, [zaehlungen]);

  const kategorien = useMemo(
    () => [...new Set(gegenstaende.map((g) => g.kategorie).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de')),
    [gegenstaende],
  );

  const zeigeToast = useCallback((text: string, rueckgaengig?: () => void) => {
    window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text, rueckgaengig });
    toastTimer.current = window.setTimeout(() => setToast(null), rueckgaengig ? 5000 : 2500);
  }, []);

  const ersetzen = (g: Gegenstand) => setGegenstaende((alle) => alle.map((x) => (x.id === g.id ? g : x)));

  const hinzufuegen = useCallback(async (eintraege: NeuerGegenstand[], ortId: string) => {
    const neu = eintraege.map((e) => erzeugen(e, ortId));
    await db.speichern(...neu);
    setGegenstaende((g) => [...g, ...neu]);
    return neu;
  }, []);

  const aktualisieren = useCallback(
    async (id: string, patch: Partial<Gegenstand>) => {
      const alt = gegenstaende.find((g) => g.id === id);
      if (!alt) return;
      const neu = { ...alt, ...patch, geaendertAm: jetzt() };
      await db.speichern(neu);
      ersetzen(neu);
    },
    [gegenstaende],
  );

  const statusSetzen = useCallback(
    async (id: string, status: Status) => {
      const alt = gegenstaende.find((g) => g.id === id);
      if (!alt || alt.status === status) return;
      const t = jetzt();
      const neu: Gegenstand = {
        ...alt,
        status,
        geaendertAm: t,
        ...(status === 'entnommen' ? { entnommenAm: t } : { zurueckgelegtAm: t }),
      };
      await db.speichern(neu);
      ersetzen(neu);
      if (navigator.vibrate) navigator.vibrate(15);
      zeigeToast(`„${alt.name}“ ${status === 'entnommen' ? 'entnommen' : 'zurückgelegt'}`, async () => {
        await db.speichern(alt);
        ersetzen(alt);
      });
    },
    [gegenstaende, zeigeToast],
  );

  const loeschen = useCallback(
    async (id: string) => {
      const alt = gegenstaende.find((g) => g.id === id);
      if (!alt) return;
      const foto = alt.fotoId ? await db.foto(alt.fotoId) : undefined;
      await db.loeschen(id);
      if (alt.fotoId) await db.fotoLoeschen(alt.fotoId);
      setGegenstaende((g) => g.filter((x) => x.id !== id));
      zeigeToast(`„${alt.name}“ gelöscht`, async () => {
        if (alt.fotoId && foto) await db.fotoSpeichern(alt.fotoId, foto);
        await db.speichern(alt);
        setGegenstaende((g) => [...g, alt]);
      });
    },
    [gegenstaende, zeigeToast],
  );

  const verschieben = useCallback(
    async (ids: string[], ortId: string) => {
      const t = jetzt();
      const neu = gegenstaende.filter((g) => ids.includes(g.id)).map((g) => ({ ...g, ortId, geaendertAm: t }));
      await db.speichern(...neu);
      setGegenstaende((alle) => alle.map((g) => neu.find((n) => n.id === g.id) ?? g));
    },
    [gegenstaende],
  );

  const configSpeichern = useCallback(async (cfg: KellerConfig) => {
    const ov: Overlay = { basisHash: BASIS_HASH, config: cfg, geaendertAm: jetzt() };
    await db.einstellungSetzen('configOverlay', ov);
    setOverlay(ov);
  }, []);

  const configAufDateiZuruecksetzen = useCallback(async () => {
    await db.einstellungLoeschen('configOverlay');
    setOverlay(null);
  }, []);

  const overlayBehalten = useCallback(async () => {
    if (!overlay) return;
    const ov = { ...overlay, basisHash: BASIS_HASH };
    await db.einstellungSetzen('configOverlay', ov);
    setOverlay(ov);
  }, [overlay]);

  const wert: KellerCtx = {
    geladen,
    config,
    orte,
    gegenstaende,
    proOrt,
    zaehlung,
    kategorien,
    overlayAktiv: !!overlay,
    dateiGeaendert: !!overlay && overlay.basisHash !== BASIS_HASH,
    hinzufuegen,
    aktualisieren,
    statusSetzen,
    loeschen,
    verschieben,
    configSpeichern,
    configAufDateiZuruecksetzen,
    overlayBehalten,
    neuLaden,
    toast,
    zeigeToast,
  };

  return <Ctx.Provider value={wert}>{children}</Ctx.Provider>;
}

function erzeugen(e: NeuerGegenstand, ortId: string): Gegenstand {
  const t = jetzt();
  return {
    id: neueId(),
    menge: 1,
    kategorie: '',
    notiz: '',
    status: 'vorhanden',
    erstelltAm: t,
    ...e,
    name: e.name.trim(),
    ortId,
    geaendertAm: t,
  };
}
