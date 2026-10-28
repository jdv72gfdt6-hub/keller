// 3D-Szene mit React Three Fiber. Alles innerhalb der Wurzelgruppe ist in cm (Skalierung 0.01 â†’ Meter).
// Performance: gerendert wird nur bei Bedarf (frameloop="demand"); alle Quader teilen sich eine
// Einheits-Geometrie, Materialien werden wiederverwendet, keine Schatten.
import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Edges, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { Gegenstand } from '../db/db';
import { normalisieren } from '../lib/text';
import {
  groesse,
  mitte,
  quader,
  schiebeSlot,
  type Drehtuer3D,
  type Element3D,
  type Frei3D,
  type Moebel3D,
  type Quader,
  type Raum3D,
  type Schiebe3D,
  type Vec3,
} from './layout';

// ---------- Gemeinsame Geometrien & Materialien ----------

const EINHEIT = new THREE.BoxGeometry(1, 1, 1);
const EINHEIT_KANTEN = new THREE.EdgesGeometry(EINHEIT);
const ZYLINDER = new THREE.CylinderGeometry(0.5, 0.5, 1, 20);

const NEON = '#3ef0ff';
const AUSWAHL = '#ff4fd8';

const MAT = {
  boden: new THREE.MeshStandardMaterial({ color: '#0b111b', roughness: 1 }),
  wand: new THREE.MeshBasicMaterial({ color: NEON, transparent: true, opacity: 0.025, side: THREE.DoubleSide, depthWrite: false }),
  unsichtbar: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  rueckwand: new THREE.MeshStandardMaterial({ color: '#161b24', roughness: 1 }),
  schiebetuer: new THREE.MeshStandardMaterial({ color: '#172131', metalness: 0.4, roughness: 0.35, transparent: true, opacity: 0.88 }),
  griff: new THREE.MeshStandardMaterial({ color: '#2a2f38', metalness: 0.6, roughness: 0.4 }),
  griffloch: new THREE.MeshBasicMaterial({ color: '#0a0c10' }),
  korb: new THREE.MeshStandardMaterial({ color: '#aab4c0', transparent: true, opacity: 0.16, depthWrite: false }),
  metall: new THREE.MeshStandardMaterial({ color: '#d0d6de', metalness: 0.8, roughness: 0.3 }),
  inhalt: new THREE.MeshBasicMaterial({ color: NEON, transparent: true, opacity: 0.1, depthWrite: false }),
  reifen: new THREE.MeshStandardMaterial({ color: '#15171b', roughness: 0.9 }),
  felge: new THREE.MeshStandardMaterial({ color: '#7d8590', metalness: 0.7, roughness: 0.35 }),
  zusatzbox: new THREE.MeshStandardMaterial({ color: '#6f5cff', roughness: 0.7 }),
  objekt: new THREE.MeshStandardMaterial({ color: '#4b5568', roughness: 0.7 }),
};

const LINIE = {
  raum: new THREE.LineBasicMaterial({ color: NEON, transparent: true, opacity: 0.35 }),
  moebel: new THREE.LineBasicMaterial({ color: NEON, transparent: true, opacity: 0.22 }),
  tuer: new THREE.LineBasicMaterial({ color: AUSWAHL, transparent: true, opacity: 0.7 }),
  gitter: new THREE.LineBasicMaterial({ color: NEON, transparent: true, opacity: 0.06 }),
  auswahl: new THREE.LineBasicMaterial({ color: AUSWAHL }),
  treffer: new THREE.LineBasicMaterial({ color: NEON, transparent: true, opacity: 1 }),
  flaeche: new THREE.LineBasicMaterial({ color: NEON, transparent: true, opacity: 0.3 }),
};

const GLOW = {
  auswahl: new THREE.MeshBasicMaterial({ color: AUSWAHL, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending }),
  treffer: new THREE.MeshBasicMaterial({ color: NEON, transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending }),
};

const farbCache = new Map<string, THREE.MeshStandardMaterial>();
function farbMat(farbe: string): THREE.MeshStandardMaterial {
  let m = farbCache.get(farbe);
  if (!m) farbCache.set(farbe, (m = new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.75 })));
  return m;
}

// ---------- Hilfen ----------

/** Klick nur auslösen, wenn nicht gedreht/verschoben wurde. */
function tippen(fn: () => void) {
  return (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 8) return;
    fn();
  };
}

/** Weiche Animation eines Zahlenwerts; rendert nur, solange er sich bewegt. */
function useGlatt(ziel: number, setze: (v: number) => void, start = 0, tempo = 9) {
  const wert = useRef(start);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [ziel, invalidate]);
  useFrame((_, dt) => {
    const v = wert.current;
    if (v === ziel) return;
    const neu = Math.abs(v - ziel) < 0.02 ? ziel : THREE.MathUtils.damp(v, ziel, tempo, Math.min(dt, 1 / 30));
    wert.current = neu;
    setze(neu);
    invalidate();
  });
}

function Kasten({ q, mat, onTap, kanten }: { q: Quader; mat: THREE.Material; onTap?: () => void; kanten?: string }) {
  return (
    <mesh position={mitte(q)} scale={groesse(q)} geometry={EINHEIT} material={mat} onClick={onTap && tippen(onTap)}>
      {kanten && <Edges color={kanten} />}
    </mesh>
  );
}

/** Kantenrahmen um einen Quader, optional mit Leuchtvolumen. */
function Rahmen({ q, linie, glow, rand = 0 }: { q: Quader; linie: THREE.LineBasicMaterial; glow?: THREE.Material; rand?: number }) {
  const g = groesse(q).map((x) => x + rand) as Vec3;
  return (
    <>
      <lineSegments position={mitte(q)} scale={g} geometry={EINHEIT_KANTEN} material={linie} />
      {glow && <mesh position={mitte(q)} scale={g} geometry={EINHEIT} material={glow} raycast={() => null} />}
    </>
  );
}

// ---------- Szene ----------

export interface SzenenZustand {
  auswahl: string | null;
  ausgezogen: string | null;
  schiebeOffen: string | null;
  tueren: Set<string>;
  hervor: Set<string>;
  /** Orts-IDs mit Inhalt (für dezentes Leuchten offener Fächer) */
  mitInhalt: Set<string>;
  /** Offene Fächer, Böden und Stangen mit dezentem Umriss als antippbar kennzeichnen (Einzelmöbel-Ansicht) */
  flaechenZeigen?: boolean;
  /** Gegenstände je freier Position (Koffer werden einzeln gezeichnet) */
  freiInhalt: Map<string, Gegenstand[]>;
}

export interface SzenenAktionen {
  waehle: (ortId: string) => void;
  drehtuer: (tuerId: string) => void;
  schiebe: (moebelId: string) => void;
}

export interface KameraAuftrag {
  nr: number;
  pos: Vec3;
  ziel: Vec3;
}

/** Beschriftung im Raum (Weltposition in Metern) */
export interface Beschriftung {
  text: string;
  pos: Vec3;
  klein?: boolean;
}

interface Props {
  r: Raum3D;
  z: SzenenZustand;
  a: SzenenAktionen;
  start: { pos: Vec3; ziel: Vec3 };
  kamera: KameraAuftrag | null;
  beschriftungen: Beschriftung[];
  /** DOM-Ebene mit einem Kind-Element pro Beschriftung (gleiche Reihenfolge) */
  beschriftungsEbene: RefObject<HTMLDivElement | null>;
}

/** Gemeinsame Beleuchtung für Raum- und Einzelmöbel-Ansicht */
export function Licht() {
  return (
    <>
      <hemisphereLight args={['#cfeeff', '#1a1222', 1.1]} />
      <directionalLight position={[2.5, 4, 1.5]} intensity={1.3} />
      <directionalLight position={[-1, 2, 3]} intensity={0.35} color="#9fd8ff" />
    </>
  );
}

export function Szene({ r, z, a, start, kamera, beschriftungen, beschriftungsEbene }: Props) {
  return (
    <>
      <color attach="background" args={['#05080e']} />
      <Licht />
      <OrbitControls
        makeDefault
        target={start.ziel}
        enableDamping
        dampingFactor={0.12}
        minDistance={0.25}
        maxDistance={9}
        maxPolarAngle={Math.PI * 0.95}
      />
      <Blickfeld />
      <KameraFuehrung auftrag={kamera} />
      <Pulsieren aktiv={z.hervor.size > 0} />
      <Beschriftungen liste={beschriftungen} ebene={beschriftungsEbene} />
      <group scale={0.01}>
        <RaumHuelle r={r} />
        {r.moebel.map((m3d) => (
          <MoebelAnsicht key={m3d.m.id} m3d={m3d} z={z} a={a} />
        ))}
        {r.schiebe && <SchiebeTueren s={r.schiebe} offen={z.schiebeOffen} a={a} />}
        {r.frei.map((f) => (
          <FreiAnsicht key={f.fp.id} f={f} z={z} a={a} />
        ))}
      </group>
    </>
  );
}

/** Hochformat braucht ein weiteres Sichtfeld, sonst sieht man nur einen schmalen Ausschnitt. */
function Blickfeld() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    camera.fov = size.width / size.height < 0.8 ? 68 : 50;
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size, invalidate]);
  return null;
}

const tmpPos = new THREE.Vector3();
const tmpZiel = new THREE.Vector3();

/** Fährt die Kamera weich zu einem Ziel; bricht ab, sobald der Nutzer selbst dreht. */
function KameraFuehrung({ auftrag }: { auftrag: KameraAuftrag | null }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const invalidate = useThree((s) => s.invalidate);
  const aktiv = useRef(false);

  useEffect(() => {
    if (auftrag) {
      aktiv.current = true;
      invalidate();
    }
  }, [auftrag, invalidate]);

  useEffect(() => {
    if (!controls) return;
    const stop = () => (aktiv.current = false);
    controls.addEventListener('start', stop);
    return () => controls.removeEventListener('start', stop);
  }, [controls]);

  useFrame((_, dt) => {
    if (!aktiv.current || !auftrag || !controls) return;
    const k = 1 - Math.exp(-5 * Math.min(dt, 1 / 30));
    tmpPos.set(...auftrag.pos);
    tmpZiel.set(...auftrag.ziel);
    camera.position.lerp(tmpPos, k);
    controls.target.lerp(tmpZiel, k);
    controls.update();
    if (camera.position.distanceTo(tmpPos) < 0.005 && controls.target.distanceTo(tmpZiel) < 0.005) aktiv.current = false;
    else invalidate();
  });
  return null;
}

/** Lässt die Rahmen von Suchtreffern pulsieren (nur solange es Treffer gibt). */
function Pulsieren({ aktiv }: { aktiv: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [aktiv, invalidate]);
  useFrame(({ clock }) => {
    if (!aktiv) return;
    const p = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 4);
    LINIE.treffer.opacity = 0.45 + 0.55 * p;
    GLOW.treffer.opacity = 0.06 + 0.14 * p;
    invalidate();
  });
  return null;
}

const tmpProj = new THREE.Vector3();

/**
 * Positioniert die Beschriftungen (normale DOM-Elemente über dem Canvas) bei jedem gerenderten Frame.
 * Bewusst ohne drei/<Html>: dessen eigene DOM-Wurzeln kollidieren beim Verlassen der Ansicht mit React.
 */
function Beschriftungen({ liste, ebene }: { liste: Beschriftung[]; ebene: RefObject<HTMLDivElement | null> }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useFrame(() => {
    const kinder = ebene.current?.children;
    if (!kinder) return;
    liste.forEach((b, i) => {
      const el = kinder[i] as HTMLElement | undefined;
      if (!el) return;
      tmpProj.set(...b.pos).project(camera);
      const sichtbar = tmpProj.z < 1 && Math.abs(tmpProj.x) < 1.2 && Math.abs(tmpProj.y) < 1.2;
      el.style.display = sichtbar ? '' : 'none';
      if (sichtbar) {
        const x = ((tmpProj.x + 1) / 2) * size.width;
        const y = ((1 - tmpProj.y) / 2) * size.height;
        el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      }
    });
  });
  return null;
}

// ---------- Raum ----------

function RaumHuelle({ r }: { r: Raum3D }) {
  const { laenge: L, breite: B, hoehe: H } = r.raum;
  // Bodenraster alle 20 cm
  const gitter = useMemo(() => {
    const p: number[] = [];
    for (let x = 0; x <= L; x += 20) p.push(x, 0.2, 0, x, 0.2, B);
    for (let z = 0; z <= B; z += 20) p.push(0, 0.2, z, L, 0.2, z);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    return g;
  }, [L, B]);
  useEffect(() => () => gitter.dispose(), [gitter]);

  return (
    <group>
      <mesh position={[L / 2, 0, B / 2]} rotation-x={-Math.PI / 2} scale={[L, B, 1]} material={MAT.boden}>
        <planeGeometry />
      </mesh>
      <lineSegments geometry={gitter} material={LINIE.gitter} />
      {/* Wände: kaum sichtbar, damit man von außen hineinschauen kann */}
      <mesh position={[L / 2, H / 2, 0]} scale={[L, H, 1]} material={MAT.wand} raycast={() => null}>
        <planeGeometry />
      </mesh>
      <mesh position={[L / 2, H / 2, B]} scale={[L, H, 1]} material={MAT.wand} raycast={() => null}>
        <planeGeometry />
      </mesh>
      <mesh position={[L, H / 2, B / 2]} rotation-y={Math.PI / 2} scale={[B, H, 1]} material={MAT.wand} raycast={() => null}>
        <planeGeometry />
      </mesh>
      <Rahmen q={quader(0, 0, 0, L, H, B)} linie={LINIE.raum} />
      {/* Tür in der kurzen Wand bei x = 0 */}
      <Rahmen q={quader(-1, 0, B / 2 - 40, 1, 200, B / 2 + 40)} linie={LINIE.tuer} />
    </group>
  );
}

// ---------- Möbel ----------

export function MoebelAnsicht({ m3d, z, a }: { m3d: Moebel3D; z: SzenenZustand; a: SzenenAktionen }) {
  const { breite: B, hoehe: H, tiefe: T } = m3d.m;
  const korpus = farbMat(m3d.farbe);
  const gewaehlt = z.auswahl === m3d.m.id;
  return (
    <group position={m3d.lage.pos} rotation-y={m3d.lage.rotY}>
      {m3d.bretter.map((q, i) => (
        <Kasten key={i} q={q} mat={korpus} onTap={() => a.waehle(m3d.m.id)} />
      ))}
      {m3d.rueckwand.map((q, i) => (
        <Kasten key={`r${i}`} q={q} mat={MAT.rueckwand} />
      ))}
      <Rahmen q={quader(0, 0, 0, B, H, T)} linie={gewaehlt ? LINIE.auswahl : LINIE.moebel} rand={0.5} />
      {m3d.elemente.map((e) => (
        <ElementAnsicht
          key={e.ortId}
          e={e}
          korpus={korpus}
          raus={z.ausgezogen !== null && (z.ausgezogen === e.ortId || z.ausgezogen === e.mit)}
          gewaehlt={z.auswahl === e.ortId}
          hervor={z.hervor.has(e.ortId)}
          hatInhalt={z.mitInhalt.has(e.ortId)}
          umriss={!!z.flaechenZeigen}
          onTap={() => a.waehle(e.ortId)}
        />
      ))}
      {m3d.drehtueren.map((t) => (
        <Drehtuer
          key={t.id}
          t={t}
          mat={korpus}
          offen={z.tueren.has(t.id)}
          gewaehlt={z.auswahl === t.id}
          hervor={z.hervor.has(t.id)}
          onTap={() => a.drehtuer(t.id)}
        />
      ))}
    </group>
  );
}

interface ElementProps {
  e: Element3D;
  korpus: THREE.Material;
  raus: boolean;
  gewaehlt: boolean;
  hervor: boolean;
  hatInhalt: boolean;
  /** Umriss für unsichtbare Tippflächen (offenes Fach, Boden, Stange) */
  umriss: boolean;
  onTap: () => void;
}

/** Box, Schublade, Korb, Boden, Kleiderstange oder offenes Fach – mit Auszug-Animation. */
function ElementAnsicht({ e, korpus, raus, gewaehlt, hervor, hatInhalt, umriss, onTap }: ElementProps) {
  const ref = useRef<THREE.Group>(null);
  useGlatt(raus ? e.auszug : 0, (v) => ref.current && (ref.current.position.z = v));
  const q = e.q;
  const [w, h] = groesse(q);
  const c = mitte(q);

  let koerper: ReactNode = null;
  switch (e.art) {
    case 'box':
      koerper = (
        <>
          <Kasten q={q} mat={farbMat(e.farbe ?? '#8a93a3')} onTap={onTap} kanten="#00000055" />
          {/* Griffloch vorne */}
          <Kasten q={quader(c[0] - 5, q.max[1] - 7, q.max[2] - 0.05, c[0] + 5, q.max[1] - 4, q.max[2] + 0.1)} mat={MAT.griffloch} />
        </>
      );
      break;
    case 'schublade':
      koerper = (
        <>
          <Kasten q={quader(q.min[0] + 0.6, q.min[1], q.min[2], q.max[0] - 0.6, q.max[1] - 2, q.max[2] - 1.6)} mat={farbMat('#aeb6c2')} onTap={onTap} />
          <Kasten q={quader(q.min[0], q.min[1], q.max[2] - 1.6, q.max[0], q.max[1], q.max[2])} mat={farbMat(e.farbe ?? '#e6ebf2')} onTap={onTap} kanten="#00000033" />
          <Kasten q={quader(c[0] - 8, q.max[1] - 4, q.max[2], c[0] + 8, q.max[1] - 3, q.max[2] + 1.2)} mat={MAT.griff} />
        </>
      );
      break;
    case 'korb':
      koerper = (
        <>
          <Kasten q={q} mat={MAT.korb} onTap={onTap} kanten="#c6ced8" />
          <Kasten q={quader(q.min[0], q.min[1], q.min[2], q.max[0], q.min[1] + 0.4, q.max[2])} mat={MAT.metall} />
        </>
      );
      break;
    case 'boden':
      koerper = (
        <>
          {e.brett && <Kasten q={e.brett} mat={korpus} onTap={onTap} />}
          <Kasten q={q} mat={MAT.unsichtbar} onTap={onTap} />
        </>
      );
      break;
    case 'stange':
      koerper = (
        <>
          <mesh position={[c[0], q.max[1] - 6, c[2]]} rotation-z={Math.PI / 2} scale={[2.6, w, 2.6]} geometry={ZYLINDER} material={MAT.metall} />
          <Kasten q={q} mat={MAT.unsichtbar} onTap={onTap} />
        </>
      );
      break;
    case 'fach':
      koerper = <Kasten q={q} mat={MAT.unsichtbar} onTap={onTap} />;
      break;
    case 'zusatzbox':
      koerper = <Kasten q={q} mat={MAT.zusatzbox} onTap={onTap} kanten="#b9adff" />;
      break;
  }

  // Offene Fächer, Böden und Stangen mit Inhalt leuchten dezent am Boden
  const flaeche = e.art === 'fach' || e.art === 'boden' || e.art === 'stange';
  const glimmen = hatInhalt && flaeche;

  return (
    <group ref={ref}>
      {koerper}
      {umriss && flaeche && !gewaehlt && !hervor && <Rahmen q={q} linie={LINIE.flaeche} rand={-1.5} />}
      {glimmen && <Kasten q={quader(q.min[0] + 1, q.min[1] + 0.1, q.min[2] + 1, q.max[0] - 1, q.min[1] + Math.min(4, h), q.max[2] - 1)} mat={MAT.inhalt} />}
      {gewaehlt && <Rahmen q={q} linie={LINIE.auswahl} glow={GLOW.auswahl} rand={1.5} />}
      {hervor && !gewaehlt && <Rahmen q={q} linie={LINIE.treffer} glow={GLOW.treffer} rand={1.5} />}
    </group>
  );
}

/** Drehtür mit Scharnier links; klappt nach vorne auf. */
function Drehtuer(p: { t: Drehtuer3D; mat: THREE.Material; offen: boolean; gewaehlt: boolean; hervor: boolean; onTap: () => void }) {
  const ref = useRef<THREE.Group>(null);
  useGlatt(p.offen ? -1.75 : 0, (v) => ref.current && (ref.current.rotation.y = v));
  const [w, h, d] = groesse(p.t.q);
  const lokal = quader(0, p.t.q.min[1], 0, w, p.t.q.max[1], d);
  return (
    <group ref={ref} position={[p.t.q.min[0], 0, p.t.q.min[2]]}>
      <Kasten q={lokal} mat={p.mat} onTap={p.onTap} kanten="#3ef0ff40" />
      <Kasten q={quader(w - 5, mitte(lokal)[1] - Math.min(12, h / 4), d, w - 3.5, mitte(lokal)[1] + Math.min(12, h / 4), d + 2)} mat={MAT.metall} />
      {p.gewaehlt && <Rahmen q={lokal} linie={LINIE.auswahl} rand={1} />}
      {p.hervor && !p.gewaehlt && <Rahmen q={lokal} linie={LINIE.treffer} glow={GLOW.treffer} rand={1} />}
    </group>
  );
}

// ---------- Schiebetüren (gemeinsame Schiene) ----------

function SchiebeTueren({ s, offen, a }: { s: Schiebe3D; offen: string | null; a: SzenenAktionen }) {
  return (
    <>
      {s.ueber.map((_, i) => (
        <SchiebeTuer key={i} s={s} i={i} offen={offen} a={a} />
      ))}
    </>
  );
}

function SchiebeTuer({ s, i, offen, a }: { s: Schiebe3D; i: number; offen: string | null; a: SzenenAktionen }) {
  const ref = useRef<THREE.Group>(null);
  // Abwechselnd äußere/innere Spur, damit die Türen aneinander vorbeifahren
  const spur = i % 2 === 0 ? 1 : 0;
  const slot = schiebeSlot(s, i, offen);
  const heim = useMemo(() => s.slot(i, spur), [s, i, spur]);
  const ziel = s.slot(slot, spur);
  useGlatt(ziel[0], (v) => ref.current && (ref.current.position.x = v), heim[0], 7);
  useGlatt(ziel[2], (v) => ref.current && (ref.current.position.z = v), heim[2], 7);
  const q = quader(-s.breite / 2 + 0.3, -s.hoehe / 2, -0.9, s.breite / 2 - 0.3, s.hoehe / 2, 0.9);
  return (
    <group ref={ref} position={heim} rotation-y={s.rotY}>
      <Kasten q={q} mat={MAT.schiebetuer} onTap={() => a.schiebe(s.ueber[slot])} kanten="#3ef0ff66" />
      {/* Griffleiste */}
      <Kasten q={quader(s.breite / 2 - 3, -s.hoehe / 2 + 2, 0.9, s.breite / 2 - 1.5, s.hoehe / 2 - 2, 1.4)} mat={MAT.griff} />
    </group>
  );
}

// ---------- Freie Positionen ----------

const KOFFERFARBEN: [string, string][] = [
  ['rosa', '#ff86c8'],
  ['pink', '#ff86c8'],
  ['schwarz', '#262a31'],
  ['rot', '#e5484d'],
  ['blau', '#4d7cff'],
  ['grun', '#3fbf7f'],
  ['grau', '#8a93a3'],
  ['silber', '#c4cad3'],
  ['weiss', '#e9eef5'],
];

function kofferFarbe(name: string): string {
  const n = normalisieren(name);
  return KOFFERFARBEN.find(([k]) => n.includes(k))?.[1] ?? '#7a5cff';
}

function FreiAnsicht({ f, z, a }: { f: Frei3D; z: SzenenZustand; a: SzenenAktionen }) {
  const tap = () => a.waehle(f.fp.id);
  const [bx, by, bz] = f.basis;
  let koerper: ReactNode;

  if (f.art === 'koffer') {
    const items = (z.freiInhalt.get(f.fp.id) ?? []).slice(0, 6);
    const n = Math.max(1, items.length);
    const plaetze = f.plaetze ?? [];
    koerper = (
      <>
        {(items.length ? items : [null]).map((g, i) => {
          // Je ein Koffer mittig auf einem Möbel; gibt es mehr Koffer als Möbel, wird gestapelt.
          // Ohne Möbelplätze: nebeneinander um den Bezugspunkt.
          const platz = plaetze[i % plaetze.length];
          const pos: Vec3 = platz ? [platz[0], platz[1] + Math.floor(i / plaetze.length) * 23, platz[2]] : [bx, by, bz];
          const x = plaetze.length ? 0 : (i - (n - 1) / 2) * 72;
          const farbe = g ? kofferFarbe(g.name) : '#4b5568';
          return (
            <group key={g?.id ?? i} position={pos} rotation-y={f.rotY}>
              <Kasten q={quader(x - 34, 0.5, -22, x + 34, 23, 22)} mat={farbMat(farbe)} onTap={tap} kanten="#ffffff30" />
              <Kasten q={quader(x - 8, 23, -2, x + 8, 25, 2)} mat={MAT.griff} />
            </group>
          );
        })}
      </>
    );
  } else if (f.art === 'leiter') {
    const h = f.fp.hoehe ?? 180;
    const sprossen = Math.floor(h / 28);
    koerper = (
      // leicht an die Rückwand gelehnt
      <group position={[bx, 0, bz]} rotation-z={-0.12}>
        <Kasten q={quader(-1.5, 0, -23, 1.5, h, -20)} mat={MAT.metall} onTap={tap} />
        <Kasten q={quader(-1.5, 0, 20, 1.5, h, 23)} mat={MAT.metall} onTap={tap} />
        {Array.from({ length: sprossen }, (_, i) => (
          <Kasten key={i} q={quader(-1.5, 20 + i * 28, -20, 1.5, 23 + i * 28, 20)} mat={MAT.metall} onTap={tap} />
        ))}
      </group>
    );
  } else if (f.art === 'reifen') {
    const d = f.fp.durchmesser ?? 63;
    const h = f.fp.hoehe ?? 85;
    const n = Math.max(1, Math.round(h / 21));
    const rh = h / n;
    koerper = (
      <group position={[bx, 0, bz]}>
        {Array.from({ length: n }, (_, i) => (
          <group key={i} position={[0, rh * i + rh / 2, 0]}>
            <mesh scale={[d, rh - 0.8, d]} geometry={ZYLINDER} material={MAT.reifen} onClick={tippen(tap)} />
            <mesh scale={[d * 0.58, rh - 0.4, d * 0.58]} geometry={ZYLINDER} material={MAT.felge} onClick={tippen(tap)} />
          </group>
        ))}
      </group>
    );
  } else {
    koerper = <Kasten q={f.q} mat={MAT.objekt} onTap={tap} kanten={NEON} />;
  }

  const gewaehlt = z.auswahl === f.fp.id;
  const hervor = z.hervor.has(f.fp.id);
  return (
    <>
      {koerper}
      {gewaehlt && <Rahmen q={f.q} linie={LINIE.auswahl} glow={GLOW.auswahl} rand={3} />}
      {hervor && !gewaehlt && <Rahmen q={f.q} linie={LINIE.treffer} glow={GLOW.treffer} rand={3} />}
    </>
  );
}
