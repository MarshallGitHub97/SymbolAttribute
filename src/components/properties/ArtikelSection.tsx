import type { PlacedSymbol } from '../../types';

export function ArtikelSection({ symbol }: { symbol: PlacedSymbol }) {
  return (
    <fieldset className="mb-3">
      <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        Artikel / Services
      </legend>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400">
            <th className="text-left font-normal pb-1">Bezeichnung</th>
            <th className="text-right font-normal pb-1 w-12">Menge</th>
            <th className="text-right font-normal pb-1 w-16">Preis</th>
          </tr>
        </thead>
        <tbody>
          {symbol.artikel.map((a) => (
            <tr key={a.id} className="border-t border-gray-100">
              <td className="py-0.5">
                <span className={a.typ === 'service' ? 'text-blue-600' : ''}>
                  {a.bezeichnung}
                </span>
              </td>
              <td className="text-right">
                {a.menge} {a.einheit}
              </td>
              <td className="text-right">{a.einzelpreis.toFixed(2)} €</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-300 font-medium">
            <td className="pt-1">Gesamt</td>
            <td />
            <td className="text-right pt-1">
              {symbol.artikel
                .reduce((sum, a) => sum + a.menge * a.einzelpreis, 0)
                .toFixed(2)}{' '}
              €
            </td>
          </tr>
        </tfoot>
      </table>
    </fieldset>
  );
}
