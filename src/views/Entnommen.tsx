// "Gerade entnommen": alles, was nicht an seinem Platz ist – neueste zuerst.
import { useKeller } from '../state/KellerContext';
import { GegenstandZeile } from '../components/GegenstandZeile';
import { Seitenkopf } from '../components/Ios';

export function Entnommen() {
  const { gegenstaende } = useKeller();
  const liste = gegenstaende
    .filter((g) => g.status === 'entnommen')
    .sort((a, b) => (b.entnommenAm ?? '').localeCompare(a.entnommenAm ?? ''));

  return (
    <div className="seite">
      <Seitenkopf
        titel="Entnommen"
        unter={<p className="gedimmt">{liste.length ? `${liste.length} nicht an ihrem Platz · nach rechts wischen zum Zurücklegen` : ''}</p>}
      />
      {liste.length ? (
        <ul className="gruppe gz-liste">
          {liste.map((g) => (
            <GegenstandZeile key={g.id} g={g} mitOrt />
          ))}
        </ul>
      ) : (
        <p className="leer zentriert">Alles ist an seinem Platz.</p>
      )}
    </div>
  );
}
