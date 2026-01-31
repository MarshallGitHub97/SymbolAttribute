import { useMemo, useState } from 'react';
import { symbolCatalog } from '../../data/mockSymbols';
import { CATEGORY_LABELS, type SymbolCategory } from '../../types';
import { SymbolCard } from './SymbolCard';

const CATEGORY_ORDER: SymbolCategory[] = [
  'socket', 'switch', 'light', 'sensor', 'safety', 'smarthome',
  'network', 'homedevice', 'distributor', 'grounding', 'intercom', 'others',
];

export function SymbolLibrary({ searchTerm }: { searchTerm: string }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return symbolCatalog;
    const q = searchTerm.toLowerCase();
    return symbolCatalog.filter(
      (s) => s.label.toLowerCase().includes(q) || s.key.toLowerCase().includes(q)
    );
  }, [searchTerm]);

  const grouped = useMemo(() => {
    const map = new Map<SymbolCategory, typeof filtered>();
    for (const cat of CATEGORY_ORDER) {
      const items = filtered.filter((s) => s.category === cat);
      if (items.length > 0) map.set(cat, items);
    }
    return map;
  }, [filtered]);

  const toggle = (cat: string) =>
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));

  return (
    <div className="flex-1 overflow-y-auto text-sm">
      {Array.from(grouped.entries()).map(([cat, symbols]) => (
        <div key={cat}>
          <button
            onClick={() => toggle(cat)}
            className="flex items-center gap-1 w-full px-3 py-1.5 text-left font-medium text-gray-700 hover:bg-gray-50 border-b border-gray-100"
          >
            <span className="text-xs w-4">{collapsed[cat] ? '▶' : '▼'}</span>
            {CATEGORY_LABELS[cat]}
            <span className="ml-auto text-xs text-gray-400">{symbols.length}</span>
          </button>
          {!collapsed[cat] && (
            <div className="grid grid-cols-2 gap-1 p-1">
              {symbols.map((sym) => (
                <SymbolCard key={sym.key} symbol={sym} />
              ))}
            </div>
          )}
        </div>
      ))}
      {grouped.size === 0 && (
        <div className="text-center text-gray-400 py-8">Keine Symbole gefunden</div>
      )}
    </div>
  );
}
