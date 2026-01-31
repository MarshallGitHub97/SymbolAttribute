import { useRef, useEffect } from 'react';
import { Group, Image as KonvaImage, Rect, Text } from 'react-konva';
import Konva from 'konva';
import type { PlacedSymbol } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { symbolCatalog } from '../../data/mockSymbols';

const SYMBOL_SIZE = 40;

export function CanvasSymbol({ symbol }: { symbol: PlacedSymbol }) {
  const imageRef = useRef<Konva.Image>(null);
  const moveSymbol = useAppStore((s) => s.moveSymbol);
  const selectSymbol = useAppStore((s) => s.selectSymbol);
  const selectedId = useAppStore((s) => s.selectedSymbolId);
  const isSelected = selectedId === symbol.id;
  const def = symbolCatalog.find((s) => s.key === symbol.symbolKey);

  useEffect(() => {
    if (!def) return;
    const img = new window.Image();
    img.src = def.svgPath;
    img.onload = () => {
      if (imageRef.current) {
        imageRef.current.image(img);
        imageRef.current.getLayer()?.batchDraw();
      }
    };
  }, [def]);

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    moveSymbol(symbol.id, e.target.x(), e.target.y());
  };

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    selectSymbol(symbol.id);
  };

  return (
    <Group
      x={symbol.x}
      y={symbol.y}
      draggable
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleClick}
    >
      {isSelected && (
        <Rect
          x={-4}
          y={-4}
          width={SYMBOL_SIZE + 8}
          height={SYMBOL_SIZE + 20}
          stroke="#3b82f6"
          strokeWidth={2}
          cornerRadius={4}
          dash={[4, 2]}
          fill="rgba(59,130,246,0.05)"
        />
      )}
      <KonvaImage
        ref={imageRef}
        width={SYMBOL_SIZE}
        height={SYMBOL_SIZE}
      />
      <Text
        y={SYMBOL_SIZE + 2}
        text={def?.label ?? symbol.symbolKey}
        fontSize={9}
        fill="#4b5563"
        width={SYMBOL_SIZE}
        align="center"
      />
    </Group>
  );
}
