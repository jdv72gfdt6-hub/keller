// Vollbild-Auswahl eines Ablageorts (zum Erfassen oder Verschieben), mit Suche und zuletzt genutzten Orten.
import { useEffect, useMemo, useState } from 'react';
import { useKeller } from '../state/KellerContext';
import { pfadText, TYP_LABEL } from '../config/orte';
import { normalisieren } from '../lib/text';
import { db } from '../db/db';
import { Icon } from './Icon';

export async function zuletztGenutztMerken(ortId: string) {
  const alt = (await db.einstellung<string[]>('zuletztOrte')) ?? [];
  await db.einstellungSetzen('zuletztOrte', [ortId, ...alt.filter((x) => x !== ortId)].slice(0, 6));
}

interface Props {
  titel: string;
  ausser?: string;
  onWahl: (ortId: string) => void;
  onAbbrechen: () => void;
}

export function OrtWahl({ titel, ausser, onWahl, onAbbrechen }: Props) {
  const { orte } = useKeller();
  const [q, setQ] = useState('');
  const [zuletzt, setZuletzt] = useState<string[]>([]);

  useEffect(() => {
    db.einstellung<string[]>('zuletztOrte').then((z) => setZuletzt((z ?? []).filter((id) => orte.get(id)?.ablage)));
  }, [orte]);

  const liste = useMemo(() => {
    const tokens = normalisieren(q).split(/\s+/).filter(Boolean);
    return [...orte.values()]
      .filter((o) => o.ablage && o.id !== ausser)
      .map((o) => ({ o, text: pfadText(orte, o.id) }))
      .filter(({ text }) => {
        const n = normalisieren(text);
        return tokens.every((t) => n.includes(t));
      });
  }, [orte, q, ausser]);

  const zeile = (id: string) => (
    <li key={id}>
      <button className="wahl-zeile" onClick={() => onWahl(id)}>
        <span className="wahl-typ">{TYP_LABEL[orte.get(id)!.typ]}</span>
        <span>{pfadText(orte, id)}</span>
      </button>
    </li>
  );

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={titel}>
      <header className="overlay-kopf">
        <button className="icon-btn" onClick={onAbbrechen} aria-label="Abbrechen">
          <Icon name="x" />
        </button>
        <h2>{titel}</h2>
      </header>
      <input className="suchfeld" placeholder="Ort suchen …" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <div className="overlay-inhalt">
        {!q && zuletzt.length > 0 && (
          <>
            <h3 className="abschnitt">Zuletzt</h3>
            <ul className="wahl-liste">{zuletzt.filter((id) => id !== ausser).map(zeile)}</ul>
            <h3 className="abschnitt">Alle Orte</h3>
          </>
        )}
        <ul className="wahl-liste">{liste.map(({ o }) => zeile(o.id))}</ul>
        {!liste.length && <p className="leer">Kein Ort gefunden.</p>}
      </div>
    </div>
  );
}
