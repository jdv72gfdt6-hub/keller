// Umschalter Liste ↔ 3D (Übersicht und 3D-Ansicht).
import { links } from '../router';
import { Icon } from './Icon';

export function AnsichtUmschalter({ aktiv }: { aktiv: 'baum' | '3d' }) {
  return (
    <div className="umschalter glas" role="tablist">
      <a href={links.start} role="tab" aria-selected={aktiv === 'baum'} className={aktiv === 'baum' ? 'aktiv' : ''}>
        <Icon name="baum" size={16} /> Liste
      </a>
      <a href={links.raum3d()} role="tab" aria-selected={aktiv === '3d'} className={aktiv === '3d' ? 'aktiv' : ''}>
        <Icon name="wuerfel" size={16} /> 3D
      </a>
    </div>
  );
}
