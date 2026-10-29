// Freie Positionen (Koffer, Leiter, Reifen …) als Liste.
import { useKeller } from '../state/KellerContext';
import { RAUM_ID } from '../config/orte';
import { links, zurueck } from '../router';
import { Icon, RundSymbol } from '../components/Icon';
import { Seitenkopf } from '../components/Ios';

export function FreiePositionen() {
  const { orte, zaehlung } = useKeller();
  const frei = orte.get(RAUM_ID)!.kinder.map((id) => orte.get(id)!).filter((o) => o.typ === 'frei');
  return (
    <div className="seite">
      <Seitenkopf titel="Freie Positionen" zurueck={{ text: 'Mein Keller', onClick: () => zurueck(links.start) }} />
      <ul className="gruppe">
        {frei.map((o) => (
          <li key={o.id}>
            <a className="zeile zeile-zweizeilig" href={links.ort(o.id)}>
              <RundSymbol glyph="koffer" farbe="gruen" />
              <span className="zeile-text">
                <span className="zeile-titel">{o.name}</span>
                {o.info && <span className="zeile-unter">{o.info}</span>}
              </span>
              <span className="zeile-wert">{zaehlung(o.id).gesamt}</span>
              <Icon name="weiter" size={18} />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
