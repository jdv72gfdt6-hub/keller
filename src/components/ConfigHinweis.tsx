// Hinweis, wenn keller.config.json geändert wurde, nachdem Möbel in der App bearbeitet wurden.
import { useKeller } from '../state/KellerContext';

export function ConfigHinweis() {
  const { dateiGeaendert, configAufDateiZuruecksetzen, overlayBehalten, zeigeToast } = useKeller();
  if (!dateiGeaendert) return null;
  return (
    <div className="hinweis">
      <p>
        <b>keller.config.json wurde geändert.</b> Du hast die Möbel aber auch in der App bearbeitet. Welche Version soll gelten?
      </p>
      <div className="leiste">
        <button
          className="btn btn-primaer"
          onClick={async () => {
            if (!confirm('App-Änderungen an Möbeln verwerfen und die Datei übernehmen?')) return;
            await configAufDateiZuruecksetzen();
            zeigeToast('Config aus Datei übernommen');
          }}
        >
          Datei übernehmen
        </button>
        <button className="btn" onClick={() => overlayBehalten()}>
          App-Version behalten
        </button>
      </div>
    </div>
  );
}
