import { useMemo } from 'react';
import { useAllSymbols } from '../../store/useAppStore';
import type { BestelllisteRow } from '../../types';

export function Bestellliste() {
  const allSymbols = useAllSymbols();

  const rows = useMemo<BestelllisteRow[]>(() => {
    const map = new Map<string, BestelllisteRow>();
    for (const sym of allSymbols) {
      for (const art of sym.artikel) {
        if (art.typ !== 'material') continue;
        const key = `${art.bezeichnung}|${art.einheit}`;
        const existing = map.get(key);
        if (existing) {
          existing.menge += art.menge;
        } else {
          map.set(key, {
            bezeichnung: art.bezeichnung,
            menge: art.menge,
            einheit: art.einheit,
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.bezeichnung.localeCompare(b.bezeichnung));
  }, [allSymbols]);

  return (
    <div className="p-6 overflow-auto h-full">
      <h2 className="text-lg font-semibold mb-4">Bestellliste</h2>
      {rows.length === 0 ? (
        <p className="text-gray-400">Keine Materialien. Platzieren Sie Symbole im Installationsplan.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="text-left py-1 font-medium">#</th>
              <th className="text-left py-1 font-medium">Bezeichnung</th>
              <th className="text-right py-1 font-medium w-24">Menge</th>
              <th className="text-left py-1 font-medium w-16">Einheit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-1 text-gray-400">{i + 1}</td>
                <td className="py-1">{r.bezeichnung}</td>
                <td className="text-right py-1">{r.menge}</td>
                <td className="py-1">{r.einheit}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 font-semibold">
              <td colSpan={2} className="py-2">Positionen gesamt</td>
              <td className="text-right py-2">{rows.length}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}
