import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type {
  PlacedSymbol,
  ViewType,
  Gebaeude,
  CircuitGroupOverride,
  ProtectionRequirement,
  DerivedCircuit,
  RcdGroupOverride,
  RcdGroupingStrategy,
  Kabel,
  SelectionTarget,
  NetzKonfiguration,
  NetzwerkTyp,
  Verteiler,
} from '../types';
import { NETZWERK_TYP_LABELS } from '../types';
import { symbolCatalog } from '../data/mockSymbols';
import { mockGebaeude } from '../data/mockProject';
import { deriveCircuits } from '../logic/circuitDerivation';
import { groupBySharedRcd } from '../logic/rcdGrouping';
import type { RcdGroup } from '../logic/rcdGrouping';

interface AppState {
  gebaeude: Gebaeude;
  activeRaumId: string;
  placedSymbols: PlacedSymbol[];
  circuitGroupOverrides: CircuitGroupOverride[];
  kabel: Kabel[];
  selectedTarget: SelectionTarget;
  interactionMode: 'default' | 'kabel';
  kabelDraft: string[];
  activeView: ViewType;

  // RCD grouping
  maxLssPerRcd: number;
  rcdGroupOverrides: RcdGroupOverride[];
  rcdGroupingStrategy: RcdGroupingStrategy;
  setMaxLssPerRcd: (value: number) => void;
  setRcdGroupingStrategy: (patch: Partial<RcdGroupingStrategy>) => void;
  setRcdGroupOverride: (circuitId: string, rcdGroupId: string | null) => void;
  resetAllRcdGroupOverrides: () => void;

  addSymbol: (symbolKey: string, raumId: string, x: number, y: number) => void;
  updateSymbol: (id: string, patch: Partial<PlacedSymbol>) => void;
  moveSymbol: (id: string, x: number, y: number) => void;
  removeSymbol: (id: string) => void;
  selectSymbol: (id: string | null) => void;
  setActiveRaum: (raumId: string) => void;
  setActiveView: (view: ViewType) => void;

  setSymbolVerteiler: (symbolId: string, verteilerId: string | null) => void;
  setProtectionOverride: (symbolId: string, overrides: ProtectionRequirement[] | undefined) => void;
  setCircuitGroupOverride: (groupId: string, patch: Partial<CircuitGroupOverride>) => void;
  removeCircuitGroupOverride: (groupId: string) => void;
  moveSymbolToGroup: (symbolId: string, targetGroupId: string | null) => void;

  // Kabel actions
  addKabel: (kabeltyp: string, symbolIds: string[]) => void;
  removeKabel: (id: string) => void;
  updateKabel: (id: string, patch: Partial<Kabel>) => void;
  addSymbolToKabel: (kabelId: string, symbolId: string) => void;
  removeSymbolFromKabel: (kabelId: string, symbolId: string) => void;

  // Interaction mode
  setSelectedTarget: (target: SelectionTarget) => void;
  setInteractionMode: (mode: 'default' | 'kabel') => void;
  addToKabelDraft: (symbolId: string) => void;
  finishKabelDraft: () => void;
  cancelKabelDraft: () => void;

  // Netzstruktur
  netzKonfigurationen: NetzKonfiguration[];
  verteiler: Verteiler[];
  activeNetzKonfigId: string | null;
  addNetzKonfiguration: (typ: NetzwerkTyp) => void;
  updateNetzKonfiguration: (id: string, patch: Partial<NetzKonfiguration>) => void;
  removeNetzKonfiguration: (id: string) => void;
  addVerteiler: (name: string) => void;
  updateVerteiler: (id: string, patch: Partial<Verteiler>) => void;
  removeVerteiler: (id: string) => void;
  setActiveNetzKonfig: (id: string | null) => void;
  linkVerteilerToNetz: (netzId: string, verteilerId: string) => void;
  unlinkVerteilerFromNetz: (netzId: string, verteilerId: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      gebaeude: mockGebaeude,
      activeRaumId: 'r-wohn',
      placedSymbols: [],
      circuitGroupOverrides: [],
      kabel: [],
      selectedTarget: null,
      interactionMode: 'default' as const,
      kabelDraft: [] as string[],
      activeView: 'installationsplan' as ViewType,

      // RCD grouping defaults
      maxLssPerRcd: 6,
      rcdGroupOverrides: [],
      rcdGroupingStrategy: { separateByRoom: false, separateByRatedCurrent: false, separateByType: false },

      setMaxLssPerRcd: (value) => set({ maxLssPerRcd: Math.max(value, 1) }),
      setRcdGroupingStrategy: (patch) =>
        set((s) => ({ rcdGroupingStrategy: { ...s.rcdGroupingStrategy, ...patch } })),

      setRcdGroupOverride: (circuitId, rcdGroupId) =>
        set((s) => {
          const filtered = s.rcdGroupOverrides.filter((o) => o.circuitId !== circuitId);
          if (rcdGroupId == null) return { rcdGroupOverrides: filtered };
          return { rcdGroupOverrides: [...filtered, { circuitId, rcdGroupId }] };
        }),

      resetAllRcdGroupOverrides: () => set({ rcdGroupOverrides: [] }),

      // Netzstruktur defaults
      netzKonfigurationen: [{
        id: 'default-netz',
        netzwerkTyp: '230_400v',
        bezeichnung: '230/400V Versorgung 1',
        notiz: '',
        leitungstyp: 'NYY-J',
        querschnitt: 16,
        einspeisung: { netzform: 'TN-S_5pol', alsKlemmenblock: false },
        zaehlervorsicherung: { enabled: true, ampere: 63, deviceId: 'sls-63a-3p' },
        zaehler: { enabled: true, deviceId: 'meter-4p' },
        hauptschalter: { enabled: true, ampere: 63, deviceId: 'main-switch-3p-63a' },
        ueberspannungsschutz: {
          enabled: true,
          position: 'vor_zaehler',
          deviceId: 'spd-4p',
          vorsicherung: { enabled: true, ampere: 63 },
        },
        verteilerIds: ['HV-EG'],
      }] as NetzKonfiguration[],
      verteiler: [{ id: 'HV-EG', name: 'Hauptverteiler EG' }] as Verteiler[],
      activeNetzKonfigId: null,

      addSymbol: (symbolKey, raumId, x, y) => {
        const def = symbolCatalog.find((s) => s.key === symbolKey);
        if (!def) return;
        const symbol: PlacedSymbol = {
          id: crypto.randomUUID(),
          symbolKey,
          raumId,
          x,
          y,
          rotation: 0,
          attribute: { ...def.defaultAttribute },
          verteilerId: null,
          knx: { ...def.defaultKnx },
          artikel: def.defaultArtikel.map((a) => ({ ...a, id: crypto.randomUUID() })),
        };
        set((s) => ({
          placedSymbols: [...s.placedSymbols, symbol],
          selectedTarget: { type: 'symbol' as const, id: symbol.id },
        }));
      },

      updateSymbol: (id, patch) =>
        set((s) => ({
          placedSymbols: s.placedSymbols.map((sym) =>
            sym.id === id ? { ...sym, ...patch } : sym
          ),
        })),

      moveSymbol: (id, x, y) =>
        set((s) => ({
          placedSymbols: s.placedSymbols.map((sym) =>
            sym.id === id ? { ...sym, x, y } : sym
          ),
        })),

      removeSymbol: (id) =>
        set((s) => {
          // Clean up cables referencing this symbol
          const updatedKabel = s.kabel
            .map((k) => ({
              ...k,
              connectedSymbolIds: k.connectedSymbolIds.filter((sid) => sid !== id),
            }))
            .filter((k) => k.connectedSymbolIds.length >= 2);

          const isSelected = s.selectedTarget?.type === 'symbol' && s.selectedTarget.id === id;
          return {
            placedSymbols: s.placedSymbols.filter((sym) => sym.id !== id),
            kabel: updatedKabel,
            selectedTarget: isSelected ? null : s.selectedTarget,
          };
        }),

      selectSymbol: (id) => set({ selectedTarget: id ? { type: 'symbol' as const, id } : null }),
      setActiveRaum: (raumId) => set({ activeRaumId: raumId, selectedTarget: null }),
      setActiveView: (view) => set({ activeView: view }),

      setSymbolVerteiler: (symbolId, verteilerId) =>
        set((s) => ({
          placedSymbols: s.placedSymbols.map((sym) =>
            sym.id === symbolId ? { ...sym, verteilerId } : sym
          ),
        })),

      setProtectionOverride: (symbolId, overrides) =>
        set((s) => ({
          placedSymbols: s.placedSymbols.map((sym) =>
            sym.id === symbolId ? { ...sym, protectionOverrides: overrides } : sym
          ),
        })),

      setCircuitGroupOverride: (groupId, patch) =>
        set((s) => {
          const existing = s.circuitGroupOverrides.find((o) => o.groupId === groupId);
          if (existing) {
            return {
              circuitGroupOverrides: s.circuitGroupOverrides.map((o) =>
                o.groupId === groupId ? { ...o, ...patch } : o
              ),
            };
          }
          return {
            circuitGroupOverrides: [
              ...s.circuitGroupOverrides,
              { groupId, locked: false, ...patch },
            ],
          };
        }),

      removeCircuitGroupOverride: (groupId) =>
        set((s) => ({
          circuitGroupOverrides: s.circuitGroupOverrides.filter((o) => o.groupId !== groupId),
        })),

      moveSymbolToGroup: (symbolId, targetGroupId) =>
        set((s) => ({
          placedSymbols: s.placedSymbols.map((sym) =>
            sym.id === symbolId ? { ...sym, circuitGroupOverride: targetGroupId } : sym
          ),
        })),

      // --- Kabel actions ---

      addKabel: (kabeltyp, symbolIds) => {
        const kabel: Kabel = {
          id: crypto.randomUUID(),
          kabeltyp,
          connectedSymbolIds: symbolIds,
          coreAssignments: [],
        };
        set((s) => ({
          kabel: [...s.kabel, kabel],
          selectedTarget: { type: 'kabel' as const, id: kabel.id },
        }));
      },

      removeKabel: (id) =>
        set((s) => ({
          kabel: s.kabel.filter((k) => k.id !== id),
          selectedTarget:
            s.selectedTarget?.type === 'kabel' && s.selectedTarget.id === id
              ? null
              : s.selectedTarget,
        })),

      updateKabel: (id, patch) =>
        set((s) => ({
          kabel: s.kabel.map((k) => (k.id === id ? { ...k, ...patch } : k)),
        })),

      addSymbolToKabel: (kabelId, symbolId) =>
        set((s) => ({
          kabel: s.kabel.map((k) =>
            k.id === kabelId && !k.connectedSymbolIds.includes(symbolId)
              ? { ...k, connectedSymbolIds: [...k.connectedSymbolIds, symbolId] }
              : k
          ),
        })),

      removeSymbolFromKabel: (kabelId, symbolId) =>
        set((s) => {
          const updated = s.kabel
            .map((k) =>
              k.id === kabelId
                ? { ...k, connectedSymbolIds: k.connectedSymbolIds.filter((sid) => sid !== symbolId) }
                : k
            )
            .filter((k) => k.connectedSymbolIds.length >= 2);
          return { kabel: updated };
        }),

      // --- Interaction mode ---

      setSelectedTarget: (target) => set({ selectedTarget: target }),

      setInteractionMode: (mode) =>
        set({ interactionMode: mode, kabelDraft: [] }),

      addToKabelDraft: (symbolId) =>
        set((s) => {
          if (s.kabelDraft.includes(symbolId)) return {};
          return { kabelDraft: [...s.kabelDraft, symbolId] };
        }),

      finishKabelDraft: () =>
        set((s) => {
          if (s.kabelDraft.length < 2) return { kabelDraft: [] };
          const targetSym = s.placedSymbols.find((sym) => sym.id === s.kabelDraft[s.kabelDraft.length - 1]);
          const targetDef = targetSym ? symbolCatalog.find((d) => d.key === targetSym.symbolKey) : null;
          const kabel: Kabel = {
            id: crypto.randomUUID(),
            kabeltyp: targetDef?.defaultKabeltyp ?? 'NYM-J 3x1,5',
            connectedSymbolIds: [...s.kabelDraft],
            coreAssignments: [],
          };
          return {
            kabel: [...s.kabel, kabel],
            kabelDraft: [],
            selectedTarget: { type: 'kabel' as const, id: kabel.id },
            interactionMode: 'default' as const,
          };
        }),

      cancelKabelDraft: () => set({ kabelDraft: [], interactionMode: 'default' as const }),

      // --- Netzstruktur actions ---

      addNetzKonfiguration: (typ) => {
        const existing = get().netzKonfigurationen.filter((n) => n.netzwerkTyp === typ).length;
        const id = crypto.randomUUID();
        const netz: NetzKonfiguration = {
          id,
          netzwerkTyp: typ,
          bezeichnung: `${NETZWERK_TYP_LABELS[typ]} ${existing + 1}`,
          notiz: '',
          leitungstyp: 'NYY-J',
          querschnitt: 16,
          einspeisung: { netzform: 'TN-S_5pol', alsKlemmenblock: false },
          zaehlervorsicherung: { enabled: true, ampere: 63, deviceId: 'sls-63a-3p' },
          zaehler: { enabled: true, deviceId: 'meter-4p' },
          hauptschalter: { enabled: true, ampere: 63, deviceId: 'main-switch-3p-63a' },
          ueberspannungsschutz: {
            enabled: true,
            position: 'vor_zaehler',
            deviceId: 'spd-4p',
            vorsicherung: { enabled: false, ampere: 63 },
          },
          verteilerIds: [],
        };
        set((s) => ({
          netzKonfigurationen: [...s.netzKonfigurationen, netz],
          activeNetzKonfigId: id,
        }));
      },

      updateNetzKonfiguration: (id, patch) =>
        set((s) => ({
          netzKonfigurationen: s.netzKonfigurationen.map((n) =>
            n.id === id ? { ...n, ...patch } : n
          ),
        })),

      removeNetzKonfiguration: (id) =>
        set((s) => ({
          netzKonfigurationen: s.netzKonfigurationen.filter((n) => n.id !== id),
          activeNetzKonfigId: s.activeNetzKonfigId === id ? null : s.activeNetzKonfigId,
        })),

      addVerteiler: (name) => {
        const id = crypto.randomUUID();
        set((s) => ({
          verteiler: [...s.verteiler, { id, name }],
        }));
      },

      updateVerteiler: (id, patch) =>
        set((s) => ({
          verteiler: s.verteiler.map((v) => (v.id === id ? { ...v, ...patch } : v)),
        })),

      removeVerteiler: (id) =>
        set((s) => ({
          verteiler: s.verteiler.filter((v) => v.id !== id),
          netzKonfigurationen: s.netzKonfigurationen.map((n) => ({
            ...n,
            verteilerIds: n.verteilerIds.filter((vid) => vid !== id),
          })),
        })),

      setActiveNetzKonfig: (id) => set({ activeNetzKonfigId: id }),

      linkVerteilerToNetz: (netzId, verteilerId) =>
        set((s) => ({
          netzKonfigurationen: s.netzKonfigurationen.map((n) =>
            n.id === netzId && !n.verteilerIds.includes(verteilerId)
              ? { ...n, verteilerIds: [...n.verteilerIds, verteilerId] }
              : n
          ),
        })),

      unlinkVerteilerFromNetz: (netzId, verteilerId) =>
        set((s) => ({
          netzKonfigurationen: s.netzKonfigurationen.map((n) =>
            n.id === netzId
              ? { ...n, verteilerIds: n.verteilerIds.filter((vid) => vid !== verteilerId) }
              : n
          ),
        })),
    }),
    {
      name: 'symbol-attribute-store',
      version: 8,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;

        if (version === 0) {
          const symbols = (state.placedSymbols as Array<Record<string, unknown>>) ?? [];
          state.placedSymbols = symbols.map((sym) => {
            const attr = sym.attribute as Record<string, unknown> | undefined;
            if (attr) {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { verteiler: _v, ...restAttr } = attr;
              return { ...sym, attribute: restAttr, verteilerId: null };
            }
            return { ...sym, verteilerId: null };
          });
          state.circuitGroupOverrides = [];
        }

        if (version <= 1) {
          const symbols = (state.placedSymbols as Array<Record<string, unknown>>) ?? [];
          state.placedSymbols = symbols.map((sym) => ({
            ...sym,
            verteilerId: sym.verteilerId ?? null,
          }));
          state.circuitGroupOverrides = state.circuitGroupOverrides ?? [];
        }

        if (version <= 2) {
          const symbols = (state.placedSymbols as Array<Record<string, unknown>>) ?? [];
          state.placedSymbols = symbols.map((sym) => {
            delete sym.stromkreisId;
            return sym;
          });
          delete state.stromkreise;
        }

        // v4: migrate kabeltyp from symbol.attribute to Kabel entity
        if (version <= 3) {
          const kabel: unknown[] = [];
          const symbols = (state.placedSymbols as Array<Record<string, unknown>>) ?? [];
          state.placedSymbols = symbols.map((sym) => {
            const attr = sym.attribute as Record<string, unknown> | undefined;
            if (attr && typeof attr.kabeltyp === 'string' && attr.kabeltyp) {
              kabel.push({
                id: crypto.randomUUID(),
                kabeltyp: attr.kabeltyp,
                connectedSymbolIds: [sym.id],
                coreAssignments: [],
              });
              delete attr.kabeltyp;
            } else if (attr) {
              delete attr.kabeltyp;
            }
            return sym;
          });
          state.kabel = kabel;

          // Migrate selectedSymbolId -> selectedTarget
          const oldId = state.selectedSymbolId as string | null | undefined;
          state.selectedTarget = oldId ? { type: 'symbol', id: oldId } : null;
          delete state.selectedSymbolId;

          state.interactionMode = 'default';
          state.kabelDraft = [];
        }

        // v5: initialize netzKonfigurationen + verteiler
        if (version <= 4) {
          state.netzKonfigurationen = [{
            id: 'default-netz',
            netzwerkTyp: '230_400v',
            bezeichnung: '230/400V Versorgung 1',
            notiz: '',
            leitungstyp: 'NYY-J',
            querschnitt: 16,
            einspeisung: { netzform: 'TN-S_5pol', alsKlemmenblock: false },
            zaehlervorsicherung: { enabled: true, ampere: 63, deviceId: 'sls-63a-3p' },
            zaehler: { enabled: true, deviceId: 'meter-4p' },
            hauptschalter: { enabled: true, ampere: 63, deviceId: 'main-switch-3p-63a' },
            ueberspannungsschutz: {
              enabled: true,
              position: 'vor_zaehler',
              deviceId: 'spd-4p',
              vorsicherung: { enabled: true, ampere: 63 },
            },
            verteilerIds: ['HV-EG'],
          }];
          state.verteiler = [{ id: 'HV-EG', name: 'Hauptverteiler EG' }];
          state.activeNetzKonfigId = null;
        }

        // v6: rename "230/400V Netz/Hauptnetz" → "230/400V Versorgung", remove non-230_400v types
        if (version <= 5) {
          const configs = state.netzKonfigurationen as Array<Record<string, unknown>> ?? [];
          const kept = configs.filter((n) => n.netzwerkTyp === '230_400v');
          let idx = 1;
          state.netzKonfigurationen = kept.map((n) => {
            if (n.bezeichnung === '230/400V Hauptnetz' || n.bezeichnung === '230/400V Netz') {
              return { ...n, bezeichnung: `230/400V Versorgung ${idx++}` };
            }
            idx++;
            return n;
          });
        }

        // v7: RCD grouping state
        if (version <= 6) {
          state.maxLssPerRcd = 6;
          state.rcdGroupOverrides = [];
        }

        // v8: RCD grouping strategy toggles
        if (version <= 7) {
          state.rcdGroupingStrategy = { separateByRoom: false, separateByRatedCurrent: false, separateByType: false };
        }

        return state;
      },
    }
  )
);

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const useSymbolsForActiveRaum = () =>
  useAppStore(
    useShallow((s) => s.placedSymbols.filter((sym) => sym.raumId === s.activeRaumId))
  );

/** Compat: derives symbol ID from selectedTarget */
export const useSelectedSymbolId = () =>
  useAppStore((s) =>
    s.selectedTarget?.type === 'symbol' ? s.selectedTarget.id : null
  );

export const useSelectedSymbol = () =>
  useAppStore(
    useShallow((s) => {
      const id = s.selectedTarget?.type === 'symbol' ? s.selectedTarget.id : null;
      return s.placedSymbols.find((sym) => sym.id === id) ?? null;
    })
  );

export const useSelectedKabel = () =>
  useAppStore(
    useShallow((s) => {
      if (s.selectedTarget?.type !== 'kabel') return null;
      return s.kabel.find((k) => k.id === s.selectedTarget!.id) ?? null;
    })
  );

export const useAllSymbols = () => useAppStore((s) => s.placedSymbols);

export const useNetzKonfigurationen = () => useAppStore((s) => s.netzKonfigurationen);

export const useKabelForActiveRaum = () =>
  useAppStore(
    useShallow((s) => {
      const raumSymbolIds = new Set(
        s.placedSymbols.filter((sym) => sym.raumId === s.activeRaumId).map((sym) => sym.id)
      );
      return s.kabel.filter((k) =>
        k.connectedSymbolIds.some((sid) => raumSymbolIds.has(sid))
      );
    })
  );

export const useKabelForSymbol = (symbolId: string) =>
  useAppStore(
    useShallow((s) => s.kabel.filter((k) => k.connectedSymbolIds.includes(symbolId)))
  );

/**
 * Derive circuits from placed symbols (bottom-up).
 * Uses useMemo to avoid infinite re-render (deriveCircuits returns new refs).
 */
export const useDerivedCircuits = (): DerivedCircuit[] => {
  const placedSymbols = useAppStore((s) => s.placedSymbols);
  const gebaeude = useAppStore((s) => s.gebaeude);
  const circuitGroupOverrides = useAppStore((s) => s.circuitGroupOverrides);
  const kabel = useAppStore((s) => s.kabel);

  return useMemo(
    () => deriveCircuits({ placedSymbols, symbolCatalog, gebaeude, circuitGroupOverrides, kabel }),
    [placedSymbols, gebaeude, circuitGroupOverrides, kabel],
  );
};

export const useRcdGroups = (): RcdGroup[] => {
  const derivedCircuits = useDerivedCircuits();
  const maxLssPerRcd = useAppStore((s) => s.maxLssPerRcd);
  const rcdGroupOverrides = useAppStore((s) => s.rcdGroupOverrides);
  const rcdGroupingStrategy = useAppStore((s) => s.rcdGroupingStrategy);

  return useMemo(
    () => groupBySharedRcd(derivedCircuits, { maxLssPerRcd, manualOverrides: rcdGroupOverrides, strategy: rcdGroupingStrategy }),
    [derivedCircuits, maxLssPerRcd, rcdGroupOverrides, rcdGroupingStrategy],
  );
};

export const useActiveRaumName = () =>
  useAppStore((s) => {
    for (const sw of s.gebaeude.stockwerke) {
      const raum = sw.raeume.find((r) => r.id === s.activeRaumId);
      if (raum) return `${sw.name} / ${raum.name}`;
    }
    return '';
  });
