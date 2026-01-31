import type { SymbolDefinition } from '../../types';

export function SymbolCard({ symbol }: { symbol: SymbolDefinition }) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('symbolKey', symbol.key);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex flex-col items-center gap-1 p-2 rounded border border-transparent hover:border-blue-300 hover:bg-blue-50 cursor-grab active:cursor-grabbing transition-colors"
      title={symbol.label}
    >
      <img
        src={symbol.svgPath}
        alt={symbol.label}
        className="w-8 h-8"
        draggable={false}
      />
      <span className="text-[10px] text-gray-600 text-center leading-tight truncate w-full">
        {symbol.label}
      </span>
    </div>
  );
}
