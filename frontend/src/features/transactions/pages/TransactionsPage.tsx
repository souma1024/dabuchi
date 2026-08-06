import { TransactionListItem } from '../components/TransactionListItem';
import { useTransactions } from '../hooks/useTransactions';
import { useInfiniteScrollSentinel } from '../../../hooks/useInfiniteScrollSentinel';

interface TransactionsPageProps {
  /** 戻る操作。未指定なら戻るボタンは表示しない。 */
  onBack?: () => void;
}

/**
 * 取引履歴の一覧画面。スクロール末尾で次ページを追加取得する。
 * 対象ユーザーはserver側のログイン中ユーザーから決まるため、画面からは指定しない。
 */
export function TransactionsPage({ onBack }: TransactionsPageProps) {
  const {
    transactions,
    isLoadingInitial,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
  } = useTransactions();
  const sentinelRef = useInfiniteScrollSentinel<HTMLLIElement>(loadMore, [
    transactions.length,
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white">
      <header className="grid grid-cols-[40px_1fr_40px] items-center border-b border-slate-200 px-3 py-3.5">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="戻る"
            className="h-10 w-10 border-none bg-transparent text-xl text-slate-500"
          >
            ←
          </button>
        ) : (
          <span />
        )}
        <h1 className="m-0 text-center text-base font-semibold text-slate-900">
          取引履歴
        </h1>
        <span />
      </header>

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
