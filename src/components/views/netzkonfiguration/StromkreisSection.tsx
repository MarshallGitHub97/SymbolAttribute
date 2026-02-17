import { useAppStore, useDerivedCircuits, useRcdGroups } from '../../../store/useAppStore';
import { devicesForRole, findDevice } from '../../../data/cabinetCatalog';
import { ELECTRICAL_PROPERTY_LABELS } from '../../../types';
import type { NetzKonfiguration, DerivedCircuit, StromkreisDevice, CircuitGroupOverride } from '../../../types';
import type { RcdGroup } from '../../../logic/rcdGrouping';

interface Props {
  netz: NetzKonfiguration;
}

function CircuitRow({
  circuit,
  override,
  rcdGroup,
  compatibleGroups,
  onDeviceChange,
  onResetDevices,
  onRcdGroupChange,
}: {
  circuit: DerivedCircuit;
  override: CircuitGroupOverride | undefined;
  rcdGroup: RcdGroup | null;
  compatibleGroups: RcdGroup[];
  onDeviceChange: (circuitId: string, idx: number, deviceId: string) => void;
  onResetDevices: (circuitId: string) => void;
  onRcdGroupChange: (circuitId: string, rcdGroupId: string | null) => void;
}) {
  const isManual = override?.deviceOverrides != null;
  const hasRcd = !circuit.mergedRequirements.some((r) => r.role === 'rcbo')
    && circuit.mergedRequirements.some((r) => r.role === 'rcd' || r.role === 'rcd_type_b');

  return (
    <div className="border border-gray-100 rounded p-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700">{circuit.name}</span>
        {isManual && (
          <button
            onClick={() => onResetDevices(circuit.id)}
            className="text-[10px] text-gray-400 hover:text-blue-600"
          >
            zuruecksetzen
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {circuit.resolvedDevices.map((d, idx) => (
          <div key={idx} className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500">{ELECTRICAL_PROPERTY_LABELS[d.role]}</span>
            <select
              value={d.deviceId}
              onChange={(e) => onDeviceChange(circuit.id, idx, e.target.value)}
              className="border border-gray-300 rounded px-1.5 py-1 text-xs"
            >
              {devicesForRole(d.role).map((dev) => (
                <option key={dev.id} value={dev.id}>{dev.label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {hasRcd && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500">RCD-Gruppe:</span>
          <select
            value={rcdGroup?.id ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '__new__') {
                onRcdGroupChange(circuit.id, `manual-${circuit.verteilerId}-${Date.now()}`);
              } else {
                onRcdGroupChange(circuit.id, val || null);
              }
            }}
            className="border border-gray-300 rounded px-1.5 py-1 text-xs"
          >
            <option value="">Automatisch</option>
            {compatibleGroups.map((g) => {
              const dev = g.sharedRcdDevice ? findDevice(g.sharedRcdDevice.deviceId) : null;
              return (
                <option key={g.id} value={g.id}>
                  {dev?.label ?? 'RCD'} ({g.circuitIds.length} SK)
                </option>
              );
            })}
            <option value="__new__">+ Neue Gruppe</option>
          </select>
        </div>
      )}
    </div>
  );
}

export function StromkreisSection({ netz }: Props) {
  const derivedCircuits = useDerivedCircuits();
  const rcdGroups = useRcdGroups();
  const circuitGroupOverrides = useAppStore((s) => s.circuitGroupOverrides);
  const setCircuitGroupOverride = useAppStore((s) => s.setCircuitGroupOverride);
  const setRcdGroupOverride = useAppStore((s) => s.setRcdGroupOverride);
  const verteiler = useAppStore((s) => s.verteiler);

  const verteilerIds = new Set(netz.verteilerIds);
  const circuits = derivedCircuits.filter((c) => verteilerIds.has(c.verteilerId));
  const overrideMap = new Map(circuitGroupOverrides.map((o) => [o.groupId, o]));

  const handleDeviceChange = (circuitId: string, idx: number, newDeviceId: string) => {
    const circuit = circuits.find((c) => c.id === circuitId);
    if (!circuit) return;
    const current = overrideMap.get(circuitId)?.deviceOverrides ?? circuit.resolvedDevices;
    const updated = current.map((d, i): StromkreisDevice =>
      i === idx ? { ...d, deviceId: newDeviceId } : d
    );
    setCircuitGroupOverride(circuitId, { deviceOverrides: updated });
  };

  const handleResetDevices = (circuitId: string) => {
    setCircuitGroupOverride(circuitId, { deviceOverrides: undefined });
  };

  // Group circuits by verteiler for display
  const grouped = new Map<string, DerivedCircuit[]>();
  for (const c of circuits) {
    const arr = grouped.get(c.verteilerId) ?? [];
    arr.push(c);
    grouped.set(c.verteilerId, arr);
  }

  return (
    <fieldset className="border border-gray-200 rounded-lg p-4 space-y-3">
      <legend className="text-xs font-semibold text-gray-700 px-1">
        Stromkreise
      </legend>

      {circuits.length === 0 ? (
        <p className="text-xs text-gray-400">Keine Stromkreise fuer verknuepfte Verteiler</p>
      ) : (
        <div className="space-y-3">
          {[...grouped.entries()].map(([vId, vCircuits]) => {
            const vName = verteiler.find((v) => v.id === vId)?.name ?? vId;
            return (
              <div key={vId} className="space-y-1.5">
                {grouped.size > 1 && (
                  <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{vName}</h4>
                )}
                {vCircuits.map((circuit) => {
                  const rcdGroup = rcdGroups.find((g) => g.circuitIds.includes(circuit.id)) ?? null;
                  const compatibleGroups = rcdGroups.filter(
                    (g) => g.verteilerId === circuit.verteilerId && g.id !== rcdGroup?.id
                  );
                  return (
                    <CircuitRow
                      key={circuit.id}
                      circuit={circuit}
                      override={overrideMap.get(circuit.id)}
                      rcdGroup={rcdGroup}
                      compatibleGroups={compatibleGroups}
                      onDeviceChange={handleDeviceChange}
                      onResetDevices={handleResetDevices}
                      onRcdGroupChange={setRcdGroupOverride}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
