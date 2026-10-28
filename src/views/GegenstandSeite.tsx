// Details eines Gegenstands: bearbeiten, Foto, Ort ändern, Status, löschen.
import { useEffect, useRef, useState } from 'react';
import { useKeller } from '../state/KellerContext';
import { pfadText } from '../config/orte';
import { db } from '../db/db';
import { links, zurueck } from '../router';
import { datumZeit, neueId } from '../lib/text';
import { fotoVerkleinern } from '../lib/dateien';
import { Icon } from '../components/Icon';
import { OrtWahl } from '../components/OrtWahl';

export function GegenstandSeite({ id }: { id: string }) {
  const { gegenstaende, orte, kategorien, aktualisieren, statusSetzen, loeschen, verschieben, zeigeToast } = useKeller();
  const g = gegenstaende.find((x) => x.id === id);
  const [form, setForm] = useState({ name: '', menge: '1', kategorie: '', notiz: '' });
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [ortWahl, setOrtWahl] = useState(false);
  const fotoInput = useRef<HTMLInputElement>(null);

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
      <div className="seite">
        <p className="leer">Gegenstand nicht gefunden (vielleicht gelöscht).</p>
        <a className="btn" href={links.start}>
          Zur Übersicht
        </a>
      </div>
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
    <div className="seite">
      <nav className="krume">
        <button className="icon-btn" onClick={() => zurueck(links.ort(g.ortId))} aria-label="Zurück">
          <Icon name="zurueck" />
        </button>
        <a href={links.ort(g.ortId, `?g=${g.id}`)}>{pfadText(orte, g.ortId)}</a>
      </nav>

      <button
        className={`status-gross ${entnommen ? 'ist-entnommen' : ''}`}
        onClick={() => statusSetzen(g.id, entnommen ? 'vorhanden' : 'entnommen')}
      >
        <span className="status-gross-label">{entnommen ? 'Entnommen' : 'Vorhanden'}</span>
        <span className="status-gross-aktion">
          <Icon name={entnommen ? 'download' : 'upload'} /> {entnommen ? 'Zurücklegen' : 'Entnehmen'}
        </span>
      </button>

      <div className="formular">
        <label>
          Name
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <div className="formular-reihe">
          <label className="schmal">
            Menge
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={form.menge}
              onChange={(e) => setForm({ ...form, menge: e.target.value })}
            />
          </label>
          <label>
            Kategorie
            <input list="kat-detail" value={form.kategorie} onChange={(e) => setForm({ ...form, kategorie: e.target.value })} />
            <datalist id="kat-detail">
              {kategorien.map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
          </label>
        </div>
        <label>
          Notiz
          <textarea rows={3} value={form.notiz} onChange={(e) => setForm({ ...form, notiz: e.target.value })} />
        </label>
        {geaendert && (
          <button className="btn btn-primaer breit" onClick={speichern}>
            <Icon name="speichern" size={18} /> Speichern
          </button>
        )}
      </div>

      <h2 className="abschnitt">Foto</h2>
      {fotoUrl ? (
        <div className="foto">
          <img src={fotoUrl} alt={g.name} />
          <div className="leiste">
            <button className="btn" onClick={() => fotoInput.current?.click()}>
              <Icon name="kamera" size={18} /> Ersetzen
            </button>
            <button className="btn btn-gefahr" onClick={fotoEntfernen}>
              Entfernen
            </button>
          </div>
        </div>
      ) : (
        <button className="btn breit" onClick={() => fotoInput.current?.click()}>
          <Icon name="kamera" size={18} /> Foto aufnehmen
        </button>
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

      <h2 className="abschnitt">Ort</h2>
      <button className="btn breit links" onClick={() => setOrtWahl(true)}>
        <Icon name="box" size={18} /> {pfadText(orte, g.ortId)}
        <span className="rechts gedimmt">ändern</span>
      </button>
      <a className="btn breit" href={links.raum3d({ ort: g.ortId })}>
        <Icon name="wuerfel" size={18} /> In 3D zeigen
      </a>

      <dl className="daten">
        <dt>Zuletzt entnommen</dt>
        <dd>{datumZeit(g.entnommenAm)}</dd>
        <dt>Zuletzt zurückgelegt</dt>
        <dd>{datumZeit(g.zurueckgelegtAm)}</dd>
        <dt>Erfasst</dt>
        <dd>{datumZeit(g.erstelltAm)}</dd>
      </dl>

      <button
        className="btn btn-gefahr breit"
        onClick={async () => {
          await loeschen(g.id);
          zurueck(links.ort(g.ortId));
        }}
      >
        <Icon name="muell" size={18} /> Löschen
      </button>

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
    </div>
  );
}
