export interface SortOption {
  value: string;
  label: string;
}

interface SortSelectProps {
  value: string;
  options: readonly SortOption[];
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}

/**
 * 一覧の並び替え条件を切り替える共通セレクト。
 * 画面側は value と options だけを渡せば、作成日順や名前順を再利用できる。
 */
export function SortSelect({
  value,
  options,
  onChange,
  label = '並び替え',
  disabled = false,
  id,
}: SortSelectProps) {
  const selectId = id ?? 'sort-select';

  return (
    <div className="flex items-center justify-end gap-2 px-4 py-3">
      <label
        htmlFor={selectId}
        className="text-sm font-medium text-slate-600"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="min-w-32 appearance-none rounded-xl border border-slate-300 bg-white px-3 py-2 pr-9 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400"
        >
          ▾
        </span>
      </div>
    </div>
  );
}
