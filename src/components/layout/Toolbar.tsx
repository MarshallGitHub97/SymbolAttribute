import { useAppStore, useActiveRaumName } from '../../store/useAppStore';
import type { ViewType } from '../../types';

const VIEWS: { key: ViewType; label: string }[] = [
  { key: 'symboluebersicht', label: 'Symboluebersicht' },
  { key: 'installationsplan', label: 'Installationsplan' },
  { key: 'stromlaufplan', label: 'Stromlaufplan' },
  { key: 'aufbauplan', label: 'Aufbauplan' },
  { key: 'stueckliste', label: 'Stückliste' },
  { key: 'bestellliste', label: 'Bestellliste' },
];

export function Toolbar() {
  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const raumName = useActiveRaumName();

  return (
    <header className="h-12 border-b border-gray-200 bg-white flex items-center px-4 gap-4 shrink-0">
      <h1 className="text-sm font-semibold text-gray-700 mr-4 whitespace-nowrap">
        SymbolAttribute
      </h1>
      <nav className="flex gap-1">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => setActiveView(v.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              activeView === v.key
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {v.label}
          </button>
        ))}
      </nav>
      <div className="ml-auto text-xs text-gray-500">{raumName}</div>
    </header>
  );
}
