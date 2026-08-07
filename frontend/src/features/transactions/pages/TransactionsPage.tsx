import { useSearchParams } from 'react-router-dom';

import { ScreenHeader } from '../../../components/ScreenHeader';
import { TransactionListItem } from '../components/TransactionListItem';
import { useTransactions } from '../hooks/useTransactions';
import { useInfiniteScrollSentinel } from '../../../hooks/useInfiniteScrollSentinel';
import { useScrollToTop } from '../../../hooks/useScrollToTop';
import type { TransactionSort } from '../types';

const SORT_OPTIONS: readonly { value: TransactionSort; label: string }[] = [
  { value: 'created-desc', label: '新しい順' },
  { value: 'created-asc', label: '古い順' },
];

interface TransactionsPageProps {
  /** 戻る操作。未指定なら戻るボタンは表示しない。 */
  onBack?: () => void;
}

/**
 * 取引履歴の一覧画面。スクロール末尾で次ページを追加取得する。
 * 対象ユーザーはserver側のログイン中ユーザーから決まるため、画面からは指定しない。
 */
export function TransactionsPage({ onBack }: TransactionsPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const sort: TransactionSort =
    searchParams.get('sort') === 'created-asc' ? 'created-asc' : 'created-desc';
  const {
    transactions,
    isLoadingInitial,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
  } = useTransactions(sort);
  const sentinelRef = useInfiniteScrollSentinel<HTMLLIElement>(loadMore);

  useScrollToTop([sort]);

  const selectSort = (nextSort: TransactionSort) => {
    setSearchParams(nextSort === 'created-asc' ? { sort: nextSort } : {}, {
      replace: true,
    });
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white">
      <div className="sticky top-0 z-10 bg-white">
        <ScreenHeader title="取引履歴" onBack={onBack} />

        <div
          aria-label="取引履歴の並び順"
          role="group"
          className="flex gap-2 border-b border-slate-200 px-4 py-3"
        >
          {SORT_OPTIONS.map((option) => {
            const isSelected = option.value === sort;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isSelected}
                onClick={() => selectSort(option.value)}
                className={`min-h-[40px] rounded-full px-4 text-sm font-semibold transition ${
                  isSelected
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoadingInitial && (
        <p className="px-4 py-8 text-center text-slate-500">読み込み中…</p>
      )}

      {!isLoadingInitial && transactions.length === 0 && error && (
        <p role="alert" className="px-4 py-8 text-center text-slate-500">
          {error}
        </p>
      )}

      {/* 取引が1件も無い状態はデモの初期状態で必ず通るため、次に何をすればよいかまで示す。 */}
      {!isLoadingInitial && transactions.length === 0 && !error && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <div
            aria-hidden="true"
            className="h-14 w-14 rounded-full border border-dashed border-slate-300"
          />
          <p className="m-0 text-sm text-slate-600">まだ取引がありません</p>
          <p className="m-0 text-xs text-slate-400">
            送金すると、ここに履歴が残ります
          </p>
        </div>
      )}

      {transactions.length > 0 && (
        <ul className="m-0 flex-1 list-none p-0">
          {transactions.map((transaction) => (
            <TransactionListItem
              key={transaction.id}
              transaction={transaction}
            />
          ))}
          {hasMore && (
            <li ref={sentinelRef} aria-hidden="true" className="h-px" />
          )}
          {isLoadingMore && (
            <li className="px-4 py-4 text-center text-slate-500">
              読み込み中…
            </li>
          )}
          {error && (
            <li role="alert" className="px-4 py-4 text-center text-slate-500">
              {error}
            </li>
          )}
        </ul>
      )}
    </main>
  );
}
