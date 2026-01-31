import { useMemo, useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Text, Line, Group } from 'react-konva';
import { useAllSymbols } from '../../store/useAppStore';
import { symbolCatalog } from '../../data/mockSymbols';
import { useAppStore } from '../../store/useAppStore';

interface Circuit {
  verteiler: string;
  lss: string;
  rcd: string;
  symbols: { key: string; label: string; raum: string }[];
}

export function Stromlaufplan() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 800, height: 600 });
  const allSymbols = useAllSymbols();
  const gebaeude = useAppStore((s) => s.gebaeude);

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

  const getRaumName = (raumId: string) => {
    for (const sw of gebaeude.stockwerke) {
      const r = sw.raeume.find((r) => r.id === raumId);
      if (r) return r.name;
    }
    return raumId;
  };

  const circuits = useMemo<Circuit[]>(() => {
    const map = new Map<string, Circuit>();
    for (const sym of allSymbols) {
      if (!sym.elektrisch.leitungsschutzschalter) continue;
      const key = `${sym.attribute.verteiler}|${sym.elektrisch.leitungsschutzschalter}|${sym.elektrisch.rcd}`;
      const def = symbolCatalog.find((d) => d.key === sym.symbolKey);
      if (!map.has(key)) {
        map.set(key, {
          verteiler: sym.attribute.verteiler || 'Unbekannt',
          lss: sym.elektrisch.leitungsschutzschalter,
          rcd: sym.elektrisch.rcd,
          symbols: [],
        });
      }
      map.get(key)!.symbols.push({
        key: sym.symbolKey,
        label: def?.label ?? sym.symbolKey,
        raum: getRaumName(sym.raumId),
      });
    }
    return Array.from(map.values()).sort((a, b) => a.verteiler.localeCompare(b.verteiler));
  }, [allSymbols, gebaeude]);

  const COL_W = 200;
  const ROW_H = 30;
  const TOP = 80;
  const LEFT = 40;
  const totalW = Math.max(dims.width, circuits.length * COL_W + LEFT + 40);
  const maxSymbols = Math.max(1, ...circuits.map((c) => c.symbols.length));
  const totalH = Math.max(dims.height, TOP + 120 + maxSymbols * ROW_H + 60);

  return (
    <div ref={containerRef} className="w-full h-full overflow-auto bg-white">
      {allSymbols.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-400">
          Keine Stromkreise. Platzieren Sie Symbole mit elektrischen Eigenschaften.
        </div>
      ) : (
        <Stage width={totalW} height={totalH}>
          <Layer>
            {/* Title */}
            <Text text="Stromlaufplan" x={LEFT} y={15} fontSize={18} fontStyle="bold" fill="#1f2937" />
            {/* Main bus bar */}
            <Line
              points={[LEFT, TOP, LEFT + circuits.length * COL_W, TOP]}
              stroke="#374151"
              strokeWidth={3}
            />
            <Text text="L1" x={LEFT - 25} y={TOP - 7} fontSize={12} fill="#374151" fontStyle="bold" />

            {circuits.map((circuit, ci) => {
              const x = LEFT + ci * COL_W + COL_W / 2;
              const rcdY = TOP + 30;
              const lssY = TOP + 70;
              const startY = TOP + 110;

              return (
                <Group key={ci}>
                  {/* Vertical line from bus to RCD */}
                  <Line points={[x, TOP, x, rcdY]} stroke="#374151" strokeWidth={2} />

                  {/* RCD box */}
                  {circuit.rcd && (
                    <>
                      <Rect x={x - 30} y={rcdY} width={60} height={24} fill="#fef3c7" stroke="#d97706" strokeWidth={1} cornerRadius={3} />
                      <Text text={circuit.rcd} x={x - 28} y={rcdY + 6} fontSize={9} fill="#92400e" width={56} align="center" />
                    </>
                  )}

                  {/* Line from RCD to LSS */}
                  <Line points={[x, circuit.rcd ? rcdY + 24 : rcdY, x, lssY]} stroke="#374151" strokeWidth={2} />

                  {/* LSS box */}
                  <Rect x={x - 30} y={lssY} width={60} height={24} fill="#dbeafe" stroke="#3b82f6" strokeWidth={1} cornerRadius={3} />
                  <Text text={circuit.lss} x={x - 28} y={lssY + 6} fontSize={10} fill="#1e40af" width={56} align="center" fontStyle="bold" />

                  {/* Verteiler label */}
                  <Text text={circuit.verteiler} x={x - 40} y={lssY + 28} fontSize={8} fill="#6b7280" width={80} align="center" />

                  {/* Line down to symbols */}
                  <Line points={[x, lssY + 24, x, startY]} stroke="#374151" strokeWidth={1} />

                  {/* Connected symbols */}
                  {circuit.symbols.map((sym, si) => {
                    const sy = startY + si * ROW_H;
                    return (
                      <Group key={si}>
                        <Line points={[x, sy, x + 15, sy]} stroke="#6b7280" strokeWidth={1} />
                        <Rect x={x + 15} y={sy - 10} width={120} height={20} fill="#f3f4f6" stroke="#d1d5db" strokeWidth={1} cornerRadius={2} />
                        <Text text={`${sym.label}`} x={x + 20} y={sy - 6} fontSize={9} fill="#374151" />
                        <Text text={sym.raum} x={x + 20} y={sy + 3} fontSize={7} fill="#9ca3af" />
                      </Group>
                    );
                  })}
                </Group>
              );
            })}
          </Layer>
        </Stage>
      )}
    </div>
  );
}
