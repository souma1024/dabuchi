import { useSearchParams } from 'react-router-dom';

import { ScreenHeader } from '../../../components/ScreenHeader';
import { PaymentRequestListItem } from '../components/PaymentRequestListItem';
import { usePaymentRequestHistory } from '../hooks/usePaymentRequestHistory';
import type { PaymentRequestDirection } from '../types';
import { useInfiniteScrollSentinel } from '../../../hooks/useInfiniteScrollSentinel';
import { useScrollToTop } from '../../../hooks/useScrollToTop';

const TABS: readonly { direction: PaymentRequestDirection; label: string }[] = [
  { direction: 'received', label: '受けた請求' },
  { direction: 'sent', label: '出した請求' },
];

const emptyMessages: Record<PaymentRequestDirection, string> = {
  received: '受け取った請求はここに表示されます',
  sent: '出した請求はここに表示されます',
};

interface PaymentRequestHistoryPageProps {
  onBack?: () => void;
}

/**
 * 請求履歴一覧（Issue #61）。未払いも決着済みも含めた全記録を表示する。
 *
 * 請求は「方向（受けた／出した）」と「状態」の2軸を持つ。両方をバッジにすると
 * 1行に2つ必要で読みにくいため、方向はタブで固定し、行のバッジは状態だけにする。
 * 取引履歴にタブが無いのは軸が1つだからで、ここで増やすのは理由のある差。
 *
 * 決着していない請求の行は、確認画面へのリンクになる（Issue #61）。
 */
export function PaymentRequestHistoryPage({
  onBack,
}: PaymentRequestHistoryPageProps) {
  // タブをURLに持たせる。stateだと確認画面から戻ったとき再マウントで初期値へ
  // 戻ってしまい、出した請求を見ていたのに受けた請求へ切り替わる。
  const [searchParams, setSearchParams] = useSearchParams();
  const direction: PaymentRequestDirection =
    searchParams.get('direction') === 'sent' ? 'sent' : 'received';
  const selectDirection = (next: PaymentRequestDirection) => {
    // タブの切り替えで履歴を積むと、戻るがタブ間を行き来してしまう。
    setSearchParams(next === 'sent' ? { direction: 'sent' } : {}, {
      replace: true,
    });
  };
  const {
    requests,
    isLoadingInitial,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
  } = usePaymentRequestHistory(direction);
  const sentinelRef = useInfiniteScrollSentinel<HTMLLIElement>(loadMore);

  // タブを切り替えたときも先頭から見せる。
  useScrollToTop([direction]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white">
      {/*
        ヘッダー単体はScreenHeaderがstickyにするが、タブも一緒に残す必要がある。
        別々にstickyにすると、タブを止める位置にヘッダーの高さを直書きすることになる。
        まとめて包めば高さを知らずに済む。
      */}
      <div className="sticky top-0 z-10 bg-white">
        <ScreenHeader title="請求履歴" onBack={onBack} />

        {/*
          role="tab"は名乗らない。ARIAのタブは対応するtabpanelと矢印キー操作まで
          揃えて初めて正しく伝わるため、中途半端に付けると支援技術を誤らせる。
          押すと下の一覧が入れ替わるだけなので、aria-pressedを持つボタン2つで表す。
        */}
        <div
          aria-label="請求の種類"
          role="group"
          className="flex border-b border-slate-200"
        >
          {TABS.map((tab) => {
            const isSelected = tab.direction === direction;

            return (
              <button
                key={tab.direction}
                type="button"
                aria-pressed={isSelected}
                onClick={() => selectDirection(tab.direction)}
                className={`min-h-[44px] flex-1 border-none bg-transparent py-3 text-sm active:bg-slate-50 ${
                  isSelected
                    ? 'border-b-2 border-slate-800 font-bold text-slate-900'
                    : 'text-slate-500'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoadingInitial && (
        <p className="px-4 py-8 text-center text-slate-500">読み込み中…</p>
      )}

      {!isLoadingInitial && requests.length === 0 && error !== null && (
        <p role="alert" className="px-4 py-8 text-center text-slate-500">
          {error}
        </p>
      )}

      {!isLoadingInitial && requests.length === 0 && error === null && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <div
            aria-hidden="true"
            className="h-14 w-14 rounded-full border border-dashed border-slate-300"
          />
          <p className="m-0 text-sm text-slate-600">まだ請求がありません</p>
          <p className="m-0 text-xs text-slate-400">
            {emptyMessages[direction]}
          </p>
        </div>
      )}

      {requests.length > 0 && (
        <ul className="m-0 flex-1 list-none p-0">
          {requests.map((request) => (
            <PaymentRequestListItem
              key={request.id}
              request={request}
              direction={direction}
              showStatus
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
          {error !== null && (
            <li role="alert" className="px-4 py-4 text-center text-slate-500">
              {error}
            </li>
          )}
        </ul>
      )}
    </main>
  );
}
