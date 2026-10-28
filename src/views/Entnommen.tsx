// "Gerade entnommen": alles, was nicht an seinem Platz ist – neueste zuerst.
import { useKeller } from '../state/KellerContext';
import { GegenstandZeile } from '../components/GegenstandZeile';

export function Entnommen() {
  const { gegenstaende } = useKeller();
  const liste = gegenstaende
    .filter((g) => g.status === 'entnommen')
    .sort((a, b) => (b.entnommenAm ?? '').localeCompare(a.entnommenAm ?? ''));

  return (
    <div className="seite">
      <header className="kopf">
        <div>
          <p className="kopf-ueber">Nicht an ihrem Platz</p>
          <h1>Gerade entnommen</h1>
        </div>
        <span className="zahl gross">{liste.length}</span>
      </header>
      {liste.length ? (
        <ul className="gz-liste">
          {liste.map((g) => (
            <GegenstandZeile key={g.id} g={g} mitOrt />
          ))}
        </ul>
      ) : (
        <p className="leer">Alles ist an seinem Platz. 👌</p>
      )}
    </div>
  );
}
