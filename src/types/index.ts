export type SymbolCategory =
  | 'socket'
  | 'switch'
  | 'light'
  | 'sensor'
  | 'safety'
  | 'smarthome'
  | 'network'
  | 'homedevice'
  | 'distributor'
  | 'grounding'
  | 'intercom'
  | 'others';

export type KnxVariante = 'Standard' | 'Premium';

export type FieldRelevance = 'required' | 'optional' | 'hidden';

export interface SymbolFieldConfig {
  attribute: {
    farbe: FieldRelevance;
    hoehe: FieldRelevance;
  };
  kabel: FieldRelevance;
  stromkreis: FieldRelevance;
  knx: FieldRelevance;
}

export interface Attribute {
  farbe: string;
  hoehe: number;
}

// --- Cabinet Device Catalog ---

export type CabinetCategory =
  | 'mcb' | 'rcd' | 'rcbo' | 'afdd'
  | 'sls' | 'main_switch'
  | 'contactor' | 'meter' | 'spd'
  | 'motor_protection' | 'fuse' | 'disconnect'
  | 'relay' | 'power_supply'
  | 'intercom_system' | 'energy' | 'contact';

export const CABINET_CATEGORY_LABELS: Record<CabinetCategory, string> = {
  mcb: 'Leitungsschutzschalter',
  rcd: 'FI-Schutzschalter',
  rcbo: 'FI/LS-Kombination',
  afdd: 'Brandschutzschalter',
  sls: 'SLS (Zählervorsicherung)',
  main_switch: 'Hauptschalter',
  contactor: 'Schütz',
  meter: 'Zähler',
  spd: 'Überspannungsschutz',
  motor_protection: 'Motorschutz',
  fuse: 'Schmelzsicherung',
  disconnect: 'Trennschalter',
  relay: 'Relais / Schaltaktor',
  power_supply: 'Netzteil / Spannungsversorgung',
  intercom_system: 'TKS / Sprechanlage',
  energy: 'Energiemanagement',
  contact: 'Hilfsgeräte / Kontakte',
};

export interface CabinetDevice {
  id: string;
  category: CabinetCategory;
  label: string;
  teWidth: number;
  poles: number;
  svgFile: string;
  ratedCurrent?: number;
  characteristic?: string;
  faultCurrent?: number;
  rcdType?: 'A' | 'B' | 'F';
}

// --- Stromkreis (Circuit) ---

export interface StromkreisDevice {
  role: ElectricalPropertyType;
  deviceId: string;
}

export interface Stromkreis {
  id: string;
  name: string;
  verteilerId: string;
  devices: StromkreisDevice[];
}

export interface KnxEigenschaften {
  geraetetyp: string;
  variante: KnxVariante;
}

export interface ArtikelPosition {
  id: string;
  bezeichnung: string;
  typ: 'material' | 'service';
  menge: number;
  einheit: string;
  einzelpreis: number;
}

export type ElectricalPropertyType = 'mcb' | 'rcd' | 'rcbo' | 'afdd' | 'rcd_type_b';

export const ELECTRICAL_PROPERTY_LABELS: Record<ElectricalPropertyType, string> = {
  mcb: 'LSS (MCB)',
  rcd: 'FI (RCD)',
  rcbo: 'FI/LS (RCBO)',
  afdd: 'AFDD',
  rcd_type_b: 'RCD Typ B',
};

// --- Protection Specs (bottom-up circuit derivation) ---

export interface ProtectionRequirement {
  role: ElectricalPropertyType;
  ratedCurrent?: number;
  characteristic?: string;
  faultCurrent?: number;
  rcdType?: 'A' | 'B' | 'F';
  poles?: number;
}

export type CircuitGroupingHint = 'socket' | 'light' | 'dedicated' | 'special';

export const GROUPING_HINT_LABELS: Record<CircuitGroupingHint, string> = {
  socket: 'Steckdosen',
  light: 'Beleuchtung',
  dedicated: 'Einzelstromkreis',
  special: 'Sonstiges',
};

export interface ProtectionProfile {
  requirements: ProtectionRequirement[];
  dedicatedCircuit: boolean;
  groupingHint: CircuitGroupingHint;
}

export interface DerivedCircuit {
  id: string;
  name: string;
  verteilerId: string;
  raumId: string;
  groupingHint: CircuitGroupingHint;
  symbolIds: string[];
  resolvedDevices: StromkreisDevice[];
  mergedRequirements: ProtectionRequirement[];
  kabelIds: string[];
}

export interface CircuitGroupOverride {
  groupId: string;
  customName?: string;
  verteilerId?: string;
  deviceOverrides?: StromkreisDevice[];
  locked: boolean;
}

export interface RcdGroupOverride {
  circuitId: string;
  rcdGroupId: string | null;
}

export interface RcdGroupingStrategy {
  separateByRoom: boolean;
  separateByRatedCurrent: boolean;
  separateByType: boolean;
}

export type CabinetFieldType = 'NAR' | 'APZ' | 'ZF' | 'ARR' | 'RfZ' | 'VF';

export const CABINET_FIELD_LABELS: Record<CabinetFieldType, string> = {
  NAR: 'Netzanschlussraum',
  APZ: 'Allg. Prüf-/Zählraum',
  ZF: 'Zählerfeld',
  ARR: 'Anlagenseitiger Anschlussraum',
  RfZ: 'Raum für Zusatzanwendungen',
  VF: 'Verteilerfeld',
};

export interface CabinetMappingInfo {
  targetField: CabinetFieldType | null;
  elementTypes: ElectricalPropertyType[];
  description: string;
}

export interface SymbolDefinition {
  /** Unique key, matches SVG filename without prefix, e.g. "grounded_socket" */
  key: string;
  label: string;
  category: SymbolCategory;
  /** Path to SVG in /public, e.g. "/symbols/simple-socket-grounded_socket.svg" */
  svgPath: string;
  defaultAttribute: Attribute;
  /** Default cable type when creating a Kabel for this symbol */
  defaultKabeltyp: string;
  defaultKnx: KnxEigenschaften;
  defaultArtikel: ArtikelPosition[];
  fieldConfig: SymbolFieldConfig;
  isDistributor: boolean;
  isVerbraucher: boolean;
  requiredElectricalProperties: ElectricalPropertyType[];
  protectionProfile: ProtectionProfile;
  cabinetMapping: CabinetMappingInfo;
}

export interface PlacedSymbol {
  id: string;
  symbolKey: string;
  raumId: string;
  x: number;
  y: number;
  rotation: number;
  attribute: Attribute;
  verteilerId: string | null;
  protectionOverrides?: ProtectionRequirement[];
  circuitGroupOverride?: string | null;
  knx: KnxEigenschaften;
  artikel: ArtikelPosition[];
}

export interface Raum {
  id: string;
  name: string;
}

export interface Stockwerk {
  id: string;
  name: string;
  raeume: Raum[];
}

export interface Gebaeude {
  id: string;
  name: string;
  stockwerke: Stockwerk[];
}

export type ViewType =
  | 'symboluebersicht'
  | 'installationsplan'
  | 'netzkonfiguration'
  | 'stromlaufplan'
  | 'aufbauplan'
  | 'stueckliste'
  | 'bestellliste';

export interface StuecklisteRow {
  bezeichnung: string;
  typ: 'material' | 'service';
  menge: number;
  einheit: string;
  einzelpreis: number;
  gesamtpreis: number;
}

export interface BestelllisteRow {
  bezeichnung: string;
  menge: number;
  einheit: string;
}

/** Feature areas that depend on properties (not on symbols). */
export type FeatureArea = 'stromlaufplan' | 'aufbauplan' | 'knx' | 'pruefprotokoll' | 'stueckliste';

export const FEATURE_AREA_LABELS: Record<FeatureArea, string> = {
  stromlaufplan: 'Stromlaufplan',
  aufbauplan: 'Aufbauplan',
  knx: 'KNX-System',
  pruefprotokoll: 'Pruefprotokoll',
  stueckliste: 'Stueckliste',
};

/** Global property definition -- first-class entity, independent of symbols. */
export interface PropertyDefinition {
  id: string;
  name: string;
  group: 'attribute' | 'stromkreis' | 'knx' | 'artikel';
  description: string;
  /** Which feature areas consume this property */
  usedBy: FeatureArea[];
  /** Value type for display */
  valueType: 'string' | 'number' | 'enum' | 'boolean' | 'device_ref';
}

// --- Kabel (Cable) ---

export interface CoreAssignment {
  coreIndex: number;
  coreLabel: string;
  circuitGroupId: string | null;
}

export interface Kabel {
  id: string;
  kabeltyp: string;
  connectedSymbolIds: string[];
  coreAssignments: CoreAssignment[];
}

export type SelectionTarget =
  | { type: 'symbol'; id: string }
  | { type: 'kabel'; id: string }
  | null;

// --- Netzstruktur (Network Infrastructure) ---

export type NetzwerkTyp = '230_400v';

export const NETZWERK_TYP_LABELS: Record<NetzwerkTyp, string> = {
  '230_400v': '230/400V Versorgung',
};

export type Netzform =
  | 'TN-S_5pol'
  | 'TN-S_3pol'
  | 'TN-C-S_5pol'
  | 'TN-C_4pol'
  | 'TT_5pol';

export const NETZFORM_LABELS: Record<Netzform, string> = {
  'TN-S_5pol': '5-polig, TN-S',
  'TN-S_3pol': '3-polig, TN-S',
  'TN-C-S_5pol': '5-polig, TN-C-S',
  'TN-C_4pol': '4-polig, TN-C',
  'TT_5pol': '5-polig, TT',
};

export type UeberspannungsschutzPosition = 'vor_zaehler' | 'nach_zaehler';

export const UEBERSPANNUNGSSCHUTZ_POSITION_LABELS: Record<UeberspannungsschutzPosition, string> = {
  vor_zaehler: 'Vor Zähler',
  nach_zaehler: 'Nach Zähler',
};

export interface NetzKonfiguration {
  id: string;
  netzwerkTyp: NetzwerkTyp;
  bezeichnung: string;
  notiz: string;
  leitungstyp: string;
  querschnitt: number;
  einspeisung: {
    netzform: Netzform;
    alsKlemmenblock: boolean;
  };
  zaehlervorsicherung: {
    enabled: boolean;
    ampere: number;
    deviceId: string;
  };
  zaehler: {
    enabled: boolean;
    deviceId: string;
  };
  hauptschalter: {
    enabled: boolean;
    ampere: number;
    deviceId: string;
  };
  ueberspannungsschutz: {
    enabled: boolean;
    position: UeberspannungsschutzPosition;
    deviceId: string;
    vorsicherung: {
      enabled: boolean;
      ampere: number;
    };
  };
  verteilerIds: string[];
}

export interface Verteiler {
  id: string;
  name: string;
}

export const CATEGORY_LABELS: Record<SymbolCategory, string> = {
  socket: 'Steckdosen',
  switch: 'Schalter',
  light: 'Beleuchtung',
  sensor: 'Sensoren',
  safety: 'Sicherheit',
  smarthome: 'Smart Home',
  network: 'Netzwerk',
  homedevice: 'Hausgeräte',
  distributor: 'Verteiler',
  grounding: 'Erdung',
  intercom: 'Sprechanlage',
  others: 'Sonstiges',
};
