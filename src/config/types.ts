// Typen für keller.config.json. Maße immer in cm.
// Koordinaten: x = Raumlänge ab Türwand (0) Richtung Rückwand, y = Raumbreite ab linker Wand (0).

export type Wand = 'links' | 'rechts' | 'hinten' | 'vorne';

export interface Raum {
  name: string;
  laenge: number;
  breite: number;
  hoehe: number;
  tuer?: string;
}

interface MoebelBasis {
  id: string;
  name: string;
  wand: Wand;
  /** Startpunkt entlang der Wand (bei links/rechts: Abstand zur Türwand) */
  x: number;
  breite: number;
  tiefe: number;
  hoehe: number;
  tiefe_geschaetzt?: boolean;
  optik?: string;
}

/**
 * Kallax-Zelle: "offen", "box-<farbe>" (z. B. box-grau, box-weiss) oder
 * "schubladeneinsatz-<n>" (Einsatz mit n Schubladen).
 */
export type KallaxZelle = string;

export interface KallaxMoebel extends MoebelBasis {
  typ: 'kallax';
  spalten: number;
  reihen: number;
  fach_innenmass?: number;
  belegung_oben_nach_unten: KallaxZelle[][];
}

export type PaxSegmentTyp = 'schublade' | 'drahtkorb' | 'boden' | 'kleiderstange';

export interface PaxSegment {
  typ: PaxSegmentTyp;
  anzahl?: number;
  art?: string;
}

export interface PaxMoebel extends MoebelBasis {
  typ: 'pax';
  einteilung_von_unten: PaxSegment[];
}

export interface SchrankMoebel extends MoebelBasis {
  typ: 'schrank';
  tueren: {
    art: string;
    anzahl: number;
    anordnung?: string;
    /** Wie viele Fächer hinter jeder Tür liegen, von unten gezählt, z. B. [2, 2, 1] */
    faecher_je_tuer_von_unten?: number[];
  };
  faecher: number;
}

export type Moebel = KallaxMoebel | PaxMoebel | SchrankMoebel;
export type MoebelTyp = Moebel['typ'];

export interface Schiebetueren {
  id: string;
  ueber: string[];
  anzahl: number;
  breite_je: number;
  schiene?: string;
}

export interface FreiePosition {
  id: string;
  name: string;
  /** Beschreibung, wo das ist */
  ort?: string;
  x?: number;
  y?: number;
  durchmesser?: number;
  hoehe?: number;
  position_geschaetzt?: boolean;
  /** Gegenstände, die beim ersten Start automatisch angelegt werden */
  inhalt?: string[];
}

/** Zusätzliche Box, die in einem beliebigen Fach/Boden/Korb steht (in der App anlegbar). */
export interface ZusatzBox {
  id: string;
  name: string;
  /** Orts-ID, in der die Box steht */
  in: string;
}

export interface KellerConfig {
  raum: Raum;
  moebel: Moebel[];
  schiebetueren?: Schiebetueren;
  freie_positionen: FreiePosition[];
  /** optional: zusätzliche Boxen */
  boxen?: ZusatzBox[];
  /** optional: eigene Namen für Orte, z. B. { "kallax-3x4/r2c3/box": "Elektro" } */
  bezeichnungen?: Record<string, string>;
}
