import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type { PlacedSymbol, ViewType, Gebaeude } from '../types';
import { symbolCatalog } from '../data/mockSymbols';
import { mockGebaeude } from '../data/mockProject';

interface AppState {
  gebaeude: Gebaeude;
  activeRaumId: string;
  placedSymbols: PlacedSymbol[];
  selectedSymbolId: string | null;
  activeView: ViewType;

  addSymbol: (symbolKey: string, raumId: string, x: number, y: number) => void;
  updateSymbol: (id: string, patch: Partial<PlacedSymbol>) => void;
  moveSymbol: (id: string, x: number, y: number) => void;
  removeSymbol: (id: string) => void;
  selectSymbol: (id: string | null) => void;
  setActiveRaum: (raumId: string) => void;
  setActiveView: (view: ViewType) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      gebaeude: mockGebaeude,
      activeRaumId: 'r-wohn',
      placedSymbols: [],
      selectedSymbolId: null,
      activeView: 'installationsplan',

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
          elektrisch: { ...def.defaultElektrisch },
          knx: { ...def.defaultKnx },
          artikel: def.defaultArtikel.map((a) => ({ ...a, id: crypto.randomUUID() })),
        };
        set((s) => ({ placedSymbols: [...s.placedSymbols, symbol], selectedSymbolId: symbol.id }));
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
        set((s) => ({
          placedSymbols: s.placedSymbols.filter((sym) => sym.id !== id),
          selectedSymbolId: s.selectedSymbolId === id ? null : s.selectedSymbolId,
        })),

      selectSymbol: (id) => set({ selectedSymbolId: id }),
      setActiveRaum: (raumId) => set({ activeRaumId: raumId, selectedSymbolId: null }),
      setActiveView: (view) => set({ activeView: view }),
    }),
    { name: 'symbol-attribute-store' }
  )
);

export const useSymbolsForActiveRaum = () =>
  useAppStore(
    useShallow((s) => s.placedSymbols.filter((sym) => sym.raumId === s.activeRaumId))
  );

export const useSelectedSymbol = () =>
  useAppStore(
    useShallow((s) => s.placedSymbols.find((sym) => sym.id === s.selectedSymbolId) ?? null)
  );

export const useAllSymbols = () => useAppStore((s) => s.placedSymbols);

export const useActiveRaumName = () =>
  useAppStore((s) => {
    for (const sw of s.gebaeude.stockwerke) {
      const raum = sw.raeume.find((r) => r.id === s.activeRaumId);
      if (raum) return `${sw.name} / ${raum.name}`;
    }
    return '';
  });
