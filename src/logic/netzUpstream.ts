import type { NetzKonfiguration, CabinetDevice } from '../types';
import { NETZFORM_LABELS } from '../types';
import { findDevice } from '../data/cabinetCatalog';

export type UpstreamSlot =
  | 'einspeisung'
  | 'zaehlervorsicherung'
  | 'zaehler'
  | 'hauptschalter'
  | 'ueberspannungsschutz'
  | 'spd_vorsicherung';

export interface UpstreamDevice {
  slot: UpstreamSlot;
  label: string;
  sublabel: string;
  device: CabinetDevice | undefined;
  teWidth: number;
}

/** Find the NetzKonfiguration that includes a given verteilerId. First match wins. */
export function findNetzForVerteiler(
  netzKonfigurationen: NetzKonfiguration[],
  verteilerId: string,
): NetzKonfiguration | undefined {
  return netzKonfigurationen.find((n) => n.verteilerIds.includes(verteilerId));
}

/** Find ALL NetzKonfigurationen that include a given verteilerId. */
export function findAllNetzeForVerteiler(
  netzKonfigurationen: NetzKonfiguration[],
  verteilerId: string,
): NetzKonfiguration[] {
  return netzKonfigurationen.filter((n) => n.verteilerIds.includes(verteilerId));
}

/**
 * Resolve the upstream protection chain from a NetzKonfiguration.
 * Order: Einspeisung -> SLS -> SPD(vor_zaehler) -> Zaehler -> SPD(nach_zaehler) -> Hauptschalter
 */
export function resolveUpstreamDevices(netz: NetzKonfiguration): UpstreamDevice[] {
  const devices: UpstreamDevice[] = [];
  const { einspeisung, zaehlervorsicherung, zaehler, hauptschalter, ueberspannungsschutz } = netz;

  // 1. Einspeisung (always present, no CabinetDevice)
  devices.push({
    slot: 'einspeisung',
    label: 'Einspeisung',
    sublabel: NETZFORM_LABELS[einspeisung.netzform] + (einspeisung.alsKlemmenblock ? ' (KB)' : ''),
    device: undefined,
    teWidth: 0,
  });

  // 2. Zaehlervorsicherung (SLS)
  if (zaehlervorsicherung.enabled) {
    const dev = findDevice(zaehlervorsicherung.deviceId);
    devices.push({
      slot: 'zaehlervorsicherung',
      label: dev?.label ?? 'SLS',
      sublabel: `${zaehlervorsicherung.ampere}A`,
      device: dev,
      teWidth: dev?.teWidth ?? 3,
    });
  }

  // 3. SPD before meter
  if (ueberspannungsschutz.enabled && ueberspannungsschutz.position === 'vor_zaehler') {
    pushSpdDevices(devices, ueberspannungsschutz);
  }

  // 4. Zaehler
  if (zaehler.enabled) {
    const dev = findDevice(zaehler.deviceId);
    devices.push({
      slot: 'zaehler',
      label: dev?.label ?? 'Zähler',
      sublabel: '',
      device: dev,
      teWidth: dev?.teWidth ?? 4,
    });
  }

  // 5. SPD after meter
  if (ueberspannungsschutz.enabled && ueberspannungsschutz.position === 'nach_zaehler') {
    pushSpdDevices(devices, ueberspannungsschutz);
  }

  // 6. Hauptschalter
  if (hauptschalter.enabled) {
    const dev = findDevice(hauptschalter.deviceId);
    devices.push({
      slot: 'hauptschalter',
      label: dev?.label ?? 'Hauptschalter',
      sublabel: `${hauptschalter.ampere}A`,
      device: dev,
      teWidth: dev?.teWidth ?? 3,
    });
  }

  return devices;
}

function pushSpdDevices(
  devices: UpstreamDevice[],
  spd: NetzKonfiguration['ueberspannungsschutz'],
) {
  if (spd.vorsicherung.enabled) {
    devices.push({
      slot: 'spd_vorsicherung',
      label: `Vorsicherung SPD`,
      sublabel: `${spd.vorsicherung.ampere}A`,
      device: undefined,
      teWidth: 1,
    });
  }
  const dev = findDevice(spd.deviceId);
  devices.push({
    slot: 'ueberspannungsschutz',
    label: dev?.label ?? 'SPD',
    sublabel: spd.position === 'vor_zaehler' ? 'vor Zähler' : 'nach Zähler',
    device: dev,
    teWidth: dev?.teWidth ?? 4,
  });
}
