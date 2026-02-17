import { useMemo, useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Text, Line, Group } from 'react-konva';
import { useDerivedCircuits, useNetzKonfigurationen, useRcdGroups, useAppStore } from '../../store/useAppStore';
import { findDevice, CABINET_TE_PER_ROW } from '../../data/cabinetCatalog';
import { circuitDevicesWithoutRcd } from '../../logic/rcdGrouping';
import { findAllNetzeForVerteiler, resolveUpstreamDevices } from '../../logic/netzUpstream';
import type { NetzKonfiguration } from '../../types';
import { NETZFORM_LABELS } from '../../types';
import { StromlaufplanContextMenu } from './StromlaufplanContextMenu';

const TE_PX = 30;
const ROW_H = 50;
const HEADER_H_BASE = 35;
const HEADER_H_WITH_NETZ = 48;

interface PlacedDevice {
  deviceId: string;
  label: string;
  teWidth: number;
  role: string;
  x: number;
  row: number;
  color: string;
  isShared: boolean;
  isUpstream: boolean;
  circuitId?: string;
  verteilerId?: string;
}

export function Aufbauplan() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 800, height: 600 });
  const derivedCircuits = useDerivedCircuits();
  const netzKonfigurationen = useNetzKonfigurationen();
  const rcdGroups = useRcdGroups();
  const setRcdGroupOverride = useAppStore((s) => s.setRcdGroupOverride);
  const rcdGroupOverrides = useAppStore((s) => s.rcdGroupOverrides);

  const [ctxMenu, setCtxMenu] = useState<{
    circuitId: string; x: number; y: number; verteilerId: string; currentGroupId: string | null;
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

  const verteilerLayouts = useMemo(() => {
    // Group circuits by verteilerId
    const byVerteiler = new Map<string, typeof derivedCircuits>();
    for (const c of derivedCircuits) {
      const arr = byVerteiler.get(c.verteilerId) ?? [];
      arr.push(c);
      byVerteiler.set(c.verteilerId, arr);
    }

    const circuitToRcdGroup = new Map<string, typeof rcdGroups[0]>();
    for (const g of rcdGroups) {
      for (const cid of g.circuitIds) circuitToRcdGroup.set(cid, g);
    }

    const layouts: { name: string; devices: PlacedDevice[]; netze: NetzKonfiguration[] }[] = [];

    for (const [name, circuits] of byVerteiler) {
      const devices: PlacedDevice[] = [];
      const placedRcdGroupIds = new Set<string>();

      // Upstream devices from ALL linked NetzKonfigurationen
      const netze = findAllNetzeForVerteiler(netzKonfigurationen, name);
      for (const netz of netze) {
        const upstream = resolveUpstreamDevices(netz);
        for (const ud of upstream) {
          if (ud.teWidth <= 0) continue; // skip Einspeisung (no DIN rail footprint)
          devices.push({
            deviceId: ud.device?.id ?? ud.slot,
            label: ud.sublabel ? `${ud.label} ${ud.sublabel}` : ud.label,
            teWidth: ud.teWidth,
            role: ud.slot,
            x: 0,
            row: 0,
            color: ud.slot === 'zaehler' ? '#e0e7ff' : '#d1fae5',
            isShared: false,
            isUpstream: true,
          });
        }
      }

      for (const circuit of circuits) {
        const rcdGroup = circuitToRcdGroup.get(circuit.id);

        // Shared RCD: place once per group
        if (rcdGroup && !placedRcdGroupIds.has(rcdGroup.id) && rcdGroup.sharedRcdDevice) {
          placedRcdGroupIds.add(rcdGroup.id);
          const dev = findDevice(rcdGroup.sharedRcdDevice.deviceId);
          if (dev) {
            devices.push({
              deviceId: dev.id,
              label: `${dev.label} (${rcdGroup.circuitIds.length} SK)`,
              teWidth: dev.teWidth,
              role: rcdGroup.sharedRcdDevice.role,
              x: 0,
              row: 0,
              color: '#fef3c7',
              isShared: true,
              isUpstream: false,
            });
          }
        }

        // Per-circuit devices (MCB, AFDD, etc.)
        const perCircuit = rcdGroup
          ? circuitDevicesWithoutRcd(circuit)
          : circuit.resolvedDevices;

        for (const d of perCircuit) {
          const dev = findDevice(d.deviceId);
          if (!dev) continue;

          const isRcd = d.role === 'rcd' || d.role === 'rcd_type_b';
          const color = isRcd ? '#fef3c7'
            : d.role === 'afdd' ? '#fce7f3'
            : d.role === 'rcbo' ? '#e0f2fe'
            : '#dbeafe';

          devices.push({
            deviceId: dev.id,
            label: dev.label,
            teWidth: dev.teWidth,
            role: d.role,
            x: 0,
            row: 0,
            color,
            isShared: false,
            isUpstream: false,
            circuitId: circuit.id,
            verteilerId: circuit.verteilerId,
          });
        }
      }

      // Layout on DIN rail rows
      let totalTE = 0;
      let row = 0;
      for (const d of devices) {
        if (totalTE + d.teWidth > CABINET_TE_PER_ROW) {
          row++;
          totalTE = 0;
        }
        d.x = totalTE * TE_PX;
        d.row = row;
        totalTE += d.teWidth;
      }

      layouts.push({ name, devices, netze });
    }
    return layouts;
  }, [derivedCircuits, netzKonfigurationen, rcdGroups]);

  const LEFT = 40;
  const TOP = 60;
  const CABINET_GAP = 30;

  let totalHeight = TOP;
  for (const layout of verteilerLayouts) {
    const headerH = layout.netze.length > 0 ? HEADER_H_WITH_NETZ : HEADER_H_BASE;
    const maxRow = Math.max(0, ...layout.devices.map(d => d.row));
    totalHeight += headerH + (maxRow + 1) * ROW_H + CABINET_GAP;
  }
  totalHeight = Math.max(totalHeight, dims.height);
  const totalWidth = Math.max(dims.width, LEFT + CABINET_TE_PER_ROW * TE_PX + 80);

  let yOffset = TOP;

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-auto bg-white">
      {verteilerLayouts.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-400">
          Keine Stromkreise abgeleitet.
        </div>
      ) : (
        <>
        <Stage width={totalWidth} height={totalHeight}>
          <Layer>
            <Text text="Aufbauplan" x={LEFT} y={15} fontSize={18} fontStyle="bold" fill="#1f2937" />
            {verteilerLayouts.map((layout, vi) => {
              const headerH = layout.netze.length > 0 ? HEADER_H_WITH_NETZ : HEADER_H_BASE;
              const maxRow = Math.max(0, ...layout.devices.map(d => d.row));
              const cabinetH = headerH + (maxRow + 1) * ROW_H + 10;
              const startY = yOffset;
              yOffset += cabinetH + CABINET_GAP;

              return (
                <Group key={vi}>
                  {/* Cabinet background */}
                  <Rect x={LEFT} y={startY} width={CABINET_TE_PER_ROW * TE_PX + 20} height={cabinetH} fill="#f9fafb" stroke="#d1d5db" strokeWidth={1} cornerRadius={4} />
                  {/* Cabinet header */}
                  <Rect x={LEFT} y={startY} width={CABINET_TE_PER_ROW * TE_PX + 20} height={headerH} fill="#374151" cornerRadius={[4, 4, 0, 0]} />
                  <Text text={layout.name} x={LEFT + 10} y={startY + 10} fontSize={14} fontStyle="bold" fill="white" />
                  {layout.netze.length > 0 && (
                    <Text
                      text={layout.netze.map((n) => `${n.bezeichnung} (${NETZFORM_LABELS[n.einspeisung.netzform]}, ${n.leitungstyp} ${n.querschnitt}mm²)`).join(' | ')}
                      x={LEFT + 10} y={startY + 27} fontSize={10} fill="#d1d5db"
                    />
                  )}

                  {/* DIN rails */}
                  {Array.from({ length: maxRow + 1 }, (_, ri) => (
                    <Line key={ri} points={[LEFT + 10, startY + headerH + ri * ROW_H + 20, LEFT + CABINET_TE_PER_ROW * TE_PX + 10, startY + headerH + ri * ROW_H + 20]} stroke="#9ca3af" strokeWidth={2} dash={[4, 4]} />
                  ))}

                  {/* Devices */}
                  {layout.devices.map((d, di) => {
                    const dx = LEFT + 10 + d.x;
                    const dy = startY + headerH + d.row * ROW_H + 5;
                    const w = d.teWidth * TE_PX - 4;
                    const strokeColor = d.isUpstream ? '#065f46' : d.isShared ? '#92400e' : '#6b7280';
                    const strokeW = d.isUpstream || d.isShared ? 2 : 1;
                    return (
                      <Group
                        key={di}
                        onContextMenu={d.circuitId ? (e) => {
                          e.evt.preventDefault();
                          const stage = e.target.getStage();
                          const pos = stage?.getPointerPosition();
                          if (!pos || !d.circuitId || !d.verteilerId) return;
                          const override = rcdGroupOverrides.find((o) => o.circuitId === d.circuitId);
                          setCtxMenu({
                            circuitId: d.circuitId,
                            x: pos.x,
                            y: pos.y,
                            verteilerId: d.verteilerId,
                            currentGroupId: override?.rcdGroupId ?? null,
                          });
                        } : undefined}
                      >
                        <Rect
                          x={dx} y={dy} width={w} height={28}
                          fill={d.color}
                          stroke={strokeColor}
                          strokeWidth={strokeW}
                          cornerRadius={2}
                        />
                        <Text text={d.label} x={dx + 2} y={dy + 4} fontSize={8} fill="#1f2937" width={w - 4} />
                        <Text text={`${d.teWidth} TE`} x={dx + 2} y={dy + 16} fontSize={7} fill="#6b7280" width={w - 4} />
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
            y={ctxMenu.y}
            circuitId={ctxMenu.circuitId}
            currentGroupId={ctxMenu.currentGroupId}
            rcdGroups={rcdGroups}
            verteilerId={ctxMenu.verteilerId}
            onSelect={(groupId) => {
              setRcdGroupOverride(ctxMenu.circuitId, groupId);
              setCtxMenu(null);
            }}
            onClose={() => setCtxMenu(null)}
          />
        )}
        </>
      )}
    </div>
  );
}
