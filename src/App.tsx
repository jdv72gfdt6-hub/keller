// App-Rahmen: Routing, schwebende Tab-Leiste aus Glas, Toasts, Update-Hinweis.
// Gegenstände (#/g/<id>) öffnen als Sheet über der Seite, von der aus sie angetippt wurden.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { useKeller } from './state/KellerContext';
import { links, useRoute, type Route } from './router';
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
import { FreiePositionen } from './views/FreiePositionen';

// 3D wird erst beim Öffnen geladen (Three.js ist groß); der Service Worker cacht es trotzdem vorab.
const Ansicht3D = lazy(() => import('./raum3d/Ansicht3D'));

const START: Route = { pfad: [], query: new URLSearchParams() };

function ansichtFuer({ pfad, query }: Route) {
  switch (pfad[0] ?? '') {
    case 'ort':
      return <OrtSeite key={pfad.slice(1).join('/')} id={pfad.slice(1).join('/')} query={query} />;
    case 'suche':
      // Tippen ändert den Hash per replaceState (kein hashchange) → key wechselt nur bei Navigation von außen
      return <Suche key={(query.get('q') ?? '') + query.get('alle')} query={query} />;
    case 'entnommen':
      return <Entnommen />;
    case 'scan':
      return <Scan />;
    case 'etiketten':
      return <Etiketten query={query} />;
    case 'mehr':
      return <Mehr />;
    case 'frei':
      return <FreiePositionen />;
    case '3d':
      return (
        <Suspense fallback={<div className="laden">Lade 3D …</div>}>
          {/* neuer Ort-Link → neu aufbauen, damit Auswahl und Kamerafahrt greifen */}
          <Ansicht3D key={query.get('ort') ?? ''} query={query} />
        </Suspense>
      );
    case 'einrichtung':
      return <Einrichtung key={pfad.join('/') + query} pfad={pfad.slice(1)} query={query} />;
    default:
      return <Uebersicht />;
  }
}

export function App() {
  const { geladen, gegenstaende } = useKeller();
  const route = useRoute();
  const gegenstandId = route.pfad[0] === 'g' ? route.pfad[1] : null;

  // Seite unter dem Gegenstand-Sheet: die zuletzt offene Seite (bei direktem Aufruf die Übersicht)
  const hintergrund = useRef<Route>(START);
  if (!gegenstandId) hintergrund.current = route;
  const basis = gegenstandId ? hintergrund.current : route;
  const bereich = basis.pfad[0] ?? '';

  // Beim Seitenwechsel nach oben scrollen (nicht beim Öffnen/Schließen eines Sheets)
  const basisKey = basis.pfad.join('/');
  useEffect(() => {
    if (!basis.query.get('g')) window.scrollTo(0, 0);
  }, [basisKey]);

  if (!geladen) return <div className="laden">Lade Keller …</div>;

  const entnommen = gegenstaende.filter((g) => g.status === 'entnommen').length;
  const aktiv = (b: string[]) => b.includes(bereich);

  return (
    <div className={`app ${bereich === '3d' ? 'app-3d' : ''}`}>
      <main>{ansichtFuer(basis)}</main>
      <nav className="tableiste glas" aria-label="Hauptnavigation">
        <TabLink href={links.start} icon="haus" text="Übersicht" aktiv={aktiv(['', 'ort', '3d', 'frei'])} />
        <TabLink href={links.suche()} icon="suche" text="Suche" aktiv={aktiv(['suche'])} />
        <TabLink href={links.scan} icon="scan" text="Scannen" aktiv={aktiv(['scan'])} />
        <TabLink href={links.entnommen} icon="raus" text="Entnommen" aktiv={aktiv(['entnommen'])} badge={entnommen} />
        <TabLink href={links.mehr} icon="mehrKreis" text="Mehr" aktiv={aktiv(['mehr', 'etiketten', 'einrichtung'])} />
      </nav>
      {gegenstandId && <GegenstandSeite key={gegenstandId} id={gegenstandId} />}
      <ToastAnzeige />
      <UpdateHinweis />
    </div>
  );
}

function TabLink(p: { href: string; icon: IconName; text: string; aktiv: boolean; badge?: number }) {
  return (
    <a href={p.href} className={`tab ${p.aktiv ? 'aktiv' : ''}`} aria-current={p.aktiv ? 'page' : undefined}>
      <span className="tab-icon">
        <Icon name={p.icon} size={24} />
        {!!p.badge && <span className="badge">{p.badge}</span>}
      </span>
      <span className="tab-text">{p.text}</span>
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
