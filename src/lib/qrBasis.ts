// Adresse, die in QR-Codes steht. Standard: die Adresse, unter der die App gerade läuft
// (z. B. https://<name>.github.io/keller/). Kann in den Etiketten-Einstellungen überschrieben werden.
import { db } from '../db/db';

export function aktuelleBasis(): string {
  return location.origin + location.pathname;
}

export async function qrBasisLaden(): Promise<string> {
  return (await db.einstellung<string>('qrBasis')) || aktuelleBasis();
}

export async function qrBasisSetzen(url: string): Promise<void> {
  if (!url.trim() || url.trim() === aktuelleBasis()) await db.einstellungLoeschen('qrBasis');
  else await db.einstellungSetzen('qrBasis', url.trim());
}

export function ortUrl(basis: string, ortId: string): string {
  return `${basis}#/ort/${ortId}`;
}

/** Liest eine Orts-ID aus einem gescannten QR-Text (URL mit "#/ort/…" oder "keller:<id>"). */
export function ortIdAusQr(text: string): string | null {
  const m = /#\/ort\/([^?]+)/.exec(text);
  if (m) return m[1].split('/').map(decodeURIComponent).join('/');
  if (text.startsWith('keller:')) return text.slice(7);
  return null;
}
