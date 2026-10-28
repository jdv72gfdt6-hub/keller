// QR-Scanner in der App. Nutzt BarcodeDetector (Android/Chrome), sonst jsQR (z. B. iPhone).
// Wichtig fürs iPhone: Die installierte App hat eigenen Speicher; Scannen mit der normalen
// Kamera-App öffnet Safari statt der App. Deshalb hier in der App scannen.
import { useEffect, useRef, useState } from 'react';
import { useKeller } from '../state/KellerContext';
import { ortIdAusQr } from '../lib/qrBasis';
import { gehe, links } from '../router';

interface Detector {
  detect(src: CanvasImageSource): Promise<{ rawValue: string }[]>;
}

export function Scan() {
  const { orte } = useKeller();
  const video = useRef<HTMLVideoElement>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [unbekannt, setUnbekannt] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | undefined;
    let timer: number | undefined;
    let aktiv = true;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setFehler('Kamera nicht verfügbar. Die App muss über HTTPS laufen (z. B. GitHub Pages).');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      } catch {
        setFehler('Kein Zugriff auf die Kamera. Bitte in den Browser-Einstellungen erlauben.');
        return;
      }
      if (!aktiv || !video.current) return stream.getTracks().forEach((t) => t.stop());
      video.current.srcObject = stream;
      await video.current.play().catch(() => undefined);

      // Detektor wählen
      let detector: Detector | null = null;
      const BD = (window as unknown as { BarcodeDetector?: { new (o: object): Detector; getSupportedFormats(): Promise<string[]> } })
        .BarcodeDetector;
      if (BD && (await BD.getSupportedFormats()).includes('qr_code')) detector = new BD({ formats: ['qr_code'] });
      const jsQR = detector ? null : (await import('jsqr')).default;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

      const pruefen = async () => {
        const v = video.current;
        if (!aktiv || !v) return;
        let text: string | null = null;
        if (v.readyState >= 2 && v.videoWidth) {
          if (detector) {
            text = (await detector.detect(v).catch(() => []))[0]?.rawValue ?? null;
          } else if (jsQR) {
            // verkleinert auswerten, spart Akku
            const f = Math.min(1, 640 / v.videoWidth);
            canvas.width = Math.round(v.videoWidth * f);
            canvas.height = Math.round(v.videoHeight * f);
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            const bild = ctx.getImageData(0, 0, canvas.width, canvas.height);
            text = jsQR(bild.data, bild.width, bild.height, { inversionAttempts: 'dontInvert' })?.data ?? null;
          }
        }
        if (text) {
          const id = ortIdAusQr(text);
          if (id && orte.has(id)) {
            navigator.vibrate?.(30);
            gehe(links.ort(id));
            return;
          }
          setUnbekannt(text);
        }
        timer = window.setTimeout(pruefen, 180);
      };
      pruefen();
    })();

    return () => {
      aktiv = false;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [orte]);

  return (
    <div className="seite scan">
      <header className="kopf">
        <div>
          <p className="kopf-ueber">Etikett scannen</p>
          <h1>Scannen</h1>
        </div>
      </header>
      {fehler ? (
        <p className="hinweis">{fehler}</p>
      ) : (
        <div className="scan-rahmen">
          <video ref={video} playsInline muted />
          <div className="scan-sucher" />
        </div>
      )}
      {unbekannt && (
        <p className="hinweis">
          Unbekannter Code: <code>{unbekannt.slice(0, 80)}</code>
        </p>
      )}
      <p className="gedimmt klein zentriert">Halte das Etikett einer Box, Schublade oder eines Fachs in den Rahmen.</p>
    </div>
  );
}
