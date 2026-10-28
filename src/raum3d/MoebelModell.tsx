// Ein einzelnes Möbel in 3D, frontal von vorne – für die Möbelseite.
// Boxen, Schubladen und Fächer werden direkt angetippt statt über "Reihe/Spalte" gesucht.
// Wird per lazy() geladen (teilt sich den Three.js-Chunk mit der Raumansicht).
import { useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { Moebel3D, Vec3 } from './layout';
import { Licht, MoebelAnsicht, type SzenenAktionen, type SzenenZustand } from './Szene';

const FOV = 35;

interface Props {
  m3d: Moebel3D;
  z: SzenenZustand;
  a: SzenenAktionen;
  /** Tipp ins Leere */
  onLeer: () => void;
}

export default function MoebelModell({ m3d, z, a, onLeer }: Props) {
  // Möbel in den Ursprung legen, Front zeigt zur Kamera (+Z)
  const lokal = useMemo<Moebel3D>(() => ({ ...m3d, lage: { pos: [0, 0, 0], rotY: 0 } }), [m3d]);
  const { breite: B, hoehe: H, tiefe: T } = m3d.m;
  const ziel = useMemo<Vec3>(() => [B / 200, H / 200, T / 200], [B, H, T]);

  return (
    <div className="moebel3d">
      <Canvas
        frameloop="demand"
        dpr={[1, 1.75]}
        camera={{ fov: FOV, near: 0.05, far: 30, position: [ziel[0], ziel[1], 4] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onPointerMissed={onLeer}
      >
        <color attach="background" args={['#070b12']} />
        <Licht />
        {/* Nur leicht drehbar, damit die Front immer gut antippbar bleibt */}
        <OrbitControls
          makeDefault
          target={ziel}
          enablePan={false}
          enableDamping
          dampingFactor={0.12}
          minAzimuthAngle={-0.9}
          maxAzimuthAngle={0.9}
          minPolarAngle={0.6}
          maxPolarAngle={1.85}
        />
        <Einpassen breite={B} hoehe={H} tiefe={T} ziel={ziel} />
        <group scale={0.01}>
          <MoebelAnsicht m3d={lokal} z={z} a={a} />
        </group>
      </Canvas>
    </div>
  );
}

/** Kamera so weit zurücksetzen, dass das ganze Möbel (inkl. herausgezogener Boxen) ins Bild passt. */
function Einpassen({ breite, hoehe, tiefe, ziel }: { breite: number; hoehe: number; tiefe: number; ziel: Vec3 }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const aspekt = size.width / size.height;
    const t = Math.tan(((FOV / 2) * Math.PI) / 180);
    // etwas Rand, damit herausgezogene Boxen nicht abgeschnitten werden
    const h = (hoehe / 100) * 1.12;
    const b = (breite / 100) * 1.25;
    const abstand = Math.max(h / (2 * t), b / (2 * t * aspekt)) + tiefe / 200;
    camera.fov = FOV;
    camera.position.set(ziel[0], ziel[1] + 0.05, ziel[2] + abstand);
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.set(...ziel);
      controls.minDistance = abstand * 0.45;
      controls.maxDistance = abstand * 1.5;
      controls.update();
    }
    invalidate();
  }, [camera, size, controls, breite, hoehe, tiefe, ziel, invalidate]);
  return null;
}
