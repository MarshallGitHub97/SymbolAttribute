import { useState } from 'react';
import { useAppStore, useDerivedCircuits, useRcdGroups } from '../../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { NETZWERK_TYP_LABELS, type NetzwerkTyp } from '../../types';
import { findDevice } from '../../data/cabinetCatalog';
import { resolveUpstreamDevices } from '../../logic/netzUpstream';
import { NetzKonfigPanel } from './netzkonfiguration/NetzKonfigPanel';
import { StromkreisDetailPanel } from './netzkonfiguration/StromkreisDetailPanel';
import type { RcdGroup } from '../../logic/rcdGrouping';
import type { DerivedCircuit } from '../../types';

type DragItem =
  | { type: 'circuit'; circuitId: string; verteilerId: string }
  | { type: 'verteiler'; verteilerId: string; fromNetzId: string };

export function Netzkonfiguration() {
  const {
    netzKonfigurationen,
    activeNetzKonfigId,
    setActiveNetzKonfig,
    addNetzKonfiguration,
    removeNetzKonfiguration,
    verteiler,
    linkVerteilerToNetz,
    unlinkVerteilerFromNetz,
    setRcdGroupOverride,
  } = useAppStore(
    useShallow((s) => ({
      netzKonfigurationen: s.netzKonfigurationen,
      activeNetzKonfigId: s.activeNetzKonfigId,
      setActiveNetzKonfig: s.setActiveNetzKonfig,
      addNetzKonfiguration: s.addNetzKonfiguration,
      removeNetzKonfiguration: s.removeNetzKonfiguration,
      verteiler: s.verteiler,
      linkVerteilerToNetz: s.linkVerteilerToNetz,
      unlinkVerteilerFromNetz: s.unlinkVerteilerFromNetz,
      setRcdGroupOverride: s.setRcdGroupOverride,
    }))
  );

  const derivedCircuits = useDerivedCircuits();
  const rcdGroups = useRcdGroups();
  const [selectedCircuitId, setSelectedCircuitId] = useState<string | null>(null);
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const activeNetz = netzKonfigurationen.find((n) => n.id === activeNetzKonfigId);

  const handleNetzClick = (netzId: string) => {
    setActiveNetzKonfig(netzId);
    setSelectedCircuitId(null);
  };

  const handleCircuitClick = (circuitId: string) => {
    setSelectedCircuitId(circuitId);
  };

  // Label helpers
  const rcdLabel = (g: RcdGroup) => {
    if (g.sharedRcdDevice) {
      const dev = findDevice(g.sharedRcdDevice.deviceId);
      return dev?.label ?? 'RCD';
    }
    return 'RCD';
  };

  const circuitLabel = (c: DerivedCircuit) => {
    const mcb = c.resolvedDevices.find((d) => d.role === 'mcb' || d.role === 'rcbo' || d.role === 'afdd');
    if (mcb) {
      const dev = findDevice(mcb.deviceId);
      if (dev) return `${dev.label} – ${c.name}`;
    }
    return c.name;
  };

  // Drag handlers
  const handleCircuitDragStart = (e: React.DragEvent, circuitId: string, verteilerId: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'circuit', circuitId, verteilerId }));
    e.dataTransfer.effectAllowed = 'move';
    setDragItem({ type: 'circuit', circuitId, verteilerId });
  };

  const handleVerteilerDragStart = (e: React.DragEvent, verteilerId: string, fromNetzId: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'verteiler', verteilerId, fromNetzId }));
    e.dataTransfer.effectAllowed = 'move';
    setDragItem({ type: 'verteiler', verteilerId, fromNetzId });
  };

  const handleDragEnd = () => {
    setDragItem(null);
    setDropTarget(null);
  };

  const handleRcdGroupDrop = (e: React.DragEvent, rcdGroupId: string, groupVerteilerId: string) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.type === 'circuit' && data.verteilerId === groupVerteilerId) {
        setRcdGroupOverride(data.circuitId, rcdGroupId);
      }
    } catch { /* ignore */ }
    setDragItem(null);
    setDropTarget(null);
  };

  const handleAutoDropZone = (e: React.DragEvent, verteilerId: string) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.type === 'circuit' && data.verteilerId === verteilerId) {
        setRcdGroupOverride(data.circuitId, null);
      }
    } catch { /* ignore */ }
    setDragItem(null);
    setDropTarget(null);
  };

  const handleNewGroupDrop = (e: React.DragEvent, verteilerId: string) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.type === 'circuit' && data.verteilerId === verteilerId) {
        setRcdGroupOverride(data.circuitId, `manual-${verteilerId}-${Date.now()}`);
      }
    } catch { /* ignore */ }
    setDragItem(null);
    setDropTarget(null);
  };

  const handleNetzDrop = (e: React.DragEvent, targetNetzId: string) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.type === 'verteiler' && data.fromNetzId !== targetNetzId) {
        unlinkVerteilerFromNetz(data.fromNetzId, data.verteilerId);
        linkVerteilerToNetz(targetNetzId, data.verteilerId);
      }
    } catch { /* ignore */ }
    setDragItem(null);
    setDropTarget(null);
  };

  const allowDropIf = (e: React.DragEvent, condition: boolean) => {
    if (condition) e.preventDefault();
  };

  const isCircuitDrag = dragItem?.type === 'circuit';
  const isVerteilerDrag = dragItem?.type === 'verteiler';

  return (
    <div className="flex h-full">
      {/* Left: network type tree */}
      <aside className="w-80 border-r border-gray-200 bg-white overflow-y-auto shrink-0">
        <div className="p-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Netzstruktur</h2>
        </div>

        {(Object.entries(NETZWERK_TYP_LABELS) as [NetzwerkTyp, string][]).map(
          ([typ, label]) => {
            const items = netzKonfigurationen.filter((n) => n.netzwerkTyp === typ);
            return (
              <div key={typ} className="border-b border-gray-100">
                <div className="px-3 py-2 bg-gray-50 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600 truncate">
                    {label}
                  </span>
                  <button
                    onClick={() => addNetzKonfiguration(typ)}
                    className="ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    +
                  </button>
                </div>
                {items.map((netz) => {
                  const isActive = netz.id === activeNetzKonfigId;
                  const netzCircuits = derivedCircuits.filter((c) => netz.verteilerIds.includes(c.verteilerId));
                  const netzRcdGroups = rcdGroups.filter((g) => netz.verteilerIds.includes(g.verteilerId));
                  const groupedCircuitIds = new Set(netzRcdGroups.flatMap((g) => g.circuitIds));
                  const linkedVerteiler = verteiler.filter((v) => netz.verteilerIds.includes(v.id));
                  const upstream = resolveUpstreamDevices(netz);

                  return (
                    <div
                      key={netz.id}
                      onDragOver={(e) => allowDropIf(e, isVerteilerDrag && dragItem.fromNetzId !== netz.id)}
                      onDragEnter={() => { if (isVerteilerDrag && dragItem.fromNetzId !== netz.id) setDropTarget(`netz-${netz.id}`); }}
                      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null); }}
                      onDrop={(e) => handleNetzDrop(e, netz.id)}
                    >
                      {/* Netz header */}
                      <div
                        className={`flex items-center group ${
                          dropTarget === `netz-${netz.id}`
                            ? 'bg-green-50 ring-1 ring-inset ring-green-300'
                            : isActive && !selectedCircuitId
                              ? 'bg-blue-100'
                              : isActive
                                ? 'bg-blue-50'
                                : 'hover:bg-gray-50'
                        }`}
                      >
                        <button
                          onClick={() => handleNetzClick(netz.id)}
                          className={`flex-1 px-5 py-1.5 text-left text-xs truncate ${
                            isActive
                              ? 'text-blue-800 font-medium'
                              : 'text-gray-700'
                          }`}
                        >
                          {netz.bezeichnung}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNetzKonfiguration(netz.id);
                          }}
                          className="mr-2 px-1 text-[10px] text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100"
                        >
                          x
                        </button>
                      </div>

                      {/* Expanded tree (only for active netz) */}
                      {isActive && (
                        <div className="pb-1">
                          {/* Upstream devices */}
                          {upstream.map((ud) => (
                            <div
                              key={ud.slot}
                              className="pl-7 pr-2 py-0.5 text-[10px] text-teal-700 flex items-center gap-1.5 hover:bg-gray-50 cursor-default"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                              <span className="truncate">{ud.label}</span>
                              {ud.sublabel && (
                                <span className="text-gray-400 ml-auto shrink-0">{ud.sublabel}</span>
                              )}
                            </div>
                          ))}

                          {/* Verteiler level */}
                          {linkedVerteiler.map((v) => {
                            const vRcdGroups = netzRcdGroups.filter((g) => g.verteilerId === v.id);
                            const vStandalone = netzCircuits.filter(
                              (c) => c.verteilerId === v.id && !groupedCircuitIds.has(c.id)
                            );
                            const hasContent = vRcdGroups.length > 0 || vStandalone.length > 0;

                            return (
                              <div key={v.id}>
                                {/* Verteiler header (draggable) */}
                                <div
                                  draggable
                                  onDragStart={(e) => handleVerteilerDragStart(e, v.id, netz.id)}
                                  onDragEnd={handleDragEnd}
                                  className={`pl-7 pr-2 py-1 text-[10px] font-medium text-gray-700 flex items-center gap-1.5 cursor-grab hover:bg-gray-50 ${
                                    dragItem?.type === 'verteiler' && dragItem.verteilerId === v.id ? 'opacity-50' : ''
                                  }`}
                                >
                                  <span className="text-gray-400">▾</span>
                                  {v.name}
                                </div>

                                {hasContent && (
                                  <div>
                                    {/* RCD groups */}
                                    {vRcdGroups.map((g) => (
                                      <div key={g.id}>
                                        {/* RCD group header (drop target) */}
                                        <div
                                          onDragOver={(e) => allowDropIf(e, isCircuitDrag && dragItem.verteilerId === v.id)}
                                          onDragEnter={() => { if (isCircuitDrag && dragItem.verteilerId === v.id) setDropTarget(`rcd-${g.id}`); }}
                                          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null); }}
                                          onDrop={(e) => handleRcdGroupDrop(e, g.id, v.id)}
                                          className={`pl-10 pr-2 py-1 text-[10px] font-medium text-amber-700 flex items-center gap-1 transition-colors ${
                                            dropTarget === `rcd-${g.id}`
                                              ? 'bg-green-50 ring-1 ring-inset ring-green-300'
                                              : ''
                                          }`}
                                        >
                                          <span className="text-amber-500">▸</span>
                                          {rcdLabel(g)}
                                          <span className="text-gray-400 ml-auto">{g.circuitIds.length} SK</span>
                                        </div>

                                        {/* Circuits in RCD group (draggable) */}
                                        {g.circuitIds.map((cId) => {
                                          const c = derivedCircuits.find((dc) => dc.id === cId);
                                          if (!c) return null;
                                          return (
                                            <div
                                              key={cId}
                                              draggable
                                              onDragStart={(e) => handleCircuitDragStart(e, cId, c.verteilerId)}
                                              onDragEnd={handleDragEnd}
                                              onClick={() => handleCircuitClick(cId)}
                                              className={`w-full text-left pl-14 pr-2 py-0.5 text-[10px] truncate cursor-grab select-none ${
                                                dragItem?.type === 'circuit' && dragItem.circuitId === cId
                                                  ? 'opacity-50'
                                                  : selectedCircuitId === cId
                                                    ? 'bg-blue-100 text-blue-800 font-medium'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                              }`}
                                            >
                                              {circuitLabel(c)}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ))}

                                    {/* Standalone circuits (draggable) */}
                                    {vStandalone.map((c) => (
                                      <div
                                        key={c.id}
                                        draggable
                                        onDragStart={(e) => handleCircuitDragStart(e, c.id, c.verteilerId)}
                                        onDragEnd={handleDragEnd}
                                        onClick={() => handleCircuitClick(c.id)}
                                        className={`w-full text-left pl-10 pr-2 py-0.5 text-[10px] truncate cursor-grab select-none ${
                                          dragItem?.type === 'circuit' && dragItem.circuitId === c.id
                                            ? 'opacity-50'
                                            : selectedCircuitId === c.id
                                              ? 'bg-blue-100 text-blue-800 font-medium'
                                              : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                      >
                                        {circuitLabel(c)}
                                      </div>
                                    ))}

                                    {/* Drop zones (visible during circuit drag for this verteiler) */}
                                    {isCircuitDrag && dragItem.verteilerId === v.id && (
                                      <>
                                        <div
                                          onDragOver={(e) => { e.preventDefault(); }}
                                          onDragEnter={() => setDropTarget(`auto-${v.id}`)}
                                          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null); }}
                                          onDrop={(e) => handleAutoDropZone(e, v.id)}
                                          className={`pl-10 pr-2 py-1 text-[10px] text-blue-600 transition-colors ${
                                            dropTarget === `auto-${v.id}`
                                              ? 'bg-blue-50 ring-1 ring-inset ring-blue-300'
                                              : ''
                                          }`}
                                        >
                                          ↩ Automatisch
                                        </div>
                                        <div
                                          onDragOver={(e) => { e.preventDefault(); }}
                                          onDragEnter={() => setDropTarget(`new-${v.id}`)}
                                          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null); }}
                                          onDrop={(e) => handleNewGroupDrop(e, v.id)}
                                          className={`pl-10 pr-2 py-1 text-[10px] text-green-600 transition-colors ${
                                            dropTarget === `new-${v.id}`
                                              ? 'bg-green-50 ring-1 ring-inset ring-green-300'
                                              : ''
                                          }`}
                                        >
                                          + Neue RCD-Gruppe
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Empty state */}
                          {linkedVerteiler.length === 0 && netzCircuits.length === 0 && (
                            <div className="pl-7 pr-2 py-1 text-[10px] text-gray-400 italic">
                              Keine Verteiler zugeordnet
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          }
        )}
      </aside>

      {/* Right: config form or circuit detail */}
      <main className="flex-1 overflow-y-auto bg-white">
        {selectedCircuitId ? (
          <StromkreisDetailPanel circuitId={selectedCircuitId} />
        ) : activeNetz ? (
          <NetzKonfigPanel netz={activeNetz} />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            Netz auswaehlen oder neues erstellen
          </div>
        )}
      </main>
    </div>
  );
}
