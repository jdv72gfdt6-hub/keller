// Leitet aus der Config einen Baum aller "Orte" ab: Raum → Möbel → Tür → Fach/Schublade/Korb → Box.
// Orts-IDs sind stabil und lesbar (z. B. "kallax-3x4/r2c3/box"), damit QR-Codes nach
// Config-Änderungen weiter funktionieren, solange das Fach existiert.
import type { KellerConfig, KallaxMoebel, PaxMoebel, SchrankMoebel, PaxSegmentTyp } from './types';

export type OrtTyp = 'raum' | 'moebel' | 'tuer' | 'fach' | 'schublade' | 'korb' | 'boden' | 'stange' | 'box' | 'frei';

export interface Ort {
  id: string;
  typ: OrtTyp;
  /** Anzeigename (eigene Bezeichnung, falls gesetzt) */
  name: string;
  /** Name laut Struktur, z. B. "Box grau" */
  standardName: string;
  /** Zusatzinfo, z. B. Beschreibung einer freien Position */
  info?: string;
  parentId: string | null;
  kinder: string[];
  /** true = Gegenstände dürfen direkt hier liegen */
  ablage: boolean;
  moebelId?: string;
  /** Box-Farbe (CSS-Farbe) */
  farbe?: string;
  /** In der App angelegte Box (kann wieder entfernt werden) */
  zusatzBox?: boolean;
  /** Lage im Möbel, für die 3D-Ansicht */
  lage?: { reihe?: number; spalte?: number; vonUnten?: number; anzahl?: number };
}

export const RAUM_ID = 'raum';
export const OHNE_ORT_ID = '__ohne-ort';

export const TYP_LABEL: Record<OrtTyp, string> = {
  raum: 'Raum',
  moebel: 'Möbel',
  tuer: 'Tür',
  fach: 'Fach',
  schublade: 'Schublade',
  korb: 'Korb',
  boden: 'Boden',
  stange: 'Kleiderstange',
  box: 'Box',
  frei: 'Freie Position',
};

const FARB_CSS: Record<string, string> = {
  grau: '#8a93a3',
  weiss: '#e9eef5',
  schwarz: '#2b2f37',
  beige: '#d8c7a6',
  blau: '#4d7cff',
  gruen: '#3fbf7f',
  rot: '#e5484d',
};

/** "weiss" → "weiß" für die Anzeige */
export function farbName(f: string): string {
  return f.replace(/ss$/, 'ß').replace(/ue/g, 'ü');
}

export function farbCss(f: string): string {
  return FARB_CSS[f] ?? '#8a93a3';
}

/** Positionsname: "oben/Mitte/unten" bei bis zu 3 Elementen, sonst "n von oben". */
export function posName(basis: string, vonOben: number, anzahl: number): string {
  if (anzahl <= 1) return basis;
  if (anzahl === 2) return `${basis} ${vonOben === 1 ? 'oben' : 'unten'}`;
  if (anzahl === 3) return `${basis} ${['oben', 'Mitte', 'unten'][vonOben - 1]}`;
  return `${basis} ${vonOben} von oben`;
}

export type KallaxBelegung =
  | { art: 'offen' }
  | { art: 'box'; farbe: string }
  | { art: 'schubladen'; anzahl: number };

export function parseKallaxZelle(z: string | undefined): KallaxBelegung {
  if (!z) return { art: 'offen' };
  if (z.startsWith('box')) return { art: 'box', farbe: z.slice(4) || 'grau' };
  const m = /^schubladeneinsatz-(\d+)$/.exec(z);
  if (m) return { art: 'schubladen', anzahl: Math.max(1, Number(m[1])) };
  return { art: 'offen' };
}

const PAX_ORT: Record<PaxSegmentTyp, { typ: OrtTyp; name: string }> = {
  schublade: { typ: 'schublade', name: 'Schublade' },
  drahtkorb: { typ: 'korb', name: 'Drahtkorb' },
  boden: { typ: 'boden', name: 'Boden' },
  kleiderstange: { typ: 'stange', name: 'Kleiderstange' },
};

export function buildOrte(cfg: KellerConfig): Map<string, Ort> {
  const orte = new Map<string, Ort>();
  const namen = cfg.bezeichnungen ?? {};

  const add = (o: Omit<Ort, 'kinder' | 'standardName'>) => {
    const ort: Ort = { ...o, standardName: o.name, name: namen[o.id]?.trim() || o.name, kinder: [] };
    orte.set(ort.id, ort);
    if (ort.parentId) orte.get(ort.parentId)?.kinder.push(ort.id);
    return ort;
  };

  add({ id: RAUM_ID, typ: 'raum', name: cfg.raum.name, parentId: null, ablage: false });

  for (const m of cfg.moebel) {
    add({ id: m.id, typ: 'moebel', name: m.name, parentId: RAUM_ID, ablage: false, moebelId: m.id });
    if (m.typ === 'kallax') addKallax(m, add);
    else if (m.typ === 'pax') addPax(m, add);
    else if (m.typ === 'schrank') addSchrank(m, add);
    else orte.get((m as { id: string }).id)!.ablage = true; // unbekannter Typ: Möbel selbst als Ablage
  }

  for (const f of cfg.freie_positionen) {
    add({ id: f.id, typ: 'frei', name: f.name, info: f.ort, parentId: RAUM_ID, ablage: true });
  }

  for (const b of cfg.boxen ?? []) {
    const parentOk = orte.has(b.in) && orte.get(b.in)!.typ !== 'raum';
    add({
      id: b.id,
      typ: 'box',
      name: b.name,
      parentId: parentOk ? b.in : RAUM_ID,
      info: parentOk ? undefined : 'Ursprünglicher Ort existiert nicht mehr',
      ablage: true,
      zusatzBox: true,
      moebelId: parentOk ? orte.get(b.in)!.moebelId : undefined,
    });
  }

  return orte;
}

type Add = (o: Omit<Ort, 'kinder' | 'standardName'>) => Ort;

function addKallax(m: KallaxMoebel, add: Add) {
  for (let r = 1; r <= m.reihen; r++) {
    for (let c = 1; c <= m.spalten; c++) {
      const bel = parseKallaxZelle(m.belegung_oben_nach_unten?.[r - 1]?.[c - 1]);
      const fachId = `${m.id}/r${r}c${c}`;
      add({
        id: fachId,
        typ: 'fach',
        name: `Reihe ${r}, Spalte ${c}`,
        parentId: m.id,
        ablage: bel.art === 'offen',
        moebelId: m.id,
        lage: { reihe: r, spalte: c },
      });
      if (bel.art === 'box') {
        add({
          id: `${fachId}/box`,
          typ: 'box',
          name: `Box ${farbName(bel.farbe)}`,
          parentId: fachId,
          ablage: true,
          moebelId: m.id,
          farbe: farbCss(bel.farbe),
          lage: { reihe: r, spalte: c },
        });
      } else if (bel.art === 'schubladen') {
        for (let i = 1; i <= bel.anzahl; i++) {
          add({
            id: `${fachId}/s${i}`,
            typ: 'schublade',
            name: posName('Schublade', i, bel.anzahl),
            parentId: fachId,
            ablage: true,
            moebelId: m.id,
            lage: { reihe: r, spalte: c, vonUnten: bel.anzahl - i + 1, anzahl: bel.anzahl },
          });
        }
      }
    }
  }
}

function addPax(m: PaxMoebel, add: Add) {
  // Einteilung in einzelne Einheiten auflösen (von unten), Index je Typ für stabile IDs.
  const einheiten: { typ: PaxSegmentTyp; idx: number; vonUnten: number }[] = [];
  const zaehler: Partial<Record<PaxSegmentTyp, number>> = {};
  for (const seg of m.einteilung_von_unten ?? []) {
    const n = Math.max(1, seg.anzahl ?? 1);
    for (let i = 0; i < n; i++) {
      zaehler[seg.typ] = (zaehler[seg.typ] ?? 0) + 1;
      einheiten.push({ typ: seg.typ, idx: zaehler[seg.typ]!, vonUnten: einheiten.length + 1 });
    }
  }
  // Anzeige von oben nach unten, wie man vor dem Schrank steht.
  for (const e of [...einheiten].reverse()) {
    const def = PAX_ORT[e.typ];
    const gesamt = zaehler[e.typ]!;
    add({
      id: `${m.id}/${e.typ}-${e.idx}`,
      typ: def.typ,
      name: posName(def.name, gesamt - e.idx + 1, gesamt),
      parentId: m.id,
      ablage: true,
      moebelId: m.id,
      lage: { vonUnten: e.vonUnten, anzahl: einheiten.length },
    });
  }
}

/** Ordnet jedem Fach (von unten, 1-basiert) eine Tür (von unten, 0-basiert) zu. */
export function tuerFuerFach(m: SchrankMoebel): number[] {
  const tueren = Math.max(0, m.tueren?.anzahl ?? 0);
  const n = Math.max(0, m.faecher);
  if (tueren === 0) return Array(n).fill(-1);
  let verteilung = m.tueren.faecher_je_tuer_von_unten;
  if (!verteilung || verteilung.length !== tueren) {
    // gleichmäßig verteilen, Rest auf die unteren Türen
    verteilung = Array.from({ length: tueren }, (_, i) => Math.floor(n / tueren) + (i < n % tueren ? 1 : 0));
  }
  const res: number[] = [];
  verteilung.forEach((anz, t) => {
    for (let i = 0; i < anz; i++) res.push(t);
  });
  while (res.length < n) res.push(tueren - 1);
  return res.slice(0, n);
}

function addSchrank(m: SchrankMoebel, add: Add) {
  const n = Math.max(0, m.faecher);
  const zuordnung = tuerFuerFach(m);
  const tueren = Math.max(0, m.tueren?.anzahl ?? 0);
  const fachOrt = (f: number, parentId: string) =>
    add({
      id: `${m.id}/fach-${f}`,
      typ: 'fach',
      name: posName('Fach', n - f + 1, n),
      parentId,
      ablage: true,
      moebelId: m.id,
      lage: { vonUnten: f, anzahl: n },
    });

  if (tueren === 0) {
    for (let f = n; f >= 1; f--) fachOrt(f, m.id);
    return;
  }
  for (let t = tueren - 1; t >= 0; t--) {
    const tuerId = `${m.id}/tuer-${t + 1}`;
    add({
      id: tuerId,
      typ: 'tuer',
      name: posName('Tür', tueren - t, tueren),
      parentId: m.id,
      ablage: false,
      moebelId: m.id,
      lage: { vonUnten: t + 1, anzahl: tueren },
    });
    for (let f = n; f >= 1; f--) if (zuordnung[f - 1] === t) fachOrt(f, tuerId);
  }
}

/** Pfad vom Möbel bis zum Ort (ohne Raum). */
export function pfad(orte: Map<string, Ort>, id: string): Ort[] {
  const res: Ort[] = [];
  let o = orte.get(id);
  while (o && o.typ !== 'raum') {
    res.unshift(o);
    o = o.parentId ? orte.get(o.parentId) : undefined;
  }
  return res;
}

export function pfadText(orte: Map<string, Ort>, id: string, sep = ' → '): string {
  if (!orte.has(id)) return 'Ohne Ort';
  const p = pfad(orte, id);
  return p.length ? p.map((o) => o.name).join(sep) : orte.get(id)!.name;
}

/** Alle IDs im Teilbaum (inkl. Ort selbst). */
export function teilbaum(orte: Map<string, Ort>, id: string): string[] {
  const res: string[] = [];
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    res.push(cur);
    const o = orte.get(cur);
    if (o) stack.push(...o.kinder);
  }
  return res;
}

/** Soll für diesen Ort standardmäßig ein Etikett gedruckt werden? */
export function etikettStandard(o: Ort): boolean {
  return o.ablage && o.typ !== 'raum' && o.typ !== 'moebel';
}
