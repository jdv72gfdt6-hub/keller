// Eine Zeile pro Gegenstand: antippen öffnet Details, rechts der große Entnehmen/Zurücklegen-Knopf.
import type { Gegenstand } from '../db/db';
import { pfadText } from '../config/orte';
import { links } from '../router';
import { useKeller } from '../state/KellerContext';
import { relativ } from '../lib/text';
import { Icon } from './Icon';

interface Props {
  g: Gegenstand;
  /** Ort mit anzeigen (Suche, Entnommen-Liste) */
  mitOrt?: boolean;
  markiert?: boolean;
  /** Linkziel beim Antippen (Standard: Detailseite des Gegenstands) */
  ziel?: string;
}

export function GegenstandZeile({ g, mitOrt, markiert, ziel }: Props) {
  const { orte, statusSetzen } = useKeller();
  const entnommen = g.status === 'entnommen';
  return (
    <li className={`gz ${entnommen ? 'gz-entnommen' : ''} ${markiert ? 'gz-markiert' : ''}`} id={`g-${g.id}`}>
      <a className="gz-haupt" href={ziel ?? links.gegenstand(g.id)}>
        <span className="gz-name">
          {g.menge > 1 && <span className="gz-menge">{g.menge}×</span>}
          {g.name}
          {g.fotoId && (
            <span className="gz-foto" title="Foto vorhanden">
              <Icon name="kamera" size={14} />
            </span>
          )}
        </span>
        <span className="gz-meta">
          {entnommen && <span className="tag tag-orange">entnommen {relativ(g.entnommenAm)}</span>}
          {g.kategorie && <span className="tag">{g.kategorie}</span>}
          {mitOrt && <span className="gz-ort">{pfadText(orte, g.ortId)}</span>}
        </span>
      </a>
      <button
        className={`gz-status ${entnommen ? 'gz-status-zurueck' : ''}`}
        onClick={() => statusSetzen(g.id, entnommen ? 'vorhanden' : 'entnommen')}
        aria-label={entnommen ? `${g.name} zurücklegen` : `${g.name} entnehmen`}
      >
        <Icon name={entnommen ? 'download' : 'upload'} size={18} />
        <span>{entnommen ? 'Zurück' : 'Raus'}</span>
      </button>
    </li>
  );
}
