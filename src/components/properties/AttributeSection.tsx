import type { PlacedSymbol, FieldRelevance, SymbolFieldConfig } from '../../types';
import { useAppStore } from '../../store/useAppStore';

interface Props {
  symbol: PlacedSymbol;
  fieldConfig: SymbolFieldConfig['attribute'];
}

const FIELDS: { key: keyof PlacedSymbol['attribute']; label: string; type?: string }[] = [
  { key: 'farbe', label: 'Farbe' },
  { key: 'hoehe', label: 'Höhe (cm)', type: 'number' },
  { key: 'kabeltyp', label: 'Kabeltyp' },
  { key: 'verteiler', label: 'Verteiler' },
];

export function AttributeSection({ symbol, fieldConfig }: Props) {
  const updateSymbol = useAppStore((s) => s.updateSymbol);

  const update = (field: keyof PlacedSymbol['attribute'], value: string | number) => {
    updateSymbol(symbol.id, {
      attribute: { ...symbol.attribute, [field]: value },
    });
  };

  const visible = FIELDS.filter((f) => fieldConfig[f.key] !== 'hidden');
  if (visible.length === 0) return null;

  return (
    <fieldset className="mb-3">
      <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        Attribute
      </legend>
      <div className="space-y-1.5">
        {visible.map((f) => (
          <Field
            key={f.key}
            label={f.label}
            value={f.key === 'hoehe' ? String(symbol.attribute.hoehe) : (symbol.attribute[f.key] as string)}
            onChange={(v) => update(f.key, f.type === 'number' ? Number(v) || 0 : v)}
            type={f.type}
            relevance={fieldConfig[f.key]}
          />
        ))}
      </div>
    </fieldset>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  relevance,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  relevance: FieldRelevance;
}) {
  return (
    <div className={`flex items-center gap-2 ${relevance === 'required' ? 'pl-1 border-l-2 border-l-blue-500' : ''}`}>
      <label className="w-24 text-xs text-gray-500 shrink-0">
        {label}{relevance === 'required' && <span className="text-blue-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-2 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}
