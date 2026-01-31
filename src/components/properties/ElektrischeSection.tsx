import type { PlacedSymbol, FieldRelevance } from '../../types';
import { useAppStore } from '../../store/useAppStore';

export function ElektrischeSection({ symbol, relevance }: { symbol: PlacedSymbol; relevance: FieldRelevance }) {
  const updateSymbol = useAppStore((s) => s.updateSymbol);

  const update = (field: keyof PlacedSymbol['elektrisch'], value: string) => {
    updateSymbol(symbol.id, {
      elektrisch: { ...symbol.elektrisch, [field]: value },
    });
  };

  return (
    <fieldset className="mb-3">
      <legend className={`text-xs font-semibold uppercase tracking-wide mb-1 ${relevance === 'required' ? 'text-blue-600' : 'text-gray-500'}`}>
        Elektrische Eigenschaften{relevance === 'required' && <span className="text-blue-500 ml-0.5">*</span>}
      </legend>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <label className="w-24 text-xs text-gray-500 shrink-0">LSS</label>
          <input
            value={symbol.elektrisch.leitungsschutzschalter}
            onChange={(e) => update('leitungsschutzschalter', e.target.value)}
            className="flex-1 px-2 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="w-24 text-xs text-gray-500 shrink-0">RCD</label>
          <input
            value={symbol.elektrisch.rcd}
            onChange={(e) => update('rcd', e.target.value)}
            className="flex-1 px-2 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
    </fieldset>
  );
}
