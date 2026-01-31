import type { PropertyDefinition } from '../types';

/**
 * Global property registry -- all properties that can be assigned to any symbol.
 * These are the first-class entities. Symbols are just "consumers" that reference them.
 * Feature logic (Stromlaufplan, Aufbauplan, KNX, etc.) depends on properties, not symbols.
 */
export const propertyRegistry: PropertyDefinition[] = [
  // === ATTRIBUTE GROUP ===
  {
    id: 'farbe',
    name: 'Farbe',
    group: 'attribute',
    description: 'Farbe des Geraets/Rahmens (z.B. Reinweiss, Grau)',
    usedBy: ['stueckliste'],
    valueType: 'string',
  },
  {
    id: 'hoehe',
    name: 'Montagehöhe',
    group: 'attribute',
    description: 'Montagehöhe in cm ab Boden (z.B. 30, 105, 250)',
    usedBy: ['pruefprotokoll'],
    valueType: 'number',
  },
  {
    id: 'kabeltyp',
    name: 'Kabeltyp',
    group: 'attribute',
    description: 'Leitung zum Verbraucher (z.B. NYM-J 3x1,5, NYM-J 5x2,5)',
    usedBy: ['stromlaufplan', 'aufbauplan', 'stueckliste', 'pruefprotokoll'],
    valueType: 'string',
  },
  {
    id: 'verteiler',
    name: 'Verteiler',
    group: 'attribute',
    description: 'Zugeordneter Verteiler/Schaltschrank (z.B. HV-EG, UV-OG)',
    usedBy: ['stromlaufplan', 'aufbauplan'],
    valueType: 'string',
  },

  // === ELEKTRISCH GROUP ===
  {
    id: 'leitungsschutzschalter',
    name: 'Leitungsschutzschalter (MCB)',
    group: 'elektrisch',
    description: 'Ueberstromschutz -- Charakteristik + Nennstrom (z.B. B16A, C32A)',
    usedBy: ['stromlaufplan', 'aufbauplan', 'pruefprotokoll'],
    valueType: 'string',
  },
  {
    id: 'rcd',
    name: 'FI-Schutzschalter (RCD)',
    group: 'elektrisch',
    description: 'Fehlerstromschutz -- Nennstrom + Fehlerstrom (z.B. 40A 30mA)',
    usedBy: ['stromlaufplan', 'aufbauplan', 'pruefprotokoll'],
    valueType: 'string',
  },
  {
    id: 'rcbo',
    name: 'FI/LS-Kombination (RCBO)',
    group: 'elektrisch',
    description: 'Kombinierter FI/LS-Schutz (z.B. 1+N B16A 30mA)',
    usedBy: ['stromlaufplan', 'aufbauplan', 'pruefprotokoll'],
    valueType: 'string',
  },
  {
    id: 'afdd',
    name: 'Brandschutzschalter (AFDD)',
    group: 'elektrisch',
    description: 'Arc Fault Detection Device -- Fehlerlichtbogenschutz',
    usedBy: ['stromlaufplan', 'aufbauplan', 'pruefprotokoll'],
    valueType: 'string',
  },
  {
    id: 'rcd_type_b',
    name: 'RCD Typ B',
    group: 'elektrisch',
    description: 'Allstromsensitiver FI fuer Wallbox/Wechselrichter',
    usedBy: ['stromlaufplan', 'aufbauplan', 'pruefprotokoll'],
    valueType: 'string',
  },

  // === KNX GROUP ===
  {
    id: 'geraetetyp',
    name: 'KNX-Gerätetyp',
    group: 'knx',
    description: 'KNX-Aktor/Sensor-Typ (z.B. Schaltaktor, Dimmaktor, Jalousieaktor)',
    usedBy: ['knx', 'aufbauplan', 'stueckliste'],
    valueType: 'string',
  },
  {
    id: 'variante',
    name: 'KNX-Variante',
    group: 'knx',
    description: 'Ausstattungsvariante (Standard oder Premium)',
    usedBy: ['knx', 'stueckliste'],
    valueType: 'enum',
  },

  // === ARTIKEL GROUP ===
  {
    id: 'artikel',
    name: 'Artikel/Leistungen',
    group: 'artikel',
    description: 'Material- und Servicepositionen mit Mengen und Preisen',
    usedBy: ['stueckliste'],
    valueType: 'string',
  },
];

export const PROPERTY_GROUP_LABELS: Record<PropertyDefinition['group'], string> = {
  attribute: 'Attribute',
  elektrisch: 'Elektrische Eigenschaften',
  knx: 'KNX-Eigenschaften',
  artikel: 'Artikel & Leistungen',
};
