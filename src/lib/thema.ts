// Hell/Dunkel: folgt dem System, lässt sich unter "Mehr" fest auf Hell oder Dunkel stellen.
// Das Attribut data-theme setzt schon ein kleines Skript in index.html (kein Aufblitzen beim Start).
import { useEffect, useState } from 'react';

export type ThemaWahl = 'system' | 'hell' | 'dunkel';

const KEY = 'keller.thema';
const EVENT = 'keller-thema';
const dunkelMedia = () => window.matchMedia('(prefers-color-scheme: dark)');

export function themaLaden(): ThemaWahl {
  try {
    const t = localStorage.getItem(KEY);
    if (t === 'hell' || t === 'dunkel') return t;
  } catch {
    /* privater Modus o. Ä. */
  }
  return 'system';
}

function istDunkel(wahl = themaLaden()): boolean {
  return wahl === 'dunkel' || (wahl === 'system' && dunkelMedia().matches);
}

/** Statusleiste/Browserleiste an den Modus anpassen */
function metaAnpassen() {
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', istDunkel() ? '#000000' : '#f2f2f7');
}

export function themaSetzen(wahl: ThemaWahl) {
  try {
    if (wahl === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, wahl);
  } catch {
    /* ignorieren */
  }
  const root = document.documentElement;
  if (wahl === 'system') delete root.dataset.theme;
  else root.dataset.theme = wahl === 'hell' ? 'light' : 'dark';
  metaAnpassen();
  window.dispatchEvent(new Event(EVENT));
}

/** Aktuell wirksamer Modus (für die 3D-Szene, die keine CSS-Variablen kennt). */
export function useDunkel(): boolean {
  const [dunkel, setDunkel] = useState(istDunkel);
  useEffect(() => {
    const mq = dunkelMedia();
    const f = () => {
      setDunkel(istDunkel());
      metaAnpassen();
    };
    mq.addEventListener('change', f);
    window.addEventListener(EVENT, f);
    return () => {
      mq.removeEventListener('change', f);
      window.removeEventListener(EVENT, f);
    };
  }, []);
  return dunkel;
}
