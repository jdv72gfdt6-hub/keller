// QR-Code als SVG, komplett offline erzeugt.
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QrCode({ text, className }: { text: string; className?: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let aktiv = true;
    QRCode.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } }).then(
      (s) => aktiv && setSvg(s),
    );
    return () => {
      aktiv = false;
    };
  }, [text]);
  return <div className={`qr ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}
