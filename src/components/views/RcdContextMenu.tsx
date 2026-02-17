import { useEffect, useRef } from 'react';
import type { RcdGroup } from '../../logic/rcdGrouping';
import { findDevice } from '../../data/cabinetCatalog';

interface RcdContextMenuProps {
  x: number;
  y: number;
  circuitId: string;
  currentGroupId: string | null;
  rcdGroups: RcdGroup[];
  verteilerId: string;
  onSelect: (rcdGroupId: string | null) => void;
  onClose: () => void;
}

export function RcdContextMenu({
  x, y, currentGroupId, rcdGroups, verteilerId, onSelect, onClose,
}: RcdContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Compatible groups: same verteiler, exclude current circuit's group from "move to" list
  const compatible = rcdGroups.filter(
    (g) => g.verteilerId === verteilerId && g.id !== currentGroupId,
  );

  return (
    <div
      ref={ref}
      className="absolute z-50 bg-white border border-gray-300 rounded shadow-lg py-1 text-xs min-w-[180px]"
      style={{ left: x, top: y }}
    >
      <div className="px-3 py-1 text-gray-400 font-semibold border-b border-gray-100 mb-1">
        RCD-Zuordnung
      </div>

      {/* Auto option */}
      <button
        className={`w-full text-left px-3 py-1.5 hover:bg-blue-50 flex items-center gap-2 ${
          currentGroupId == null ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-700'
        }`}
        onClick={() => onSelect(null)}
      >
        Automatisch
        {currentGroupId == null && <span className="text-blue-500 text-[10px]">aktiv</span>}
      </button>

      {compatible.length > 0 && (
        <div className="border-t border-gray-100 mt-1 pt-1">
          <div className="px-3 py-0.5 text-gray-400">Verschieben nach:</div>
          {compatible.map((g) => {
            const dev = g.sharedRcdDevice ? findDevice(g.sharedRcdDevice.deviceId) : null;
            const label = dev?.label ?? 'RCD';
            return (
              <button
                key={g.id}
                className="w-full text-left px-3 py-1.5 hover:bg-yellow-50 text-gray-700"
                onClick={() => onSelect(g.id)}
              >
                {label} ({g.circuitIds.length} SK)
              </button>
            );
          })}
        </div>
      )}

      {/* New group */}
      <div className="border-t border-gray-100 mt-1 pt-1">
        <button
          className="w-full text-left px-3 py-1.5 hover:bg-green-50 text-gray-700"
          onClick={() => onSelect(`manual-${verteilerId}-${Date.now()}`)}
        >
          + Neue RCD-Gruppe
        </button>
      </div>
    </div>
  );
}
