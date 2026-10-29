// Auswahl eines Ablageorts als Sheet (zum Erfassen oder Verschieben), mit Suche und zuletzt genutzten Orten.
import { useEffect, useMemo, useState } from 'react';
import { useKeller } from '../state/KellerContext';
import { pfadText, TYP_LABEL } from '../config/orte';
import { normalisieren } from '../lib/text';
import { db } from '../db/db';
import { Icon } from './Icon';
import { Sheet } from './Ios';

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
      <button className="zeile zeile-zweizeilig" onClick={() => onWahl(id)}>
        <span className="zeile-text">
          <span className="zeile-titel">{orte.get(id)!.name}</span>
          <span className="zeile-unter">
            {TYP_LABEL[orte.get(id)!.typ]} · {pfadText(orte, id, ' › ')}
          </span>
        </span>
      </button>
    </li>
  );

  return (
    <Sheet titel={titel} gross onClose={onAbbrechen}>
      <label className="suchfeld-ios">
        <Icon name="suche" size={17} />
        <input placeholder="Ort suchen" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Ort suchen" />
      </label>
      {!q && zuletzt.length > 0 && (
        <>
          <h3 className="gruppe-titel">Zuletzt</h3>
          <ul className="gruppe wahl-liste">{zuletzt.filter((id) => id !== ausser).map(zeile)}</ul>
          <h3 className="gruppe-titel">Alle Orte</h3>
        </>
      )}
      {liste.length > 0 && <ul className="gruppe wahl-liste">{liste.map(({ o }) => zeile(o.id))}</ul>}
      {!liste.length && <p className="leer">Kein Ort gefunden.</p>}
    </Sheet>
  );
}
