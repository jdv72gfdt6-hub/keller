// Details eines Gegenstands als Glas-Sheet: bearbeiten, Foto, Ort ändern, Status, löschen.
import { useEffect, useRef, useState } from 'react';
import { useKeller } from '../state/KellerContext';
import { pfadText } from '../config/orte';
import { db } from '../db/db';
import { links, zurueck } from '../router';
import { datumZeit, neueId } from '../lib/text';
import { fotoVerkleinern } from '../lib/dateien';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Ios';
import { OrtWahl } from '../components/OrtWahl';

export function GegenstandSeite({ id }: { id: string }) {
  const { gegenstaende, orte, kategorien, aktualisieren, statusSetzen, loeschen, verschieben, zeigeToast } = useKeller();
  const g = gegenstaende.find((x) => x.id === id);
  const [form, setForm] = useState({ name: '', menge: '1', kategorie: '', notiz: '' });
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [ortWahl, setOrtWahl] = useState(false);
  const fotoInput = useRef<HTMLInputElement>(null);
  const schliessen = () => zurueck(g ? links.ort(g.ortId) : links.start);

  // Formular nur beim Wechsel des Gegenstands befüllen, nicht bei jeder Statusänderung.
  useEffect(() => {
    if (g) setForm({ name: g.name, menge: String(g.menge), kategorie: g.kategorie, notiz: g.notiz });
  }, [g?.id]);

  useEffect(() => {
    let url: string | null = null;
    if (g?.fotoId) {
      db.foto(g.fotoId).then((blob) => {
        if (blob) setFotoUrl((url = URL.createObjectURL(blob)));
      });
    } else setFotoUrl(null);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [g?.fotoId]);

  if (!g) {
    return (
      <Sheet titel="Gegenstand" onClose={schliessen}>
        <p className="leer">Gegenstand nicht gefunden (vielleicht gelöscht).</p>
      </Sheet>
    );
  }

  const geaendert =
    form.name.trim() !== g.name ||
    Number(form.menge) !== g.menge ||
    form.kategorie.trim() !== g.kategorie ||
    form.notiz !== g.notiz;

  async function speichern() {
    if (!form.name.trim()) return zeigeToast('Name darf nicht leer sein');
    await aktualisieren(g!.id, {
      name: form.name.trim(),
      menge: Math.max(1, Math.round(Number(form.menge)) || 1),
      kategorie: form.kategorie.trim(),
      notiz: form.notiz,
    });
    zeigeToast('Gespeichert');
  }

  async function fotoGewaehlt(datei: File | undefined) {
    if (!datei) return;
    try {
      const blob = await fotoVerkleinern(datei);
      const fotoId = neueId();
      await db.fotoSpeichern(fotoId, blob);
      if (g!.fotoId) await db.fotoLoeschen(g!.fotoId);
      await aktualisieren(g!.id, { fotoId });
    } catch (e) {
      zeigeToast(`Foto fehlgeschlagen: ${(e as Error).message}`);
    }
  }

  async function fotoEntfernen() {
    if (!g!.fotoId || !confirm('Foto entfernen?')) return;
    await db.fotoLoeschen(g!.fotoId);
    await aktualisieren(g!.id, { fotoId: undefined });
  }

  const entnommen = g.status === 'entnommen';

  return (
    <Sheet
      titel={g.name}
      gross
      onClose={schliessen}
      rechts={
        geaendert && (
          <button className="glas-knopf rund blau" onClick={speichern} aria-label="Speichern">
            <Icon name="check" size={20} />
          </button>
        )
      }
    >
      <button
        className={`status-gross ${entnommen ? 'ist-entnommen' : ''}`}
        onClick={() => statusSetzen(g.id, entnommen ? 'vorhanden' : 'entnommen')}
      >
        <span className="status-gross-label">{entnommen ? 'Entnommen' : 'Vorhanden'}</span>
        <span className="status-gross-aktion">
          <Icon name={entnommen ? 'rein' : 'raus'} size={20} /> {entnommen ? 'Zurücklegen' : 'Entnehmen'}
        </span>
      </button>

      <div className="gruppe formular">
        <label className="feld">
          <span>Name</span>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="feld">
          <span>Menge</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={form.menge}
            onChange={(e) => setForm({ ...form, menge: e.target.value })}
          />
        </label>
        <label className="feld">
          <span>Kategorie</span>
          <input
            list="kat-detail"
            value={form.kategorie}
            placeholder="keine"
            onChange={(e) => setForm({ ...form, kategorie: e.target.value })}
          />
          <datalist id="kat-detail">
            {kategorien.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
        </label>
        <label className="feld feld-hoch">
          <span>Notiz</span>
          <textarea rows={3} value={form.notiz} placeholder="Notiz" onChange={(e) => setForm({ ...form, notiz: e.target.value })} />
        </label>
      </div>
      {geaendert && (
        <button className="btn btn-primaer breit" onClick={speichern}>
          Speichern
        </button>
      )}

      <h3 className="gruppe-titel">Ort</h3>
      <ul className="gruppe">
        <li>
          <button className="zeile" onClick={() => setOrtWahl(true)}>
            <span className="zeile-titel">{pfadText(orte, g.ortId, ' › ')}</span>
            <span className="zeile-wert">Ändern</span>
            <Icon name="weiter" size={18} />
          </button>
        </li>
        <li>
          <a className="zeile" href={links.ort(g.ortId, `?g=${g.id}`)}>
            <span className="zeile-titel blau">Ort öffnen</span>
          </a>
        </li>
        <li>
          <a className="zeile" href={links.raum3d({ ort: g.ortId })}>
            <span className="zeile-titel blau">In 3D zeigen</span>
          </a>
        </li>
      </ul>

      <h3 className="gruppe-titel">Foto</h3>
      {fotoUrl ? (
        <div className="foto">
          <img src={fotoUrl} alt={g.name} />
          <ul className="gruppe">
            <li>
              <button className="zeile" onClick={() => fotoInput.current?.click()}>
                <span className="zeile-titel blau">Foto ersetzen</span>
              </button>
            </li>
            <li>
              <button className="zeile" onClick={fotoEntfernen}>
                <span className="zeile-titel rot">Foto entfernen</span>
              </button>
            </li>
          </ul>
        </div>
      ) : (
        <ul className="gruppe">
          <li>
            <button className="zeile" onClick={() => fotoInput.current?.click()}>
              <Icon name="kamera" size={20} />
              <span className="zeile-titel blau">Foto aufnehmen</span>
            </button>
          </li>
        </ul>
      )}
      <input
        ref={fotoInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          fotoGewaehlt(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      <ul className="gruppe">
        <li className="zeile">
          <span className="zeile-titel">Zuletzt entnommen</span>
          <span className="zeile-wert">{datumZeit(g.entnommenAm)}</span>
        </li>
        <li className="zeile">
          <span className="zeile-titel">Zuletzt zurückgelegt</span>
          <span className="zeile-wert">{datumZeit(g.zurueckgelegtAm)}</span>
        </li>
        <li className="zeile">
          <span className="zeile-titel">Erfasst</span>
          <span className="zeile-wert">{datumZeit(g.erstelltAm)}</span>
        </li>
      </ul>

      <ul className="gruppe">
        <li>
          <button
            className="zeile zeile-mitte"
            onClick={async () => {
              await loeschen(g.id);
              schliessen();
            }}
          >
            <span className="zeile-titel rot">Löschen</span>
          </button>
        </li>
      </ul>

      {ortWahl && (
        <OrtWahl
          titel="Neuer Ort"
          ausser={g.ortId}
          onAbbrechen={() => setOrtWahl(false)}
          onWahl={async (ortId) => {
            await verschieben([g.id], ortId);
            setOrtWahl(false);
            zeigeToast(`Verschoben nach ${pfadText(orte, ortId)}`);
          }}
        />
      )}
    </Sheet>
  );
}
