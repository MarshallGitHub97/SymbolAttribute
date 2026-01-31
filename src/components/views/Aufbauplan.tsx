import { useMemo, useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Text, Line, Group } from 'react-konva';
import { useAllSymbols } from '../../store/useAppStore';

interface CabinetRow {
  lss: string;
  rcd: string;
  count: number;
}

interface Cabinet {
  verteiler: string;
  rows: CabinetRow[];
}

export function Aufbauplan() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 800, height: 600 });
  const allSymbols = useAllSymbols();

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

  const cabinets = useMemo<Cabinet[]>(() => {
    const vertMap = new Map<string, Map<string, CabinetRow>>();
    for (const sym of allSymbols) {
      const v = sym.attribute.verteiler || 'Unbekannt';
      if (!sym.elektrisch.leitungsschutzschalter) continue;
      if (!vertMap.has(v)) vertMap.set(v, new Map());
      const rows = vertMap.get(v)!;
      const key = `${sym.elektrisch.leitungsschutzschalter}|${sym.elektrisch.rcd}`;
      if (!rows.has(key)) {
        rows.set(key, { lss: sym.elektrisch.leitungsschutzschalter, rcd: sym.elektrisch.rcd, count: 0 });
      }
      rows.get(key)!.count++;
    }
    return Array.from(vertMap.entries())
      .map(([verteiler, rows]) => ({ verteiler, rows: Array.from(rows.values()) }))
      .sort((a, b) => a.verteiler.localeCompare(b.verteiler));
  }, [allSymbols]);

  const CABINET_W = 300;
  const CABINET_GAP = 40;
  const ROW_H = 36;
  const HEADER_H = 40;
  const PAD = 40;
  const totalW = Math.max(dims.width, cabinets.length * (CABINET_W + CABINET_GAP) + PAD * 2);
  const maxRows = Math.max(1, ...cabinets.map((c) => c.rows.length));
  const totalH = Math.max(dims.height, HEADER_H + PAD * 2 + maxRows * ROW_H + 80);

  return (
    <div ref={containerRef} className="w-full h-full overflow-auto bg-white">
      {allSymbols.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-400">
          Kein Aufbauplan. Platzieren Sie Symbole mit elektrischen Eigenschaften.
        </div>
      ) : (
        <Stage width={totalW} height={totalH}>
          <Layer>
            <Text text="Aufbauplan — Schaltschrank" x={PAD} y={15} fontSize={18} fontStyle="bold" fill="#1f2937" />

            {cabinets.map((cab, ci) => {
              const cx = PAD + ci * (CABINET_W + CABINET_GAP);
              const cy = PAD + HEADER_H;
              const h = cab.rows.length * ROW_H + 50;

              return (
                <Group key={ci}>
                  {/* Cabinet border */}
                  <Rect x={cx} y={cy} width={CABINET_W} height={h} fill="#f9fafb" stroke="#374151" strokeWidth={2} cornerRadius={4} />
                  {/* Cabinet name */}
                  <Rect x={cx} y={cy} width={CABINET_W} height={28} fill="#374151" cornerRadius={[4, 4, 0, 0]} />
                  <Text text={cab.verteiler} x={cx + 10} y={cy + 7} fontSize={13} fill="white" fontStyle="bold" />

                  {/* DIN rail */}
                  <Line points={[cx + 10, cy + 38, cx + CABINET_W - 10, cy + 38]} stroke="#9ca3af" strokeWidth={3} />

                  {/* Breakers */}
                  {cab.rows.map((row, ri) => {
                    const ry = cy + 45 + ri * ROW_H;
                    const bw = 50;
                    return (
                      <Group key={ri}>
                        {/* LSS block */}
                        <Rect x={cx + 15} y={ry} width={bw} height={28} fill="#dbeafe" stroke="#3b82f6" strokeWidth={1} cornerRadius={2} />
                        <Text text={row.lss} x={cx + 17} y={ry + 8} fontSize={10} fill="#1e40af" fontStyle="bold" />

                        {/* RCD block */}
                        {row.rcd && (
                          <>
                            <Rect x={cx + 75} y={ry} width={bw + 10} height={28} fill="#fef3c7" stroke="#d97706" strokeWidth={1} cornerRadius={2} />
                            <Text text={row.rcd} x={cx + 78} y={ry + 8} fontSize={9} fill="#92400e" />
                          </>
                        )}

                        {/* Count */}
                        <Text
                          text={`${row.count} Verbraucher`}
                          x={cx + 150}
                          y={ry + 8}
                          fontSize={10}
                          fill="#6b7280"
                        />

                        {/* Connection line */}
                        <Line
                          points={[cx + 15 + bw, ry + 14, cx + 75, ry + 14]}
                          stroke="#9ca3af"
                          strokeWidth={1}
                        />
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
