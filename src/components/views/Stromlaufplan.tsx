import { useMemo, useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Text, Line, Group } from 'react-konva';
import { useDerivedCircuits, useAllSymbols, useAppStore, useNetzKonfigurationen, useRcdGroups } from '../../store/useAppStore';
import { symbolCatalog } from '../../data/mockSymbols';
import { findDevice } from '../../data/cabinetCatalog';
import { circuitDevicesWithoutRcd } from '../../logic/rcdGrouping';
import { findNetzForVerteiler, findAllNetzeForVerteiler, resolveUpstreamDevices } from '../../logic/netzUpstream';
import type { RcdGroup } from '../../logic/rcdGrouping';
import type { DerivedCircuit, StromkreisDevice, CabinetDevice, NetzKonfiguration } from '../../types';
import type { UpstreamDevice } from '../../logic/netzUpstream';
import { StromlaufplanContextMenu } from './StromlaufplanContextMenu';

interface ColumnData {
  circuit: DerivedCircuit;
  rcdGroup: RcdGroup | null;
  devices: (StromkreisDevice & { device: CabinetDevice | undefined })[];
  symbols: { key: string; label: string; raum: string }[];
}

interface UpstreamChain {
  netz: NetzKonfiguration;
  upstream: UpstreamDevice[];
}

interface VerteilerSpan {
  verteilerId: string;
  startIdx: number;
  endIdx: number;
  chains: UpstreamChain[];
}

interface NetzSpan {
  netzId: string | null;
  bezeichnung: string;
  startIdx: number;
  endIdx: number;
}

const NETZ_PALETTE = [
  { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
  { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
  { bg: '#fefce8', border: '#fde047', text: '#854d0e' },
  { bg: '#fce7f3', border: '#f9a8d4', text: '#9d174d' },
];
const UNASSIGNED_COLOR = { bg: '#f5f5f5', border: '#d4d4d4', text: '#737373' };

export function Stromlaufplan() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 800, height: 600 });
  const derivedCircuits = useDerivedCircuits();
  const allSymbols = useAllSymbols();
  const gebaeude = useAppStore((s) => s.gebaeude);
  const netzKonfigurationen = useNetzKonfigurationen();
  const rcdGroups = useRcdGroups();
  const maxLssPerRcd = useAppStore((s) => s.maxLssPerRcd);
  const setMaxLssPerRcd = useAppStore((s) => s.setMaxLssPerRcd);
  const setRcdGroupOverride = useAppStore((s) => s.setRcdGroupOverride);
  const rcdGroupOverrides = useAppStore((s) => s.rcdGroupOverrides);
  const rcdGroupingStrategy = useAppStore((s) => s.rcdGroupingStrategy);
  const setRcdGroupingStrategy = useAppStore((s) => s.setRcdGroupingStrategy);
  const linkVerteilerToNetz = useAppStore((s) => s.linkVerteilerToNetz);
  const unlinkVerteilerFromNetz = useAppStore((s) => s.unlinkVerteilerFromNetz);
  const verteiler = useAppStore((s) => s.verteiler);

  const [ctxMenu, setCtxMenu] = useState<{
    circuitId: string; x: number; y: number; verteilerId: string; currentGroupId: string | null;
    currentNetzId: string | null;
  } | null>(null);

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

  const { columns, rcdGroupSpans, verteilerSpans, netzSpans } = useMemo(() => {
    const getRaumName = (raumId: string) => {
      for (const sw of gebaeude.stockwerke) {
        const r = sw.raeume.find((r) => r.id === raumId);
        if (r) return r.name;
      }
      return raumId;
    };

    const circuitMap = new Map(derivedCircuits.map((c) => [c.id, c]));

    // Map circuitId → rcdGroup
    const circuitToGroup = new Map<string, RcdGroup>();
    for (const g of rcdGroups) {
      for (const cid of g.circuitIds) circuitToGroup.set(cid, g);
    }

    // Map verteilerId → NetzKonfiguration
    const verteilerToNetz = new Map<string, NetzKonfiguration | null>();
    for (const c of derivedCircuits) {
      if (!verteilerToNetz.has(c.verteilerId)) {
        verteilerToNetz.set(c.verteilerId, findNetzForVerteiler(netzKonfigurationen, c.verteilerId) ?? null);
      }
    }
    const netzSortKey = (vid: string) => verteilerToNetz.get(vid)?.id ?? '\uffff';

    // Sort RCD groups by netz → verteiler for consistent grouping
    const sortedRcdGroups = [...rcdGroups].sort((a, b) => {
      const ka = netzSortKey(a.verteilerId) + '::' + a.verteilerId;
      const kb = netzSortKey(b.verteilerId) + '::' + b.verteilerId;
      return ka.localeCompare(kb);
    });

    // Order: RCD group members adjacent (sorted by netz), then standalone (sorted by netz)
    const ordered: { circuit: DerivedCircuit; rcdGroup: RcdGroup | null }[] = [];
    const placed = new Set<string>();

    for (const g of sortedRcdGroups) {
      for (const cid of g.circuitIds) {
        const circuit = circuitMap.get(cid);
        if (circuit && !placed.has(cid)) {
          ordered.push({ circuit, rcdGroup: g });
          placed.add(cid);
        }
      }
    }

    const standalone = derivedCircuits
      .filter((c) => !placed.has(c.id))
      .sort((a, b) => {
        const ka = netzSortKey(a.verteilerId) + '::' + a.verteilerId;
        const kb = netzSortKey(b.verteilerId) + '::' + b.verteilerId;
        return ka.localeCompare(kb);
      });

    for (const circuit of standalone) {
      ordered.push({ circuit, rcdGroup: null });
      placed.add(circuit.id);
    }

    // Build columns
    const cols: ColumnData[] = ordered.map(({ circuit, rcdGroup }) => {
      const symbols = circuit.symbolIds
        .map((sid) => allSymbols.find((s) => s.id === sid))
        .filter((s) => {
          if (!s) return false;
          const def = symbolCatalog.find((d) => d.key === s.symbolKey);
          return def?.isVerbraucher ?? false;
        })
        .map((s) => {
          const def = symbolCatalog.find((d) => d.key === s!.symbolKey);
          return { key: s!.symbolKey, label: def?.label ?? s!.symbolKey, raum: getRaumName(s!.raumId) };
        });

      const rawDevices = rcdGroup
        ? circuitDevicesWithoutRcd(circuit)
        : circuit.resolvedDevices;
      const devices = rawDevices.map((d) => ({ ...d, device: findDevice(d.deviceId) }));

      return { circuit, rcdGroup, devices, symbols };
    });

    // Compute RCD group column spans (start/end indices)
    const spans: { group: RcdGroup; startIdx: number; endIdx: number }[] = [];
    const seenRcd = new Set<string>();
    for (let i = 0; i < cols.length; i++) {
      const g = cols[i].rcdGroup;
      if (g && !seenRcd.has(g.id)) {
        seenRcd.add(g.id);
        let end = i;
        for (let j = i + 1; j < cols.length; j++) {
          if (cols[j].rcdGroup?.id === g.id) end = j;
          else break;
        }
        spans.push({ group: g, startIdx: i, endIdx: end });
      }
    }

    // Compute verteiler spans for upstream chain rendering
    const vSpans: VerteilerSpan[] = [];
    const seenVerteiler = new Set<string>();
    for (let i = 0; i < cols.length; i++) {
      const vid = cols[i].circuit.verteilerId;
      if (!seenVerteiler.has(vid)) {
        seenVerteiler.add(vid);
        let end = i;
        for (let j = i + 1; j < cols.length; j++) {
          if (cols[j].circuit.verteilerId === vid) end = j;
          else break;
        }
        const netze = findAllNetzeForVerteiler(netzKonfigurationen, vid);
        vSpans.push({
          verteilerId: vid,
          startIdx: i,
          endIdx: end,
          chains: netze.map((n) => ({ netz: n, upstream: resolveUpstreamDevices(n) })),
        });
      }
    }

    // Compute NetzKonfiguration spans
    const nSpans: NetzSpan[] = [];
    let currentNetzId: string | null | undefined = undefined;
    for (let i = 0; i < cols.length; i++) {
      const vid = cols[i].circuit.verteilerId;
      const netz = verteilerToNetz.get(vid);
      const nid = netz?.id ?? null;
      if (nid !== currentNetzId) {
        if (nSpans.length > 0) {
          nSpans[nSpans.length - 1].endIdx = i - 1;
        }
        nSpans.push({
          netzId: nid,
          bezeichnung: netz?.bezeichnung ?? 'Nicht zugeordnet',
          startIdx: i,
          endIdx: i,
        });
        currentNetzId = nid;
      }
    }
    if (nSpans.length > 0) {
      nSpans[nSpans.length - 1].endIdx = cols.length - 1;
    }

    return { columns: cols, rcdGroupSpans: spans, verteilerSpans: vSpans, netzSpans: nSpans };
  }, [derivedCircuits, allSymbols, gebaeude, netzKonfigurationen, rcdGroups]);

  const COL_W = 200;
  const ROW_H = 30;
  const LEFT = 40;
  const UPSTREAM_SLOT_H = 40;
  const NETZ_HEADER_H = 22;

  // Compute upstream zone height (max across all verteiler groups)
  const maxUpstreamCount = Math.max(0, ...verteilerSpans.flatMap((s) => s.chains.map((c) => c.upstream.length)));
  const UPSTREAM_H = maxUpstreamCount * UPSTREAM_SLOT_H;

  const TOP = 80 + NETZ_HEADER_H + UPSTREAM_H;
  const RCD_TIER_Y = TOP + 20;
  const hasRcdGroups = rcdGroupSpans.length > 0;
  const DEVICE_TIER_Y = hasRcdGroups ? TOP + 70 : TOP + 20;

  const maxDevices = Math.max(1, ...columns.map((c) => c.devices.length));
  const deviceZoneH = maxDevices * 40;
  const labelY = DEVICE_TIER_Y + deviceZoneH + 5;
  const maxSymbols = Math.max(1, ...columns.map((c) => c.symbols.length));
  const totalW = Math.max(dims.width, columns.length * COL_W + LEFT + 40);
  const totalH = Math.max(dims.height, labelY + 25 + maxSymbols * ROW_H + 60);

  const handleNetzSelect = (verteilerId: string, currentNetzId: string | null, newNetzId: string | null) => {
    // Unlink from current netz
    if (currentNetzId) {
      unlinkVerteilerFromNetz(currentNetzId, verteilerId);
    }
    // Link to new netz
    if (newNetzId) {
      linkVerteilerToNetz(newNetzId, verteilerId);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-auto bg-white">
      {columns.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-400">
          Keine Stromkreise. Platzieren Sie Symbole mit Schutzgeräte-Anforderungen.
        </div>
      ) : (
        <>
        <div className="flex items-center gap-3 px-4 py-1.5 border-b border-gray-100 text-xs text-gray-500">
          <label className="flex items-center gap-1">
            Max LSS/RCD:
            <input
              type="number" min={1} max={20} value={maxLssPerRcd}
              onChange={(e) => setMaxLssPerRcd(Number(e.target.value))}
              className="w-14 px-1 py-0.5 border border-gray-300 rounded text-xs"
            />
          </label>
          <span className="border-l border-gray-200 h-4" />
          <span className="text-gray-400">Trennung:</span>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={rcdGroupingStrategy.separateByRoom}
              onChange={(e) => setRcdGroupingStrategy({ separateByRoom: e.target.checked })}
              className="accent-blue-600" />
            nach Raum
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={rcdGroupingStrategy.separateByRatedCurrent}
              onChange={(e) => setRcdGroupingStrategy({ separateByRatedCurrent: e.target.checked })}
              className="accent-blue-600" />
            nach Nennstrom
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={rcdGroupingStrategy.separateByType}
              onChange={(e) => setRcdGroupingStrategy({ separateByType: e.target.checked })}
              className="accent-blue-600" />
            nach Typ
          </label>
        </div>
        <Stage width={totalW} height={totalH}>
          <Layer>
            <Text text="Stromlaufplan" x={LEFT} y={15} fontSize={18} fontStyle="bold" fill="#1f2937" />

            {/* NetzKonfiguration background bands + headers */}
            {netzSpans.map((ns, ni) => {
              const x1 = LEFT + ns.startIdx * COL_W - 5;
              const x2 = LEFT + (ns.endIdx + 1) * COL_W + 5;
              const palette = ns.netzId != null
                ? NETZ_PALETTE[ni % NETZ_PALETTE.length]
                : UNASSIGNED_COLOR;

              return (
                <Group key={`netz-${ns.netzId ?? 'none'}-${ni}`}>
                  {/* Background band */}
                  <Rect
                    x={x1} y={50} width={x2 - x1} height={totalH - 60}
                    fill={palette.bg} opacity={0.4} cornerRadius={4}
                  />
                  {/* Top border accent */}
                  <Rect
                    x={x1} y={50} width={x2 - x1} height={3}
                    fill={palette.border} cornerRadius={[4, 4, 0, 0]}
                  />
                  {/* Header label */}
                  <Text
                    text={ns.bezeichnung}
                    x={x1 + 6} y={55}
                    fontSize={11} fontStyle="bold" fill={palette.text}
                  />
                </Group>
              );
            })}

            {/* Upstream chains per verteiler group */}
            {verteilerSpans.filter((s) => s.chains.length > 0).map((span) => {
              const spanCenter = LEFT + ((span.startIdx + span.endIdx) / 2) * COL_W + COL_W / 2;
              const chainCount = span.chains.length;
              const CHAIN_SPACING = 130;
              const totalWidth = (chainCount - 1) * CHAIN_SPACING;

              return (
                <Group key={`upstream-${span.verteilerId}`}>
                  {span.chains.map((chain, ci) => {
                    const cx = spanCenter - totalWidth / 2 + ci * CHAIN_SPACING;

                    return (
                      <Group key={chain.netz.id}>
                        {/* Netz label */}
                        <Text text={chain.netz.bezeichnung} x={cx - 60} y={68 + NETZ_HEADER_H} fontSize={8} fill="#6b7280" width={120} align="center" />
                        {chain.upstream.map((ud, ui) => {
                          const y = 80 + NETZ_HEADER_H + ui * UPSTREAM_SLOT_H;
                          const isEinspeisung = ud.slot === 'einspeisung';
                          const isZaehler = ud.slot === 'zaehler';
                          const color = isEinspeisung ? '#f0fdf4' : isZaehler ? '#e0e7ff' : '#d1fae5';
                          const textColor = isEinspeisung ? '#166534' : isZaehler ? '#3730a3' : '#065f46';
                          return (
                            <Group key={ui}>
                              {ui > 0 && <Line points={[cx, y - 5, cx, y]} stroke="#374151" strokeWidth={2} />}
                              <Rect x={cx - 55} y={y} width={110} height={28} fill={color} stroke={textColor} strokeWidth={1} cornerRadius={3} />
                              <Text text={ud.label} x={cx - 53} y={y + 3} fontSize={8} fill={textColor} width={106} align="center" />
                              <Text text={ud.sublabel} x={cx - 53} y={y + 15} fontSize={7} fill={textColor} width={106} align="center" />
                              <Line points={[cx, y + 28, cx, y + UPSTREAM_SLOT_H - 5]} stroke="#374151" strokeWidth={2} />
                            </Group>
                          );
                        })}
                        {/* Final line from last upstream device to bus bar */}
                        <Line points={[cx, 80 + NETZ_HEADER_H + chain.upstream.length * UPSTREAM_SLOT_H - 5, cx, TOP]} stroke="#374151" strokeWidth={2} />
                      </Group>
                    );
                  })}
                </Group>
              );
            })}

            {/* Main bus bar */}
            <Line points={[LEFT, TOP, LEFT + columns.length * COL_W, TOP]} stroke="#374151" strokeWidth={3} />
            <Text text="L1" x={LEFT - 25} y={TOP - 7} fontSize={12} fill="#374151" fontStyle="bold" />

            {/* Shared RCD boxes spanning grouped columns */}
            {rcdGroupSpans.map((span) => {
              const x1 = LEFT + span.startIdx * COL_W + COL_W / 2 - 35;
              const x2 = LEFT + span.endIdx * COL_W + COL_W / 2 + 35;
              const cx = (x1 + x2) / 2;
              const w = x2 - x1;
              const dev = span.group.sharedRcdDevice ? findDevice(span.group.sharedRcdDevice.deviceId) : null;

              return (
                <Group key={span.group.id}>
                  {/* Line from bus to shared RCD */}
                  <Line points={[cx, TOP, cx, RCD_TIER_Y]} stroke="#374151" strokeWidth={2} />
                  {/* Shared RCD box */}
                  <Rect x={x1} y={RCD_TIER_Y} width={w} height={24} fill="#fef3c7" stroke="#92400e" strokeWidth={1} cornerRadius={3} dash={span.group.hasManualOverride ? [4, 3] : undefined} />
                  <Text text={dev?.label ?? 'RCD'} x={x1 + 2} y={RCD_TIER_Y + 4} fontSize={8} fill="#92400e" width={w - 4} align="center" />
                  <Text
                    text={`gemeinsam (${span.endIdx - span.startIdx + 1} SK)`}
                    x={x1 + 2} y={RCD_TIER_Y + 14} fontSize={7} fill="#92400e" width={w - 4} align="center"
                  />
                  {/* Branch lines from RCD down to each column */}
                  {Array.from({ length: span.endIdx - span.startIdx + 1 }, (_, ci) => {
                    const colX = LEFT + (span.startIdx + ci) * COL_W + COL_W / 2;
                    return (
                      <Line key={ci} points={[colX, RCD_TIER_Y + 24, colX, DEVICE_TIER_Y - 5]} stroke="#374151" strokeWidth={2} />
                    );
                  })}
                </Group>
              );
            })}

            {/* Per-column rendering */}
            {columns.map((col, ci) => {
              const x = LEFT + ci * COL_W + COL_W / 2;
              const inRcdGroup = !!col.rcdGroup;

              return (
                <Group key={ci}>
                  {/* Vertical from bus (standalone only) */}
                  {!inRcdGroup && (
                    <Line points={[x, TOP, x, DEVICE_TIER_Y - 5]} stroke="#374151" strokeWidth={2} />
                  )}

                  {/* Per-circuit devices (MCB, AFDD, RCBO) */}
                  {col.devices.map((d, di) => {
                    const devY = DEVICE_TIER_Y + di * 40;
                    const dev = d.device;
                    const isRcd = d.role === 'rcd' || d.role === 'rcd_type_b' || d.role === 'rcbo';
                    const color = isRcd ? '#fef3c7' : d.role === 'afdd' ? '#fce7f3' : '#dbeafe';
                    const textColor = isRcd ? '#92400e' : d.role === 'afdd' ? '#9d174d' : '#1e40af';

                    return (
                      <Group key={di}>
                        <Line points={[x, devY - 5, x, devY]} stroke="#374151" strokeWidth={2} />
                        <Rect x={x - 35} y={devY} width={70} height={24} fill={color} stroke={textColor} strokeWidth={1} cornerRadius={3} />
                        <Text text={dev?.label ?? d.deviceId} x={x - 33} y={devY + 4} fontSize={8} fill={textColor} width={66} align="center" />
                        <Text text={d.role.toUpperCase()} x={x - 33} y={devY + 14} fontSize={7} fill={textColor} width={66} align="center" />
                        <Line points={[x, devY + 24, x, devY + 35]} stroke="#374151" strokeWidth={2} />
                      </Group>
                    );
                  })}

                  {/* If no per-circuit devices but in RCD group, draw line to label */}
                  {col.devices.length === 0 && (
                    <Line points={[x, DEVICE_TIER_Y - 5, x, labelY - 5]} stroke="#374151" strokeWidth={1} dash={[4, 4]} />
                  )}

                  {/* Circuit label (right-click for context menu) */}
                  <Group
                    onContextMenu={(e) => {
                      e.evt.preventDefault();
                      const stage = e.target.getStage();
                      const pos = stage?.getPointerPosition();
                      if (!pos) return;
                      const override = rcdGroupOverrides.find((o) => o.circuitId === col.circuit.id);
                      const netz = findNetzForVerteiler(netzKonfigurationen, col.circuit.verteilerId);
                      setCtxMenu({
                        circuitId: col.circuit.id,
                        x: pos.x,
                        y: pos.y,
                        verteilerId: col.circuit.verteilerId,
                        currentGroupId: override?.rcdGroupId ?? null,
                        currentNetzId: netz?.id ?? null,
                      });
                    }}
                  >
                    <Rect x={x - 50} y={labelY - 2} width={100} height={22} fill="transparent" />
                    <Text text={col.circuit.name} x={x - 50} y={labelY} fontSize={9} fill="#6b7280" width={100} align="center" />
                    <Text text={col.circuit.verteilerId} x={x - 50} y={labelY + 10} fontSize={8} fill="#9ca3af" width={100} align="center" />
                  </Group>

                  {/* Line to consumers */}
                  {col.symbols.length > 0 && (
                    <Line points={[x, labelY + 22, x, labelY + 32]} stroke="#374151" strokeWidth={1} />
                  )}

                  {/* Consumer symbols */}
                  {col.symbols.map((sym, si) => {
                    const sy = labelY + 37 + si * ROW_H;
                    return (
                      <Group key={si}>
                        <Line points={[x, sy, x + 15, sy]} stroke="#6b7280" strokeWidth={1} />
                        <Rect x={x + 15} y={sy - 10} width={120} height={20} fill="#f3f4f6" stroke="#d1d5db" strokeWidth={1} cornerRadius={2} />
                        <Text text={sym.label} x={x + 20} y={sy - 6} fontSize={9} fill="#374151" />
                        <Text text={sym.raum} x={x + 20} y={sy + 3} fontSize={7} fill="#9ca3af" />
                      </Group>
                    );
                  })}
                </Group>
              );
            })}
          </Layer>
        </Stage>
        {ctxMenu && (
          <StromlaufplanContextMenu
            x={ctxMenu.x}
            y={ctxMenu.y + 40}
            circuitId={ctxMenu.circuitId}
            currentGroupId={ctxMenu.currentGroupId}
            rcdGroups={rcdGroups}
            verteilerId={ctxMenu.verteilerId}
            onSelect={(groupId) => {
              setRcdGroupOverride(ctxMenu.circuitId, groupId);
              setCtxMenu(null);
            }}
            onClose={() => setCtxMenu(null)}
            netzKonfigurationen={netzKonfigurationen}
            currentNetzId={ctxMenu.currentNetzId}
            verteilerName={verteiler.find((v) => v.id === ctxMenu.verteilerId)?.name ?? ctxMenu.verteilerId}
            onNetzSelect={(netzId) => {
              handleNetzSelect(ctxMenu.verteilerId, ctxMenu.currentNetzId, netzId);
              setCtxMenu(null);
            }}
          />
        )}
        </>
      )}
    </div>
  );
}
