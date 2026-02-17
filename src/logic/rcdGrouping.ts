import type { DerivedCircuit, ProtectionRequirement, RcdGroupOverride, RcdGroupingStrategy, StromkreisDevice } from '../types';
import { resolveDevices } from './deviceResolver';

export interface RcdGroup {
  id: string;
  verteilerId: string;
  sharedRcdRequirement: ProtectionRequirement;
  sharedRcdDevice: StromkreisDevice | null;
  circuitIds: string[];
  hasManualOverride?: boolean;
}

export interface RcdGroupingOptions {
  maxLssPerRcd: number;
  manualOverrides: RcdGroupOverride[];
  strategy?: RcdGroupingStrategy;
}

type Candidate = { circuit: DerivedCircuit; rcdReq: ProtectionRequirement };

function rcdKey(circuit: DerivedCircuit, req: ProtectionRequirement, strategy?: RcdGroupingStrategy): string {
  const parts: (string | number)[] = [circuit.verteilerId, req.faultCurrent ?? 30, req.rcdType ?? 'A', req.poles ?? 2];
  if (strategy?.separateByRoom) parts.push(circuit.raumId);
  if (strategy?.separateByRatedCurrent) {
    const mcb = circuit.mergedRequirements.find((r) => r.role === 'mcb');
    parts.push(mcb?.ratedCurrent ?? 0);
  }
  if (strategy?.separateByType) parts.push(circuit.groupingHint);
  return parts.join('::');
}

function buildGroup(id: string, members: Candidate[], hasManual: boolean): RcdGroup {
  const maxRated = Math.max(...members.map((m) => m.rcdReq.ratedCurrent ?? 40));
  const sharedReq: ProtectionRequirement = { ...members[0].rcdReq, ratedCurrent: maxRated };
  const resolved = resolveDevices([sharedReq]);
  return {
    id,
    verteilerId: members[0].circuit.verteilerId,
    sharedRcdRequirement: sharedReq,
    sharedRcdDevice: resolved.length > 0 ? resolved[0] : null,
    circuitIds: members.map((m) => m.circuit.id),
    hasManualOverride: hasManual || undefined,
  };
}

function splitIntoChunks(key: string, members: Candidate[], maxLss: number, hasManual: boolean): RcdGroup[] {
  members.sort((a, b) => a.circuit.id.localeCompare(b.circuit.id));
  if (members.length <= maxLss) return [buildGroup(`rcd-group-${key}`, members, hasManual)];

  const result: RcdGroup[] = [];
  for (let i = 0; i < members.length; i += maxLss) {
    const chunk = members.slice(i, i + maxLss);
    const chunkIdx = i / maxLss;
    const id = chunkIdx === 0 ? `rcd-group-${key}` : `rcd-group-${key}-${chunkIdx}`;
    result.push(buildGroup(id, chunk, hasManual));
  }
  return result;
}

/**
 * Identify RCD sharing opportunities across derived circuits.
 * Circuits with standalone RCD (not RCBO) in the same Verteiler
 * with compatible specs (faultCurrent, rcdType, poles) share one RCD.
 * Respects manual overrides and maxLssPerRcd split limit.
 */
export function groupBySharedRcd(
  circuits: DerivedCircuit[],
  options?: RcdGroupingOptions,
): RcdGroup[] {
  const maxLss = Math.max(options?.maxLssPerRcd ?? 6, 1);
  const overrides = options?.manualOverrides ?? [];

  // Index circuits by id for quick lookup
  const circuitById = new Map(circuits.map((c) => [c.id, c]));

  // Separate manual overrides from auto-grouping
  const manualCircuitIds = new Set<string>();
  const manualGroups = new Map<string, Candidate[]>();

  for (const ov of overrides) {
    if (ov.rcdGroupId == null) continue;
    const circuit = circuitById.get(ov.circuitId);
    if (!circuit) continue; // stale override
    if (circuit.mergedRequirements.some((r) => r.role === 'rcbo')) continue;
    const rcdReq = circuit.mergedRequirements.find((r) => r.role === 'rcd' || r.role === 'rcd_type_b');
    if (!rcdReq) continue;

    manualCircuitIds.add(ov.circuitId);
    const arr = manualGroups.get(ov.rcdGroupId) ?? [];
    arr.push({ circuit, rcdReq });
    manualGroups.set(ov.rcdGroupId, arr);
  }

  // Auto-group remaining candidates
  const autoGroups = new Map<string, Candidate[]>();

  for (const circuit of circuits) {
    if (manualCircuitIds.has(circuit.id)) continue;
    if (circuit.mergedRequirements.some((r) => r.role === 'rcbo')) continue;
    const rcdReq = circuit.mergedRequirements.find((r) => r.role === 'rcd' || r.role === 'rcd_type_b');
    if (!rcdReq) continue;

    const key = rcdKey(circuit, rcdReq, options?.strategy);
    const arr = autoGroups.get(key) ?? [];
    arr.push({ circuit, rcdReq });
    autoGroups.set(key, arr);
  }

  // Build result with split logic
  const result: RcdGroup[] = [];

  for (const [key, members] of autoGroups) {
    if (members.length === 0) continue;
    result.push(...splitIntoChunks(key, members, maxLss, false));
  }

  for (const [groupId, members] of manualGroups) {
    if (members.length === 0) continue;
    result.push(...splitIntoChunks(groupId, members, maxLss, true));
  }

  return result;
}

/**
 * Return a circuit's devices without the RCD (which is shared).
 */
export function circuitDevicesWithoutRcd(circuit: DerivedCircuit): StromkreisDevice[] {
  return circuit.resolvedDevices.filter(
    (d) => d.role !== 'rcd' && d.role !== 'rcd_type_b',
  );
}
