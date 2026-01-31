import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

export function RoomTree() {
  const gebaeude = useAppStore((s) => s.gebaeude);
  const activeRaumId = useAppStore((s) => s.activeRaumId);
  const setActiveRaum = useAppStore((s) => s.setActiveRaum);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    gebaeude.stockwerke.forEach((sw) => (init[sw.id] = true));
    return init;
  });

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="p-2 text-sm">
      <div className="font-semibold text-gray-700 mb-1 px-1">{gebaeude.name}</div>
      <ul>
        {gebaeude.stockwerke.map((sw) => (
          <li key={sw.id}>
            <button
              onClick={() => toggle(sw.id)}
              className="flex items-center gap-1 w-full px-1 py-0.5 text-left text-gray-600 hover:bg-gray-100 rounded"
            >
              <span className="text-xs w-4">{expanded[sw.id] ? '▼' : '▶'}</span>
              <span className="font-medium">{sw.name}</span>
            </button>
            {expanded[sw.id] && (
              <ul className="ml-5">
                {sw.raeume.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => setActiveRaum(r.id)}
                      className={`w-full text-left px-2 py-0.5 rounded text-sm ${
                        activeRaumId === r.id
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {r.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
