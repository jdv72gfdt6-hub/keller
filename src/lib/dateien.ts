// Bilder verkleinern sowie Dateien herunterladen/teilen.

/** Verkleinert ein Foto auf max. `max` px Kantenlänge als JPEG (spart Speicher auf dem Handy). */
export async function fotoVerkleinern(datei: File, max = 1280, qualitaet = 0.8): Promise<Blob> {
  const url = URL.createObjectURL(datei);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const f = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * f);
    canvas.height = Math.round(img.naturalHeight * f);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((ok, fehler) =>
      canvas.toBlob((b) => (b ? ok(b) : fehler(new Error('Bild konnte nicht umgewandelt werden'))), 'image/jpeg', qualitaet),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function blobZuDataUrl(blob: Blob): Promise<string> {
  return new Promise((ok, fehler) => {
    const r = new FileReader();
    r.onload = () => ok(r.result as string);
    r.onerror = () => fehler(r.error);
    r.readAsDataURL(blob);
  });
}

export async function dataUrlZuBlob(url: string): Promise<Blob> {
  return (await fetch(url)).blob();
}

/**
 * Gibt eine Datei aus. Als installierte App auf dem iPhone funktionieren Downloads schlecht,
 * daher dort über das Teilen-Menü ("In Dateien sichern").
 */
export async function dateiAusgeben(name: string, inhalt: string, typ = 'application/json'): Promise<void> {
  const blob = new Blob([inhalt], { type: typ });
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone;
  const datei = new File([blob], name, { type: typ });
  if (standalone && navigator.canShare?.({ files: [datei] })) {
    try {
      await navigator.share({ files: [datei], title: name });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
