import { useState, useMemo } from 'react';
import { symbolCatalog } from '../../data/mockSymbols';
import { propertyRegistry, PROPERTY_GROUP_LABELS } from '../../data/propertyRegistry';
import {
  CATEGORY_LABELS,
  ELECTRICAL_PROPERTY_LABELS,
  CABINET_FIELD_LABELS,
  FEATURE_AREA_LABELS,
  type SymbolCategory,
  type SymbolDefinition,
  type ElectricalPropertyType,
  type FieldRelevance,
  type FeatureArea,
} from '../../types';

type SubTab = 'register' | 'eigenschaften' | 'elektrisch' | 'schaltschrank' | 'planverwendung';

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'register', label: 'Eigenschafts-Register' },
  { key: 'eigenschaften', label: 'Eigenschaften' },
  { key: 'elektrisch', label: 'Elektrisch' },
  { key: 'schaltschrank', label: 'Schaltschrank' },
  { key: 'planverwendung', label: 'Planverwendung' },
];

const ALL_ELECTRICAL: ElectricalPropertyType[] = ['mcb', 'rcd', 'rcbo', 'afdd', 'rcd_type_b'];

function RelevanceBadge({ value }: { value: FieldRelevance }) {
  const styles: Record<FieldRelevance, string> = {
    required: 'bg-green-100 text-green-700',
    optional: 'bg-yellow-100 text-yellow-700',
    hidden: 'bg-gray-100 text-gray-400',
  };
  const labels: Record<FieldRelevance, string> = {
    required: 'Pflicht',
    optional: 'Optional',
    hidden: 'Versteckt',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${styles[value]}`}>
      {labels[value]}
    </span>
  );
}

function Check({ active }: { active: boolean }) {
  return active ? (
    <span className="text-green-600 font-bold">&#10003;</span>
  ) : (
    <span className="text-gray-300">&mdash;</span>
  );
}

function SymbolIcon({ sym }: { sym: SymbolDefinition }) {
  return (
    <img
      src={sym.svgPath}
      alt={sym.label}
      className="w-6 h-6 inline-block"
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
    />
  );
}

const ALL_FEATURES: FeatureArea[] = ['stromlaufplan', 'aufbauplan', 'knx', 'pruefprotokoll', 'stueckliste'];

function PropertyRegisterTable() {
  const grouped = useMemo(() => {
    const groups = new Map<string, typeof propertyRegistry>();
    for (const prop of propertyRegistry) {
      const list = groups.get(prop.group) ?? [];
      list.push(prop);
      groups.set(prop.group, list);
    }
    return groups;
  }, []);

  return (
    <div>
      <p className="text-xs text-gray-500 mb-4">
        Alle verfuegbaren Eigenschaften -- unabhaengig von Symbolen.
        Die Feature-Logik (Stromlaufplan, Aufbauplan, KNX, etc.) haengt an diesen Eigenschaften, nicht am Symbol.
        Das Symbol ist nur ein &quot;Verbraucher&quot;-Label.
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500 sticky top-0 bg-white z-10">
            <th className="text-left py-2 font-medium w-44">Eigenschaft</th>
            <th className="text-left py-2 font-medium w-24">Gruppe</th>
            <th className="text-left py-2 font-medium">Beschreibung</th>
            {ALL_FEATURES.map((f) => (
              <th key={f} className="text-center py-2 font-medium w-28">{FEATURE_AREA_LABELS[f]}</th>
            ))}
            <th className="text-left py-2 font-medium w-16">Typ</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(grouped.entries()).map(([group, props]) => (
            <>
              <tr key={`group-${group}`} className="bg-gray-50">
                <td colSpan={3 + ALL_FEATURES.length + 1} className="py-1.5 px-2 font-semibold text-xs text-gray-600">
                  {PROPERTY_GROUP_LABELS[group as keyof typeof PROPERTY_GROUP_LABELS]}
                </td>
              </tr>
              {props.map((prop) => (
                <tr key={prop.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-1.5 font-medium text-gray-800">{prop.name}</td>
                  <td className="py-1.5 text-xs text-gray-500">{PROPERTY_GROUP_LABELS[prop.group]}</td>
                  <td className="py-1.5 text-xs text-gray-500">{prop.description}</td>
                  {ALL_FEATURES.map((f) => (
                    <td key={f} className="py-1.5 text-center">
                      <Check active={prop.usedBy.includes(f)} />
                    </td>
                  ))}
                  <td className="py-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                      {prop.valueType}
                    </span>
                  </td>
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EigenschaftenTable({ symbols }: { symbols: SymbolDefinition[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-gray-500 sticky top-0 bg-white z-10">
          <th className="text-left py-2 font-medium w-8"></th>
          <th className="text-left py-2 font-medium">Symbol</th>
          <th className="text-left py-2 font-medium w-24">Kategorie</th>
          <th className="text-center py-2 font-medium w-20">Farbe</th>
          <th className="text-center py-2 font-medium w-20">Hoehe</th>
          <th className="text-center py-2 font-medium w-20">Kabeltyp</th>
          <th className="text-center py-2 font-medium w-20">Verteiler</th>
          <th className="text-center py-2 font-medium w-20">Elektrisch</th>
          <th className="text-center py-2 font-medium w-20">KNX</th>
        </tr>
      </thead>
      <tbody>
        {symbols.map((sym) => (
          <tr key={sym.key} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="py-1.5"><SymbolIcon sym={sym} /></td>
            <td className="py-1.5 font-medium text-gray-800">{sym.label}</td>
            <td className="py-1.5 text-gray-500 text-xs">{CATEGORY_LABELS[sym.category]}</td>
            <td className="py-1.5 text-center"><RelevanceBadge value={sym.fieldConfig.attribute.farbe} /></td>
            <td className="py-1.5 text-center"><RelevanceBadge value={sym.fieldConfig.attribute.hoehe} /></td>
            <td className="py-1.5 text-center"><RelevanceBadge value={sym.fieldConfig.attribute.kabeltyp} /></td>
            <td className="py-1.5 text-center"><RelevanceBadge value={sym.fieldConfig.attribute.verteiler} /></td>
            <td className="py-1.5 text-center"><RelevanceBadge value={sym.fieldConfig.elektrisch} /></td>
            <td className="py-1.5 text-center"><RelevanceBadge value={sym.fieldConfig.knx} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ElektrischTable({ symbols }: { symbols: SymbolDefinition[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-gray-500 sticky top-0 bg-white z-10">
          <th className="text-left py-2 font-medium w-8"></th>
          <th className="text-left py-2 font-medium">Symbol</th>
          <th className="text-left py-2 font-medium w-24">Kategorie</th>
          {ALL_ELECTRICAL.map((ep) => (
            <th key={ep} className="text-center py-2 font-medium w-20">{ELECTRICAL_PROPERTY_LABELS[ep]}</th>
          ))}
          <th className="text-left py-2 font-medium w-24">Default LSS</th>
          <th className="text-left py-2 font-medium w-24">Default RCD</th>
        </tr>
      </thead>
      <tbody>
        {symbols.map((sym) => (
          <tr key={sym.key} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="py-1.5"><SymbolIcon sym={sym} /></td>
            <td className="py-1.5 font-medium text-gray-800">{sym.label}</td>
            <td className="py-1.5 text-gray-500 text-xs">{CATEGORY_LABELS[sym.category]}</td>
            {ALL_ELECTRICAL.map((ep) => (
              <td key={ep} className="py-1.5 text-center">
                <Check active={sym.requiredElectricalProperties.includes(ep)} />
              </td>
            ))}
            <td className="py-1.5 text-gray-600">{sym.defaultElektrisch.leitungsschutzschalter || '—'}</td>
            <td className="py-1.5 text-gray-600">{sym.defaultElektrisch.rcd || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SchaltschrankTable({ symbols }: { symbols: SymbolDefinition[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-gray-500 sticky top-0 bg-white z-10">
          <th className="text-left py-2 font-medium w-8"></th>
          <th className="text-left py-2 font-medium">Symbol</th>
          <th className="text-left py-2 font-medium w-24">Kategorie</th>
          <th className="text-center py-2 font-medium w-20">Verteiler</th>
          <th className="text-left py-2 font-medium w-28">Zielfeld</th>
          <th className="text-left py-2 font-medium w-40">Elemente</th>
          <th className="text-left py-2 font-medium">Beschreibung</th>
        </tr>
      </thead>
      <tbody>
        {symbols.map((sym) => (
          <tr key={sym.key} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="py-1.5"><SymbolIcon sym={sym} /></td>
            <td className="py-1.5 font-medium text-gray-800">{sym.label}</td>
            <td className="py-1.5 text-gray-500 text-xs">{CATEGORY_LABELS[sym.category]}</td>
            <td className="py-1.5 text-center">
              {sym.isDistributor ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">Ja</span>
              ) : (
                <span className="text-gray-300">&mdash;</span>
              )}
            </td>
            <td className="py-1.5">
              {sym.cabinetMapping.targetField ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">
                  {sym.cabinetMapping.targetField} — {CABINET_FIELD_LABELS[sym.cabinetMapping.targetField]}
                </span>
              ) : (
                <span className="text-gray-300">&mdash;</span>
              )}
            </td>
            <td className="py-1.5 text-xs text-gray-600">
              {sym.cabinetMapping.elementTypes.length > 0
                ? sym.cabinetMapping.elementTypes.map((et) => ELECTRICAL_PROPERTY_LABELS[et]).join(', ')
                : '—'}
            </td>
            <td className="py-1.5 text-xs text-gray-500">{sym.cabinetMapping.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PlanverwendungTable({ symbols }: { symbols: SymbolDefinition[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-gray-500 sticky top-0 bg-white z-10">
          <th className="text-left py-2 font-medium w-8"></th>
          <th className="text-left py-2 font-medium">Symbol</th>
          <th className="text-left py-2 font-medium w-24">Kategorie</th>
          <th className="text-center py-2 font-medium w-32">Installationsplan</th>
          <th className="text-center py-2 font-medium w-32">Stromlaufplan</th>
          <th className="text-center py-2 font-medium w-32">Aufbauplan</th>
        </tr>
      </thead>
      <tbody>
        {symbols.map((sym) => {
          const inStromlaufplan = sym.fieldConfig.elektrisch !== 'hidden';
          const inAufbauplan = sym.fieldConfig.elektrisch !== 'hidden' && sym.fieldConfig.attribute.verteiler !== 'hidden';
          return (
            <tr key={sym.key} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-1.5"><SymbolIcon sym={sym} /></td>
              <td className="py-1.5 font-medium text-gray-800">{sym.label}</td>
              <td className="py-1.5 text-gray-500 text-xs">{CATEGORY_LABELS[sym.category]}</td>
              <td className="py-1.5 text-center"><Check active /></td>
              <td className="py-1.5 text-center"><Check active={inStromlaufplan} /></td>
              <td className="py-1.5 text-center"><Check active={inAufbauplan} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function Symboluebersicht() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<SymbolCategory | 'all'>('all');
  const [activeTab, setActiveTab] = useState<SubTab>('register');

  const filtered = useMemo(() => {
    return symbolCatalog.filter((sym) => {
      if (categoryFilter !== 'all' && sym.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return sym.label.toLowerCase().includes(q) || sym.key.toLowerCase().includes(q);
      }
      return true;
    });
  }, [search, categoryFilter]);

  const categories = Object.entries(CATEGORY_LABELS) as [SymbolCategory, string][];

  return (
    <div className="p-6 overflow-auto h-full">
      <h2 className="text-lg font-semibold mb-4">
        Symboluebersicht
        <span className="text-sm font-normal text-gray-400 ml-2">
          {filtered.length} von {symbolCatalog.length} Symbolen
        </span>
      </h2>

      {/* Filter Bar */}
      <div className="flex gap-3 mb-4 items-center">
        <input
          type="text"
          placeholder="Suche nach Symbol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm border border-gray-300 rounded px-3 py-1.5 w-64 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as SymbolCategory | 'all')}
          className="text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="all">Alle Kategorien</option>
          {categories.map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active Table */}
      <div className="overflow-x-auto">
        {activeTab === 'register' && <PropertyRegisterTable />}
        {activeTab === 'eigenschaften' && <EigenschaftenTable symbols={filtered} />}
        {activeTab === 'elektrisch' && <ElektrischTable symbols={filtered} />}
        {activeTab === 'schaltschrank' && <SchaltschrankTable symbols={filtered} />}
        {activeTab === 'planverwendung' && <PlanverwendungTable symbols={filtered} />}
      </div>

      {/* Legend */}
      <div className="mt-6 p-3 bg-gray-50 rounded text-xs text-gray-500">
        <span className="font-medium">Legende:</span>
        {' '}
        <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">Pflicht</span>
        {' '}
        <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 font-medium">Optional</span>
        {' '}
        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 font-medium">Versteckt</span>
        {' | '}
        <span className="text-green-600 font-bold">&#10003;</span> = Relevant
        {' '}
        <span className="text-gray-300">&mdash;</span> = Nicht relevant
      </div>
    </div>
  );
}
