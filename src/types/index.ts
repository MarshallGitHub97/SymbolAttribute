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
    kabeltyp: FieldRelevance;
    verteiler: FieldRelevance;
  };
  elektrisch: FieldRelevance;
  knx: FieldRelevance;
}

export interface Attribute {
  farbe: string;
  hoehe: number;
  kabeltyp: string;
  verteiler: string;
}

export interface ElektrischeEigenschaften {
  leitungsschutzschalter: string;
  rcd: string;
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
  defaultElektrisch: ElektrischeEigenschaften;
  defaultKnx: KnxEigenschaften;
  defaultArtikel: ArtikelPosition[];
  fieldConfig: SymbolFieldConfig;
  isDistributor: boolean;
  requiredElectricalProperties: ElectricalPropertyType[];
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
  elektrisch: ElektrischeEigenschaften;
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
  group: 'attribute' | 'elektrisch' | 'knx' | 'artikel';
  description: string;
  /** Which feature areas consume this property */
  usedBy: FeatureArea[];
  /** Value type for display */
  valueType: 'string' | 'number' | 'enum' | 'boolean';
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
