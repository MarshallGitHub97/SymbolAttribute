import { useAppStore, useSelectedSymbol } from '../../store/useAppStore';
import { symbolCatalog } from '../../data/mockSymbols';
import { AttributeSection } from './AttributeSection';
import { ElektrischeSection } from './ElektrischeSection';
import { KnxSection } from './KnxSection';
import { ArtikelSection } from './ArtikelSection';

export function PropertiesPanel() {
  const symbol = useSelectedSymbol();
  const removeSymbol = useAppStore((s) => s.removeSymbol);

  if (!symbol) return null;
  const def = symbolCatalog.find((s) => s.key === symbol.symbolKey);

  return (
    <div className="p-3 text-sm">
      <div className="flex items-center gap-2 mb-3">
        {def && (
          <img src={def.svgPath} alt={def.label} className="w-8 h-8" />
        )}
        <div className="flex-1">
          <div className="font-semibold text-gray-800">{def?.label ?? symbol.symbolKey}</div>
          <div className="text-xs text-gray-400">ID: {symbol.id.slice(0, 8)}</div>
        </div>
        <button
          onClick={() => removeSymbol(symbol.id)}
          className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50"
          title="Symbol entfernen"
        >
          Entfernen
        </button>
      </div>
      {def && <AttributeSection symbol={symbol} fieldConfig={def.fieldConfig.attribute} />}
      {def && def.fieldConfig.elektrisch !== 'hidden' && (
        <ElektrischeSection symbol={symbol} relevance={def.fieldConfig.elektrisch} />
      )}
      {def && def.fieldConfig.knx !== 'hidden' && (
        <KnxSection symbol={symbol} relevance={def.fieldConfig.knx} />
      )}
      <ArtikelSection symbol={symbol} />
    </div>
  );
}
