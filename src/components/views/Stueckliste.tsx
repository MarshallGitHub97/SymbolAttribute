import { useMemo } from 'react';
import { useAllSymbols } from '../../store/useAppStore';
import { symbolCatalog } from '../../data/mockSymbols';
import type { StuecklisteRow } from '../../types';

export function Stueckliste() {
  const allSymbols = useAllSymbols();

  const rows = useMemo<StuecklisteRow[]>(() => {
    const map = new Map<string, StuecklisteRow>();
    for (const sym of allSymbols) {
      for (const art of sym.artikel) {
        const key = `${art.bezeichnung}|${art.typ}|${art.einheit}|${art.einzelpreis}`;
        const existing = map.get(key);
        if (existing) {
          existing.menge += art.menge;
          existing.gesamtpreis = existing.menge * existing.einzelpreis;
        } else {
          map.set(key, {
            bezeichnung: art.bezeichnung,
            typ: art.typ,
            menge: art.menge,
            einheit: art.einheit,
            einzelpreis: art.einzelpreis,
            gesamtpreis: art.menge * art.einzelpreis,
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.bezeichnung.localeCompare(b.bezeichnung));
  }, [allSymbols]);

  const total = rows.reduce((s, r) => s + r.gesamtpreis, 0);

  const symbolSummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const sym of allSymbols) {
      const def = symbolCatalog.find((d) => d.key === sym.symbolKey);
      const label = def?.label ?? sym.symbolKey;
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [allSymbols]);

  return (
    <div className="p-6 overflow-auto h-full">
      <h2 className="text-lg font-semibold mb-4">Stückliste</h2>

      {allSymbols.length === 0 ? (
        <p className="text-gray-400">Keine Symbole platziert. Ziehen Sie Symbole auf den Installationsplan.</p>
      ) : (
        <>
          <h3 className="text-sm font-medium text-gray-600 mb-2">Symbole</h3>
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="text-left py-1 font-medium">Symbol</th>
                <th className="text-right py-1 font-medium w-20">Anzahl</th>
              </tr>
            </thead>
            <tbody>
              {symbolSummary.map(([label, count]) => (
                <tr key={label} className="border-b border-gray-100">
                  <td className="py-1">{label}</td>
                  <td className="text-right">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="text-sm font-medium text-gray-600 mb-2">Material & Services</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="text-left py-1 font-medium">Bezeichnung</th>
                <th className="text-left py-1 font-medium w-16">Typ</th>
                <th className="text-right py-1 font-medium w-20">Menge</th>
                <th className="text-right py-1 font-medium w-24">Einzelpreis</th>
                <th className="text-right py-1 font-medium w-24">Gesamt</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1">{r.bezeichnung}</td>
                  <td className={`py-1 ${r.typ === 'service' ? 'text-blue-600' : 'text-gray-600'}`}>
                    {r.typ === 'material' ? 'Material' : 'Service'}
                  </td>
                  <td className="text-right">
                    {r.menge} {r.einheit}
                  </td>
                  <td className="text-right">{r.einzelpreis.toFixed(2)} €</td>
                  <td className="text-right font-medium">{r.gesamtpreis.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 font-semibold">
                <td colSpan={4} className="py-2">Gesamtsumme</td>
                <td className="text-right py-2">{total.toFixed(2)} €</td>
              </tr>
            </tfoot>
          </table>
        </>
      )}
    </div>
  );
}
