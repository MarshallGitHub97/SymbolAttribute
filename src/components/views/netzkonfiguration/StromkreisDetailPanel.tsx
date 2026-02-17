import { useAppStore, useDerivedCircuits, useRcdGroups } from '../../../store/useAppStore';
import { devicesForRole, findDevice } from '../../../data/cabinetCatalog';
import { ELECTRICAL_PROPERTY_LABELS } from '../../../types';
import type { StromkreisDevice } from '../../../types';

interface Props {
  circuitId: string;
}

export function StromkreisDetailPanel({ circuitId }: Props) {
  const derivedCircuits = useDerivedCircuits();
  const rcdGroups = useRcdGroups();
  const circuitGroupOverrides = useAppStore((s) => s.circuitGroupOverrides);
  const setCircuitGroupOverride = useAppStore((s) => s.setCircuitGroupOverride);
  const setRcdGroupOverride = useAppStore((s) => s.setRcdGroupOverride);

  const circuit = derivedCircuits.find((c) => c.id === circuitId);
  if (!circuit) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400">
        Stromkreis nicht gefunden
      </div>
    );
  }

  const override = circuitGroupOverrides.find((o) => o.groupId === circuitId);
  const isManual = override?.deviceOverrides != null;

  const rcdGroup = rcdGroups.find((g) => g.circuitIds.includes(circuitId)) ?? null;
  const hasRcd = !circuit.mergedRequirements.some((r) => r.role === 'rcbo')
    && circuit.mergedRequirements.some((r) => r.role === 'rcd' || r.role === 'rcd_type_b');
  const compatibleGroups = rcdGroups.filter(
    (g) => g.verteilerId === circuit.verteilerId && g.id !== rcdGroup?.id
  );

  const handleDeviceChange = (idx: number, newDeviceId: string) => {
    const current = override?.deviceOverrides ?? circuit.resolvedDevices;
    const updated = current.map((d, i): StromkreisDevice =>
      i === idx ? { ...d, deviceId: newDeviceId } : d
    );
    setCircuitGroupOverride(circuitId, { deviceOverrides: updated });
  };

  const handleReset = () => {
    setCircuitGroupOverride(circuitId, { deviceOverrides: undefined });
  };

  const handleRcdSelect = (value: string) => {
    if (value === '__new__') {
      setRcdGroupOverride(circuitId, `manual-${circuit.verteilerId}-${Date.now()}`);
    } else {
      setRcdGroupOverride(circuitId, value || null);
    }
  };

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">{circuit.name}</h2>
        {isManual && (
          <button
            onClick={handleReset}
            className="text-xs text-gray-400 hover:text-blue-600"
          >
            Geraete zuruecksetzen
          </button>
        )}
      </div>

      <fieldset className="border border-gray-200 rounded-lg p-4 space-y-3">
        <legend className="text-xs font-semibold text-gray-700 px-1">Schutzgeraete</legend>
        {circuit.resolvedDevices.map((d, idx) => {
          const dev = findDevice(d.deviceId);
          return (
            <div key={idx} className="flex items-center gap-3">
              <span className="text-xs text-gray-600 w-28 shrink-0">
                {ELECTRICAL_PROPERTY_LABELS[d.role]}
              </span>
              <select
                value={d.deviceId}
                onChange={(e) => handleDeviceChange(idx, e.target.value)}
                className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
              >
                {devicesForRole(d.role).map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
              {dev && (
                <span className="text-[10px] text-gray-400">{dev.teWidth} TE</span>
              )}
            </div>
          );
        })}
      </fieldset>

      {hasRcd && (
        <fieldset className="border border-gray-200 rounded-lg p-4 space-y-3">
          <legend className="text-xs font-semibold text-gray-700 px-1">RCD-Zuordnung</legend>
          <select
            value={rcdGroup?.id ?? ''}
            onChange={(e) => handleRcdSelect(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
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
          {rcdGroup?.sharedRcdDevice && (
            <p className="text-xs text-gray-500">
              Aktuell: {findDevice(rcdGroup.sharedRcdDevice.deviceId)?.label ?? '–'} mit {rcdGroup.circuitIds.length} Stromkreisen
            </p>
          )}
        </fieldset>
      )}

      <div className="text-[10px] text-gray-400">
        Verteiler: {circuit.verteilerId} · {circuit.symbolIds.length} Symbole
      </div>
    </div>
  );
}
