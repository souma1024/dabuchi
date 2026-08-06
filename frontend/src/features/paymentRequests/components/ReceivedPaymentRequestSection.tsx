import { Link } from 'react-router-dom';

import { useReceivedPaymentRequests } from '../hooks/useReceivedPaymentRequests';
import { PaymentRequestListItem } from './PaymentRequestListItem';
import { useInfiniteScrollSentinel } from '../../../hooks/useInfiniteScrollSentinel';

const noticeStyle = 'px-5 py-6 text-center text-sm text-slate-500';

/**
 * ホーム画面下部の「請求されています」セクション（Issue #44）。
 *
 * 一覧を別ページにせずホームへ直接置いている。請求からの送金は相手も金額も
 * 確定しているため、送金の通常フロー（相手選択→金額入力）を通る必要がなく、
 * 一覧ページを挟むと画面が1枚増えるだけになるため。
 *
 * 続きはスクロールで自動的に読み込む。取引履歴一覧と同じ方式に揃えており、
 * 「もっと見る」を押すたびにボタンが出直すことがない。
 *
 * 0件でも見出しは残す。セクションごと消すと機能の存在に気づけなくなる。
 */
export function ReceivedPaymentRequestSection() {
  const {
    requests,
    isLoadingInitial,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
  } = useReceivedPaymentRequests();
  const sentinelRef = useInfiniteScrollSentinel<HTMLLIElement>(loadMore);

  // APIは総件数を返さない（Issue #70）。読み込み済みの件数を出し、
  // 続きがある場合は「20+」のように未確定であることを示す。
  const requestCount = isLoadingInitial ? null : requests.length;

  return (
    <section
      aria-labelledby="received-payment-requests-title"
      /* min-h-0が無いとflexの子が縮まず、overflow-y-autoが効かない。 */
      className="flex min-h-0 flex-1 flex-col border-t-8 border-slate-100"
    >
      {/* 見出し・件数・請求履歴への導線は、一覧をスクロールしても残す。 */}
      <div className="flex flex-none items-baseline justify-between border-b border-slate-100 bg-white px-5 pt-4 pb-2">
        <h2
          id="received-payment-requests-title"
          className="m-0 flex items-center gap-2 text-sm font-bold text-slate-800"
        >
          請求されています
          {/*
            元のメニューでは「請求されている」をアンバー色のボタンにして気づかせていた。
            一覧に置き換えて色が消えたぶん、件数で気づけるようにする。
            色に頼らないため、色覚特性があっても伝わる。
          */}
          {requestCount !== null && requestCount > 0 && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
              {hasMore ? `${requestCount}+` : requestCount}
            </span>
          )}
        </h2>
        {/* 決着済みも含む全記録は請求履歴で見る（Issue #61）。 */}
        <Link
          to="/payment-requests"
          className="text-xs text-slate-500 underline"
        >
          請求履歴 ›
        </Link>
      </div>

      {isLoadingInitial ? (
        <p className={noticeStyle}>読み込み中…</p>
      ) : error !== null && requests.length === 0 ? (
        <p role="alert" className={noticeStyle}>
          {error}
        </p>
      ) : requests.length === 0 ? (
        <p className={noticeStyle}>請求はありません</p>
      ) : (
        <ul className="m-0 min-h-0 flex-1 list-none overflow-y-auto p-0">
          {requests.map((request) => (
            <PaymentRequestListItem
              key={request.id}
              request={request}
              direction="received"
            />
          ))}
          {hasMore && (
            <li ref={sentinelRef} aria-hidden="true" className="h-px" />
          )}
          {isLoadingMore && (
            <li className="px-5 py-4 text-center text-sm text-slate-500">
              読み込み中…
            </li>
          )}
          {error !== null && (
            <li
              role="alert"
              className="px-5 py-4 text-center text-sm text-slate-500"
            >
              {error}
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
