// App-Rahmen: Routing, untere Navigation (Daumenbereich), Toasts, Update-Hinweis.
import { lazy, Suspense, useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { useKeller } from './state/KellerContext';
import { links, useRoute } from './router';
import { Icon, type IconName } from './components/Icon';
import { Uebersicht } from './views/Uebersicht';
import { OrtSeite } from './views/OrtSeite';
import { Suche } from './views/Suche';
import { Entnommen } from './views/Entnommen';
import { GegenstandSeite } from './views/GegenstandSeite';
import { Scan } from './views/Scan';
import { Etiketten } from './views/Etiketten';
import { Mehr } from './views/Mehr';
import { Einrichtung } from './views/Einrichtung';

// 3D wird erst beim Öffnen geladen (Three.js ist groß); der Service Worker cacht es trotzdem vorab.
const Ansicht3D = lazy(() => import('./raum3d/Ansicht3D'));

export function App() {
  const { geladen, gegenstaende } = useKeller();
  const { pfad, query } = useRoute();
  const bereich = pfad[0] ?? '';

  // Beim Seitenwechsel nach oben scrollen
  useEffect(() => {
    if (!query.get('g')) window.scrollTo(0, 0);
  }, [pfad.join('/')]);

  if (!geladen) return <div className="laden">Lade Keller …</div>;

  let ansicht;
  switch (bereich) {
    case 'ort':
      ansicht = <OrtSeite key={pfad.slice(1).join('/')} id={pfad.slice(1).join('/')} query={query} />;
      break;
    case 'g':
      ansicht = <GegenstandSeite key={pfad[1]} id={pfad[1]} />;
      break;
    case 'suche':
      // Tippen ändert den Hash per replaceState (kein hashchange) → key wechselt nur bei Navigation von außen
      ansicht = <Suche key={query.get('q') ?? ''} query={query} />;
      break;
    case 'entnommen':
      ansicht = <Entnommen />;
      break;
    case 'scan':
      ansicht = <Scan />;
      break;
    case 'etiketten':
      ansicht = <Etiketten query={query} />;
      break;
    case 'mehr':
      ansicht = <Mehr />;
      break;
    case '3d':
      ansicht = (
        <Suspense fallback={<div className="laden">Lade 3D …</div>}>
          {/* neuer Ort-Link → neu aufbauen, damit Auswahl und Kamerafahrt greifen */}
          <Ansicht3D key={query.get('ort') ?? ''} query={query} />
        </Suspense>
      );
      break;
    case 'einrichtung':
      ansicht = <Einrichtung key={pfad.join('/') + query} pfad={pfad.slice(1)} query={query} />;
      break;
    default:
      ansicht = <Uebersicht />;
  }

  const entnommen = gegenstaende.filter((g) => g.status === 'entnommen').length;
  const aktiv = (b: string[]) => b.includes(bereich);

  return (
    <div className="app">
      <main>{ansicht}</main>
      <nav className="nav" aria-label="Hauptnavigation">
        <NavLink href={links.start} icon="baum" text="Übersicht" aktiv={aktiv(['', 'ort', 'g', '3d'])} />
        <NavLink href={links.suche()} icon="suche" text="Suche" aktiv={aktiv(['suche'])} />
        <NavLink href={links.scan} icon="scan" text="Scannen" aktiv={aktiv(['scan'])} gross />
        <NavLink href={links.entnommen} icon="hand" text="Entnommen" aktiv={aktiv(['entnommen'])} badge={entnommen} />
        <NavLink href={links.mehr} icon="mehr" text="Mehr" aktiv={aktiv(['mehr', 'etiketten', 'einrichtung'])} />
      </nav>
      <ToastAnzeige />
      <UpdateHinweis />
    </div>
  );
}

function NavLink(p: { href: string; icon: IconName; text: string; aktiv: boolean; gross?: boolean; badge?: number }) {
  return (
    <a href={p.href} className={`nav-link ${p.aktiv ? 'aktiv' : ''} ${p.gross ? 'nav-gross' : ''}`} aria-current={p.aktiv ? 'page' : undefined}>
      <span className="nav-icon">
        <Icon name={p.icon} size={p.gross ? 26 : 22} />
        {!!p.badge && <span className="badge">{p.badge}</span>}
      </span>
      <span className="nav-text">{p.text}</span>
    </a>
  );
}

function ToastAnzeige() {
  const { toast, zeigeToast } = useKeller();
  if (!toast) return null;
  return (
    <div className="toast glas" role="status" key={toast.id}>
      <span>{toast.text}</span>
      {toast.rueckgaengig && (
        <button
          className="toast-btn"
          onClick={() => {
            toast.rueckgaengig!();
            zeigeToast('Rückgängig gemacht');
          }}
        >
          Rückgängig
        </button>
      )}
    </div>
  );
}

/** Zeigt an, wenn eine neue App-Version geladen wurde (Service Worker). */
function UpdateHinweis() {
  const { zeigeToast } = useKeller();
  const [update, setUpdate] = useState<(() => void) | null>(null);
  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh: () => setUpdate(() => () => updateSW(true)),
      onOfflineReady: () => zeigeToast('Bereit für die Offline-Nutzung'),
    });
  }, [zeigeToast]);
  if (!update) return null;
  return (
    <div className="update glas">
      <span>Neue Version verfügbar</span>
      <button className="btn btn-primaer" onClick={update}>
        Aktualisieren
      </button>
    </div>
  );
}
