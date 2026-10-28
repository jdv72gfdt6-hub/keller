// Berechnet aus Config + Orten die maßstabsgetreue 3D-Geometrie (alles in cm).
// Weltkoordinaten: X = Raumlänge (x der Config), Z = Raumbreite (y der Config), Y = Höhe.
// Jedes Möbel hat ein lokales System: x = Breite (von links nach rechts, wenn man davor steht),
// y = Höhe, z = Tiefe (0 = Wand, tiefe = Front). Die Orts-IDs stammen aus orte.ts.
import type { FreiePosition, KallaxMoebel, KellerConfig, Moebel, PaxMoebel, Raum, SchrankMoebel } from '../config/types';
import { tuerFuerFach, type Ort } from '../config/orte';
import { normalisieren } from '../lib/text';

export type Vec3 = [number, number, number];

export interface Quader {
  min: Vec3;
  max: Vec3;
}

export const quader = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Quader => ({
  min: [x0, y0, z0],
  max: [x1, y1, z1],
});
export const mitte = (q: Quader): Vec3 => [(q.min[0] + q.max[0]) / 2, (q.min[1] + q.max[1]) / 2, (q.min[2] + q.max[2]) / 2];
export const groesse = (q: Quader): Vec3 => [q.max[0] - q.min[0], q.max[1] - q.min[1], q.max[2] - q.min[2]];

export type ElementArt = 'box' | 'schublade' | 'korb' | 'boden' | 'stange' | 'fach' | 'zusatzbox';

/** Was geöffnet sein muss, damit ein Element erreichbar ist. */
export type Huelle = { art: 'schiebe'; moebelId: string } | { art: 'dreh'; tuerId: string };

export interface Element3D {
  ortId: string;
  art: ElementArt;
  /** Volumen des Elements (lokal, cm) */
  q: Quader;
  /** Auszugsweg nach vorne in cm (0 = fest) */
  auszug: number;
  farbe?: string;
  huelle?: Huelle;
  /** Sichtbares Brett eines Bodens */
  brett?: Quader;
  /** Element, mit dem dieses mitfährt (Zusatzbox in einer Schublade) */
  mit?: string;
}

export interface Drehtuer3D {
  id: string;
  q: Quader;
}

export interface Lage {
  pos: Vec3;
  rotY: number;
}

export interface Moebel3D {
  m: Moebel;
  lage: Lage;
  bretter: Quader[];
  /** dunkle Rückwand-Bretter */
  rueckwand: Quader[];
  elemente: Element3D[];
  drehtueren: Drehtuer3D[];
  farbe: string;
}

export interface Schiebe3D {
  id: string;
  ueber: string[];
  breite: number;
  hoehe: number;
  rotY: number;
  /** Mittelpunkt (Welt) einer Tür vor Möbel j auf Schiene `spur` (0 = innen, 1 = außen) */
  slot: (j: number, spur: number) => Vec3;
}

export type FreiArt = 'koffer' | 'leiter' | 'reifen' | 'objekt';

export interface Frei3D {
  fp: FreiePosition;
  art: FreiArt;
  /** Bodenmittelpunkt (Welt) bzw. Oberkante des Möbels, auf dem es liegt */
  basis: Vec3;
  /** Hüllquader in Weltkoordinaten (für Rahmen und Kamera) */
  q: Quader;
  rotY: number;
  /** Ablageplätze oben auf Möbeln (Mitte der Oberseite, Welt) – z. B. je ein Koffer pro Schrank */
  plaetze?: Vec3[];
}

export interface Raum3D {
  raum: Raum;
  moebel: Moebel3D[];
  schiebe: Schiebe3D | null;
  frei: Frei3D[];
  /** Orts-ID → Möbel + Element */
  index: Map<string, { m3d: Moebel3D; e: Element3D }>;
}

// ---------- Transformation ----------

export function moebelLage(m: Moebel, raum: Raum): Lage {
  switch (m.wand) {
    case 'rechts':
      return { pos: [m.x + m.breite, 0, raum.breite], rotY: Math.PI };
    case 'hinten':
      return { pos: [raum.laenge, 0, m.x], rotY: -Math.PI / 2 };
    case 'vorne':
      return { pos: [0, 0, m.x + m.breite], rotY: Math.PI / 2 };
    default:
      return { pos: [m.x, 0, 0], rotY: 0 };
  }
}

/** Lokaler Punkt (cm) → Weltpunkt (cm). Entspricht der Rotation um Y in three.js. */
export function lokalZuWelt(l: Lage, p: Vec3): Vec3 {
  const c = Math.cos(l.rotY);
  const s = Math.sin(l.rotY);
  return [l.pos[0] + p[0] * c + p[2] * s, p[1], l.pos[2] - p[0] * s + p[2] * c];
}

/** Blickrichtung aus dem Möbel heraus (Welt, normiert) */
export function frontNormale(l: Lage): Vec3 {
  return [Math.sin(l.rotY), 0, Math.cos(l.rotY)];
}

// ---------- Möbeltypen ----------

function kallax(m: KallaxMoebel, orte: Map<string, Ort>): Pick<Moebel3D, 'bretter' | 'rueckwand' | 'elemente'> {
  const { spalten: S, reihen: R, breite: B, hoehe: H, tiefe: T } = m;
  const innen = m.fach_innenmass ?? 33;
  // Brettstärke so wählen, dass Außenmaß und Innenmaß zusammenpassen
  const tx = Math.max(1.5, (B - S * innen) / (S + 1));
  const iw = (B - (S + 1) * tx) / S;
  const ty = Math.max(1.5, (H - R * innen) / (R + 1));
  const ih = (H - (R + 1) * ty) / R;

  const bretter: Quader[] = [];
  for (let c = 0; c <= S; c++) bretter.push(quader(c * (iw + tx), 0, 0, c * (iw + tx) + tx, H, T));
  for (let r = 0; r <= R; r++) bretter.push(quader(0, r * (ih + ty), 0, B, r * (ih + ty) + ty, T));

  const elemente: Element3D[] = [];
  for (const fachId of orte.get(m.id)?.kinder ?? []) {
    const fach = orte.get(fachId)!;
    const r = fach.lage?.reihe ?? 1;
    const c = fach.lage?.spalte ?? 1;
    const x0 = tx + (c - 1) * (iw + tx);
    const y0 = H - r * (ih + ty);
    if (fach.ablage) elemente.push({ ortId: fach.id, art: 'fach', q: quader(x0, y0, 0, x0 + iw, y0 + ih, T), auszug: 0 });
    for (const kid of fach.kinder) {
      const k = orte.get(kid)!;
      if (k.typ === 'box' && !k.zusatzBox) {
        elemente.push({
          ortId: k.id,
          art: 'box',
          q: quader(x0 + 0.6, y0 + 0.4, 1.5, x0 + iw - 0.6, y0 + ih - 0.8, T - 0.3),
          auszug: T * 0.75,
          farbe: k.farbe,
        });
      } else if (k.typ === 'schublade') {
        const n = k.lage?.anzahl ?? 1;
        const h = ih / n;
        const yb = y0 + ((k.lage?.vonUnten ?? 1) - 1) * h;
        elemente.push({
          ortId: k.id,
          art: 'schublade',
          q: quader(x0 + 0.5, yb + 0.3, 1.5, x0 + iw - 0.5, yb + h - 0.3, T - 0.3),
          auszug: T * 0.65,
          farbe: '#e9eef5',
        });
      }
    }
  }
  return { bretter, rueckwand: [], elemente };
}

const PAX_HOEHE = { schublade: 20, korb: 17 };

function pax(m: PaxMoebel, orte: Map<string, Ort>, huelle?: Huelle): Pick<Moebel3D, 'bretter' | 'rueckwand' | 'elemente'> {
  const { breite: B, hoehe: H, tiefe: T } = m;
  const s = 1.8;
  const sockel = 5;
  const bretter = [
    quader(0, 0, 0, s, H, T),
    quader(B - s, 0, 0, B, H, T),
    quader(s, H - s, 0, B - s, H, T),
    quader(s, sockel - s, 0, B - s, sockel, T),
    quader(s, 0, T - 2, B - s, sockel - s, T),
  ];
  const rueckwand = [quader(s, sockel, 0, B - s, H - s, 0.6)];

  const einheiten = (orte.get(m.id)?.kinder ?? [])
    .map((id) => orte.get(id)!)
    .sort((a, b) => (a.lage?.vonUnten ?? 0) - (b.lage?.vonUnten ?? 0));

  // Schubladen/Körbe haben feste Höhen; der Rest wird auf Böden und Kleiderstangen verteilt.
  const gewicht = (u: Ort) => (u.typ === 'stange' ? 3 : u.typ === 'boden' ? 1 : 0);
  let fest = 0;
  for (const u of einheiten) {
    if (u.typ === 'schublade') fest += PAX_HOEHE.schublade;
    else if (u.typ === 'korb') fest += PAX_HOEHE.korb;
    else if (u.typ === 'boden') fest += s;
  }
  const gewichte = einheiten.reduce((a, u) => a + gewicht(u), 0) || 1;
  const einheit = Math.max(8, (H - s - sockel - fest) / gewichte);

  const xi0 = s + 0.3;
  const xi1 = B - s - 0.3;
  const elemente: Element3D[] = [];
  let y = sockel;
  for (const u of einheiten) {
    if (u.typ === 'schublade') {
      elemente.push({ ortId: u.id, art: 'schublade', q: quader(xi0, y + 0.4, 1, xi1, y + PAX_HOEHE.schublade - 0.4, T - 0.5), auszug: 40, farbe: '#e6ebf2', huelle });
      y += PAX_HOEHE.schublade;
    } else if (u.typ === 'korb') {
      elemente.push({ ortId: u.id, art: 'korb', q: quader(xi0 + 0.5, y + 1, 3, xi1 - 0.5, y + PAX_HOEHE.korb - 1, T - 3), auszug: 38, huelle });
      y += PAX_HOEHE.korb;
    } else if (u.typ === 'boden') {
      const raum = einheit * gewicht(u);
      const oben = Math.min(y + s + raum, H - s);
      elemente.push({ ortId: u.id, art: 'boden', brett: quader(s, y, 0.6, B - s, y + s, T - 1), q: quader(xi0, y + s, 1, xi1, oben, T - 1), auszug: 0, huelle });
      y = oben;
    } else if (u.typ === 'stange') {
      const oben = Math.min(y + einheit * gewicht(u), H - s);
      elemente.push({ ortId: u.id, art: 'stange', q: quader(xi0, y, 1, xi1, oben, T - 1), auszug: 0, huelle });
      y = oben;
    }
  }
  return { bretter, rueckwand, elemente };
}

function schrank(m: SchrankMoebel, orte: Map<string, Ort>): Pick<Moebel3D, 'bretter' | 'rueckwand' | 'elemente' | 'drehtueren'> {
  const { breite: B, hoehe: H, tiefe: T } = m;
  const s = 1.8;
  const sockel = 3;
  const n = Math.max(1, m.faecher);
  const fh = (H - s - sockel) / n;
  const bretter = [
    quader(0, 0, 0, s, H, T),
    quader(B - s, 0, 0, B, H, T),
    quader(s, H - s, 0, B - s, H, T),
    quader(s, sockel - s, 0, B - s, sockel, T),
  ];
  for (let f = 1; f < n; f++) {
    const y = sockel + f * fh;
    bretter.push(quader(s, y - 0.9, 1, B - s, y + 0.9, T - 1));
  }
  const rueckwand = [quader(s, sockel, 0, B - s, H - s, 0.6)];

  const zuordnung = tuerFuerFach(m);
  const elemente: Element3D[] = [];
  for (let f = 1; f <= n; f++) {
    const id = `${m.id}/fach-${f}`;
    if (!orte.has(id)) continue;
    const t = zuordnung[f - 1];
    elemente.push({
      ortId: id,
      art: 'fach',
      q: quader(s + 0.3, sockel + (f - 1) * fh + 0.9, 1, B - s - 0.3, sockel + f * fh - 0.9, T - 1),
      auszug: 0,
      huelle: t >= 0 ? { art: 'dreh', tuerId: `${m.id}/tuer-${t + 1}` } : undefined,
    });
  }

  const tueren = Math.max(0, m.tueren?.anzahl ?? 0);
  const drehtueren: Drehtuer3D[] = [];
  for (let t = 0; t < tueren; t++) {
    const faecher = zuordnung.map((x, i) => (x === t ? i + 1 : 0)).filter(Boolean);
    if (!faecher.length) continue;
    const y0 = t === 0 ? 0.5 : sockel + (Math.min(...faecher) - 1) * fh;
    const y1 = t === tueren - 1 ? H - 0.5 : sockel + Math.max(...faecher) * fh;
    drehtueren.push({ id: `${m.id}/tuer-${t + 1}`, q: quader(0.2, y0 + 0.2, T, B - 0.2, y1 - 0.2, T + 1.8) });
  }
  return { bretter, rueckwand, elemente, drehtueren };
}

/** Boxen, die in der App in ein Fach/Boden/Korb gestellt wurden, nebeneinander auf den Boden des Elements. */
function zusatzBoxen(elemente: Element3D[], orte: Map<string, Ort>): Element3D[] {
  const res: Element3D[] = [];
  for (const e of elemente) {
    const boxen = (orte.get(e.ortId)?.kinder ?? []).map((id) => orte.get(id)!).filter((o) => o.zusatzBox);
    if (!boxen.length) continue;
    const [w, h, d] = groesse(e.q);
    const n = boxen.length;
    const bw = Math.min(34, (w - 2 * (n + 1)) / n);
    const bh = Math.min(24, h - 2);
    const bd = Math.min(34, d - 4);
    boxen.forEach((b, i) => {
      const x0 = e.q.min[0] + 2 + i * (bw + 2);
      const y0 = e.q.min[1] + 0.2;
      const z1 = e.q.max[2] - 2;
      res.push({
        ortId: b.id,
        art: 'zusatzbox',
        q: quader(x0, y0, z1 - bd, x0 + bw, y0 + bh, z1),
        auszug: e.auszug,
        huelle: e.huelle,
        mit: e.auszug ? e.ortId : undefined,
      });
    });
  }
  return res;
}

// ---------- Freie Positionen ----------

function freiArt(fp: FreiePosition): FreiArt {
  const n = normalisieren(`${fp.id} ${fp.name}`);
  if (n.includes('koffer')) return 'koffer';
  if (n.includes('leiter')) return 'leiter';
  if (n.includes('reifen') || fp.durchmesser) return 'reifen';
  return 'objekt';
}

function freiLayout(fp: FreiePosition, moebel: Moebel3D[]): Frei3D | null {
  const art = freiArt(fp);
  if (fp.x !== undefined && fp.y !== undefined) {
    const [x, z] = [fp.x, fp.y];
    if (art === 'reifen') {
      const r = (fp.durchmesser ?? 63) / 2;
      const h = fp.hoehe ?? 85;
      return { fp, art, basis: [x, 0, z], q: quader(x - r, 0, z - r, x + r, h, z + r), rotY: 0 };
    }
    if (art === 'leiter') {
      const h = fp.hoehe ?? 180;
      return { fp, art, basis: [x, 0, z], q: quader(x - 12, 0, z - 25, x + 26, h, z + 25), rotY: 0 };
    }
    const h = fp.hoehe ?? 30;
    return { fp, art, basis: [x, 0, z], q: quader(x - 15, 0, z - 15, x + 15, h, z + 15), rotY: 0 };
  }
  // Ohne Koordinaten: Möbel suchen, deren Name in der Ortsbeschreibung steht ("oben auf PAX vorne und hinten").
  // Ein Möbel passt, wenn alle Wörter seines Namens vorkommen – so findet
  // "oben auf PAX vorne und hinten" sowohl "PAX vorne" als auch "PAX hinten".
  const woerter = new Set(normalisieren(fp.ort ?? '').split(/[^a-z0-9]+/).filter(Boolean));
  const auf = moebel.filter((m3d) =>
    normalisieren(m3d.m.name)
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .every((w) => woerter.has(w)),
  );
  if (!auf.length) return null;
  const punkte = auf.flatMap((m3d) =>
    [
      [0, 0],
      [m3d.m.breite, 0],
      [0, m3d.m.tiefe],
      [m3d.m.breite, m3d.m.tiefe],
    ].map(([x, z]) => lokalZuWelt(m3d.lage, [x, 0, z])),
  );
  const xs = punkte.map((p) => p[0]);
  const zs = punkte.map((p) => p[2]);
  const oben = Math.max(...auf.map((m3d) => m3d.m.hoehe));
  const q = quader(Math.min(...xs), oben, Math.min(...zs), Math.max(...xs), oben + 30, Math.max(...zs));
  const plaetze = auf.map((m3d) => lokalZuWelt(m3d.lage, [m3d.m.breite / 2, m3d.m.hoehe, m3d.m.tiefe / 2]));
  return { fp, art, basis: [(q.min[0] + q.max[0]) / 2, oben, (q.min[2] + q.max[2]) / 2], q, rotY: auf[0].lage.rotY, plaetze };
}

// ---------- Gesamter Raum ----------

const FARBEN = { kallax: '#c9ced8', pax: '#cdd2da', schrank: '#3b3f46' };

export function layoutRaum(cfg: KellerConfig, orte: Map<string, Ort>): Raum3D {
  const schiebeIds = new Set(cfg.schiebetueren?.ueber ?? []);
  const moebel: Moebel3D[] = cfg.moebel.map((m) => {
    const lage = moebelLage(m, cfg.raum);
    let teile: Pick<Moebel3D, 'bretter' | 'rueckwand' | 'elemente'> & { drehtueren?: Drehtuer3D[] };
    if (m.typ === 'kallax') teile = kallax(m, orte);
    else if (m.typ === 'pax') teile = pax(m, orte, schiebeIds.has(m.id) ? { art: 'schiebe', moebelId: m.id } : undefined);
    else if (m.typ === 'schrank') teile = schrank(m, orte);
    else teile = { bretter: [quader(0, 0, 0, (m as Moebel).breite, (m as Moebel).hoehe, (m as Moebel).tiefe)], rueckwand: [], elemente: [] };
    const elemente = [...teile.elemente, ...zusatzBoxen(teile.elemente, orte)];
    return {
      m,
      lage,
      bretter: teile.bretter,
      rueckwand: teile.rueckwand,
      elemente,
      drehtueren: teile.drehtueren ?? [],
      farbe: m.typ === 'schrank' && m.optik?.includes('dunkel') ? FARBEN.schrank : FARBEN[m.typ] ?? '#aab',
    };
  });

  const index = new Map<string, { m3d: Moebel3D; e: Element3D }>();
  for (const m3d of moebel) for (const e of m3d.elemente) index.set(e.ortId, { m3d, e });

  // Schiebetüren über mehreren Möbeln (gemeinsame Schiene)
  let schiebe: Schiebe3D | null = null;
  const st = cfg.schiebetueren;
  const ueber = (st?.ueber ?? []).map((id) => moebel.find((m3d) => m3d.m.id === id)).filter((x) => x !== undefined);
  if (st && ueber.length >= 2) {
    const hoehe = Math.min(...ueber.map((x) => x.m.hoehe)) - 1;
    schiebe = {
      id: st.id,
      ueber: ueber.map((x) => x.m.id),
      breite: st.breite_je,
      hoehe,
      rotY: ueber[0].lage.rotY,
      slot: (j, spur) => {
        const m3d = ueber[j];
        return lokalZuWelt(m3d.lage, [m3d.m.breite / 2, hoehe / 2 + 0.5, m3d.m.tiefe + 1.2 + spur * 2.6]);
      },
    };
  }

  const frei = cfg.freie_positionen.map((fp) => freiLayout(fp, moebel)).filter((x) => x !== null);
  return { raum: cfg.raum, moebel, schiebe, frei, index };
}

/** Wo steht eine Tür von Schiebetür i, wenn `offen` (Möbel-ID) geöffnet ist? */
export function schiebeSlot(s: Schiebe3D, i: number, offen: string | null): number {
  if (offen !== s.ueber[i]) return i;
  return i + 1 < s.ueber.length ? i + 1 : i - 1;
}

/**
 * Kameraziel für einen Ort: Mittelpunkt (Welt, cm) und Blickrichtung aus dem Möbel heraus.
 * `ausgezogen` berücksichtigt herausgezogene Boxen/Schubladen.
 */
export function zielFuerOrt(r: Raum3D, orte: Map<string, Ort>, ortId: string, ausgezogen = true): { mitte: Vec3; normale: Vec3 } | null {
  const ort = orte.get(ortId);
  const treffer = r.index.get(ortId);
  if (treffer) {
    const c = mitte(treffer.e.q);
    if (ausgezogen) c[2] += treffer.e.auszug;
    return { mitte: lokalZuWelt(treffer.m3d.lage, c), normale: frontNormale(treffer.m3d.lage) };
  }
  const frei = r.frei.find((f) => f.fp.id === ortId);
  if (frei) {
    const c = mitte(frei.q);
    // Blick vom Raummittelpunkt aus
    const dx = r.raum.laenge / 2 - c[0];
    const dz = r.raum.breite / 2 - c[2];
    const l = Math.hypot(dx, dz) || 1;
    return { mitte: c, normale: [dx / l, 0, dz / l] };
  }
  for (const m3d of r.moebel) {
    const tuer = m3d.drehtueren.find((t) => t.id === ortId);
    if (tuer) return { mitte: lokalZuWelt(m3d.lage, mitte(tuer.q)), normale: frontNormale(m3d.lage) };
    if (m3d.m.id === ortId) {
      return { mitte: lokalZuWelt(m3d.lage, [m3d.m.breite / 2, m3d.m.hoehe / 2, m3d.m.tiefe]), normale: frontNormale(m3d.lage) };
    }
  }
  // Fach mit Box/Schubladen: erstes Kind; sonst Elternort
  if (ort?.kinder.length) return zielFuerOrt(r, orte, ort.kinder[0], ausgezogen);
  if (ort?.parentId) return zielFuerOrt(r, orte, ort.parentId, ausgezogen);
  return null;
}

/**
 * Der Ort, der in 3D tatsächlich dargestellt wird:
 * Fach mit Box → Box; Box auf einer freien Position → freie Position; Tür/Möbel bleiben.
 */
export function elementOrt(r: Raum3D, orte: Map<string, Ort>, ortId: string): string {
  let id: string | null = ortId;
  while (id) {
    if (r.index.has(id) || r.frei.some((f) => f.fp.id === id)) return id;
    const ort = orte.get(id);
    if (!ort || ort.typ === 'moebel' || ort.typ === 'tuer') return id;
    if (ort.typ === 'fach' && !ort.ablage && ort.kinder.length === 1 && r.index.has(ort.kinder[0])) return ort.kinder[0];
    id = ort.parentId;
  }
  return ortId;
}
