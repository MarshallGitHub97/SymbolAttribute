import { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Text } from 'react-konva';
import Konva from 'konva';
import { useAppStore, useSymbolsForActiveRaum, useActiveRaumName } from '../../store/useAppStore';
import { CanvasSymbol } from './CanvasSymbol';

const GRID_SIZE = 20;

function drawGrid(layer: Konva.Layer, width: number, height: number, scale: number) {
  layer.destroyChildren();
  const endX = width / scale;
  const endY = height / scale;

  for (let x = 0; x < endX; x += GRID_SIZE) {
    layer.add(new Konva.Line({ points: [x, 0, x, endY], stroke: '#e5e7eb', strokeWidth: 0.5 / scale }));
  }
  for (let y = 0; y < endY; y += GRID_SIZE) {
    layer.add(new Konva.Line({ points: [0, y, endX, y], stroke: '#e5e7eb', strokeWidth: 0.5 / scale }));
  }
  layer.batchDraw();
}

export function InstallationCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const gridLayerRef = useRef<Konva.Layer>(null);
  const [dims, setDims] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);

  const symbols = useSymbolsForActiveRaum();
  const addSymbol = useAppStore((s) => s.addSymbol);
  const selectSymbol = useAppStore((s) => s.selectSymbol);
  const activeRaumId = useAppStore((s) => s.activeRaumId);
  const raumName = useActiveRaumName();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDims({ width, height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (gridLayerRef.current) {
      drawGrid(gridLayerRef.current, dims.width, dims.height, scale);
    }
  }, [dims, scale]);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const scaleBy = 1.05;
    const oldScale = stage.scaleX();
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const clamped = Math.max(0.2, Math.min(3, newScale));
    setScale(clamped);
    stage.scale({ x: clamped, y: clamped });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const symbolKey = e.dataTransfer.getData('symbolKey');
      if (!symbolKey || !stageRef.current) return;

      stageRef.current.setPointersPositions(e);
      const pos = stageRef.current.getPointerPosition();
      if (!pos) return;

      const stage = stageRef.current;
      const x = (pos.x - stage.x()) / stage.scaleX();
      const y = (pos.y - stage.y()) / stage.scaleY();
      addSymbol(symbolKey, activeRaumId, x, y);
    },
    [addSymbol, activeRaumId]
  );

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target === e.target.getStage()) {
        selectSymbol(null);
      }
    },
    [selectSymbol]
  );

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative bg-white"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <Stage
        ref={stageRef}
        width={dims.width}
        height={dims.height}
        draggable
        onWheel={handleWheel}
        onClick={handleStageClick}
      >
        <Layer ref={gridLayerRef} listening={false} />
        <Layer>
          <Text text={raumName} x={10} y={10} fontSize={16} fill="#9ca3af" listening={false} />
          {symbols.map((sym) => (
            <CanvasSymbol key={sym.id} symbol={sym} />
          ))}
        </Layer>
      </Stage>
      <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded">
        {Math.round(scale * 100)}% | Scroll = Zoom | Drag = Pan
      </div>
    </div>
  );
}
