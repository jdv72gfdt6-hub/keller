// Einstellungen & Werkzeuge: Etiketten, Möbel bearbeiten, Backup, Config-Datei.
import { useEffect, useRef, useState } from 'react';
import { useKeller } from '../state/KellerContext';
import { backupEinspielen, backupErstellen, backupPruefen, configPruefen } from '../db/backup';
import { db } from '../db/db';
import { dateiAusgeben } from '../lib/dateien';
import { relativ } from '../lib/text';
import { links } from '../router';
import { Icon, RundSymbol } from '../components/Icon';
import { Seitenkopf } from '../components/Ios';
import { themaLaden, themaSetzen, type ThemaWahl } from '../lib/thema';
import { ConfigHinweis } from '../components/ConfigHinweis';

export function Mehr() {
  const { config, gegenstaende, overlayAktiv, configSpeichern, configAufDateiZuruecksetzen, neuLaden, zeigeToast } = useKeller();
  const [letztesBackup, setLetztesBackup] = useState<string>();
  const [persistent, setPersistent] = useState<boolean | null>(null);
  const [speicher, setSpeicher] = useState<string>('');
  const backupInput = useRef<HTMLInputElement>(null);
  const configInput = useRef<HTMLInputElement>(null);
  const [thema, setThema] = useState<ThemaWahl>(themaLaden);

  useEffect(() => {
    db.einstellung<string>('letztesBackup').then(setLetztesBackup);
    navigator.storage?.persisted?.().then(setPersistent);
    navigator.storage?.estimate?.().then((e) => setSpeicher(`${((e.usage ?? 0) / 1024 / 1024).toFixed(1)} MB belegt`));
  }, []);

  async function backupExport() {
    try {
      const json = await backupErstellen(config);
      const stempel = new Date().toISOString().slice(0, 10);
      await dateiAusgeben(`keller-backup-${stempel}.json`, json);
      setLetztesBackup(new Date().toISOString());
    } catch (e) {
      zeigeToast(`Backup fehlgeschlagen: ${(e as Error).message}`);
    }
  }

  async function backupImport(datei: File | undefined) {
    if (!datei) return;
    try {
      const b = backupPruefen(await datei.text());
      const ersetzen = confirm(
        `Backup vom ${new Date(b.exportiertAm).toLocaleString('de-DE')} mit ${b.gegenstaende.length} Gegenständen.\n\n` +
          'OK = alles hier ERSETZEN\nAbbrechen = zusammenführen (neuerer Stand gewinnt)',
      );
      const r = await backupEinspielen(b, ersetzen);
      if (b.config && confirm('Möbel-Konfiguration aus dem Backup ebenfalls übernehmen?')) await configSpeichern(b.config);
      await neuLaden();
      zeigeToast(`Importiert: ${r.neu} neu, ${r.aktualisiert} aktualisiert`);
    } catch (e) {
      zeigeToast((e as Error).message);
    }
  }

  async function configImport(datei: File | undefined) {
    if (!datei) return;
    try {
      const c = configPruefen(await datei.text());
      if (!confirm(`Config „${c.raum.name}“ mit ${c.moebel.length} Möbeln übernehmen?`)) return;
      await configSpeichern(c);
      zeigeToast('Config übernommen');
    } catch (e) {
      zeigeToast((e as Error).message);
    }
  }

  const backupAlt = !letztesBackup || Date.now() - new Date(letztesBackup).getTime() > 14 * 86400000;

  return (
    <div className="seite">
      <Seitenkopf titel="Mehr" />

      <ConfigHinweis />

      <h2 className="gruppe-titel">Darstellung</h2>
      <div className="segment-steuerung" role="radiogroup" aria-label="Darstellung">
        {(
          [
            ['system', 'Automatisch'],
            ['hell', 'Hell'],
            ['dunkel', 'Dunkel'],
          ] as [ThemaWahl, string][]
        ).map(([wert, text]) => (
          <button
            key={wert}
            role="radio"
            aria-checked={thema === wert}
            className={thema === wert ? 'aktiv' : ''}
            onClick={() => {
              setThema(wert);
              themaSetzen(wert);
            }}
          >
            {text}
          </button>
        ))}
      </div>
      <p className="gruppe-fuss">„Automatisch“ folgt der Einstellung des Handys.</p>

      <ul className="gruppe">
        <li>
          <a className="zeile" href={links.etiketten}>
            <RundSymbol glyph="qr" farbe="grau" />
            <span className="zeile-titel">QR-Etiketten drucken</span>
            <Icon name="weiter" size={18} />
          </a>
        </li>
        <li>
          <a className="zeile" href={links.einrichtung}>
            <RundSymbol glyph="stift" farbe="orange" />
            <span className="zeile-titel">Raum & Möbel bearbeiten</span>
            <Icon name="weiter" size={18} />
          </a>
        </li>
      </ul>

      <h2 className="gruppe-titel">Backup</h2>
      <p className={`klein ${backupAlt ? 'warnung' : 'gedimmt'}`}>
        {letztesBackup ? `Letztes Backup ${relativ(letztesBackup)}.` : 'Noch kein Backup erstellt.'} Die Daten liegen nur auf diesem
        Gerät – sichere sie regelmäßig.
      </p>
      <div className="leiste">
        <button className="btn btn-primaer" onClick={backupExport}>
          <Icon name="download" size={18} /> Backup speichern
        </button>
        <button className="btn" onClick={() => backupInput.current?.click()}>
          <Icon name="upload" size={18} /> Backup laden
        </button>
      </div>
      <input
        ref={backupInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          backupImport(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      <h2 className="gruppe-titel">Config-Datei</h2>
      <p className="klein gedimmt">
        {overlayAktiv
          ? 'Möbel wurden in der App geändert. Lade die aktuelle keller.config.json herunter und ersetze damit die Datei im Projekt.'
          : 'Es gilt unverändert die keller.config.json aus dem Projekt.'}
      </p>
      <div className="leiste">
        <button className="btn" onClick={() => dateiAusgeben('keller.config.json', JSON.stringify(config, null, 2))}>
          <Icon name="download" size={18} /> Config herunterladen
        </button>
        <button className="btn" onClick={() => configInput.current?.click()}>
          <Icon name="upload" size={18} /> Config laden
        </button>
        {overlayAktiv && (
          <button
            className="btn btn-gefahr"
            onClick={async () => {
              if (!confirm('Alle Möbel-Änderungen aus der App verwerfen und keller.config.json verwenden?')) return;
              await configAufDateiZuruecksetzen();
              zeigeToast('Auf Datei zurückgesetzt');
            }}
          >
            Auf Datei zurücksetzen
          </button>
        )}
      </div>
      <input
        ref={configInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          configImport(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      <h2 className="gruppe-titel">Gerät</h2>
      <dl className="daten">
        <dt>Gegenstände</dt>
        <dd>{gegenstaende.length}</dd>
        <dt>Speicher</dt>
        <dd>{speicher || '–'}</dd>
        <dt>Dauerhaft gespeichert</dt>
        <dd>{persistent === null ? '–' : persistent ? 'ja' : 'nein (Browser darf bei Platzmangel löschen)'}</dd>
        <dt>Version</dt>
        <dd>{__APP_VERSION__}</dd>
      </dl>
    </div>
  );
}
