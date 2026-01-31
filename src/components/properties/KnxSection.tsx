import type { PlacedSymbol, KnxVariante, FieldRelevance } from '../../types';
import { useAppStore } from '../../store/useAppStore';

export function KnxSection({ symbol, relevance }: { symbol: PlacedSymbol; relevance: FieldRelevance }) {
  const updateSymbol = useAppStore((s) => s.updateSymbol);

  const update = (field: keyof PlacedSymbol['knx'], value: string) => {
    updateSymbol(symbol.id, {
      knx: { ...symbol.knx, [field]: value },
    });
  };

  return (
    <fieldset className="mb-3">
      <legend className={`text-xs font-semibold uppercase tracking-wide mb-1 ${relevance === 'required' ? 'text-blue-600' : 'text-gray-500'}`}>
        KNX{relevance === 'required' && <span className="text-blue-500 ml-0.5">*</span>}
      </legend>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <label className="w-24 text-xs text-gray-500 shrink-0">Gerätetyp</label>
          <input
            value={symbol.knx.geraetetyp}
            onChange={(e) => update('geraetetyp', e.target.value)}
            className="flex-1 px-2 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="w-24 text-xs text-gray-500 shrink-0">Variante</label>
          <select
            value={symbol.knx.variante}
            onChange={(e) => update('variante', e.target.value as KnxVariante)}
            className="flex-1 px-2 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500 bg-white"
          >
            <option value="Standard">Standard</option>
            <option value="Premium">Premium</option>
          </select>
        </div>
      </div>
    </fieldset>
  );
}
