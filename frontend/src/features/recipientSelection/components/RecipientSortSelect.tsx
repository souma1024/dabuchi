import type { RecipientSort } from '../types';

interface RecipientSortSelectProps {
  value: RecipientSort;
  onChange: (sort: RecipientSort) => void;
}

const SORT_OPTIONS: ReadonlyArray<{ value: RecipientSort; label: string }> = [
  { value: 'created-asc', label: '登録が古い順' },
  { value: 'created-desc', label: '登録が新しい順' },
];

export function RecipientSortSelect({
  value,
  onChange,
}: RecipientSortSelectProps) {
  return (
    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
      <label className="flex items-center justify-between gap-3 text-sm font-medium text-slate-700">
        <span>並び替え</span>
        <select
          aria-label="並び替え"
          value={value}
          onChange={(event) => onChange(event.target.value as RecipientSort)}
          className="min-w-44 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
