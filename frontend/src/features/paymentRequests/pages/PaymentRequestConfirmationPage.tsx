import { ScreenHeader } from '../../../components/ScreenHeader';
import { UserAvatar } from '../../../components/UserAvatar';
import { useCurrentUser } from '../../currentUser/hooks/useCurrentUser';
import { formatPaymentRequestDate } from '../formatPaymentRequestDate';
import { usePaymentRequestConfirmation } from '../hooks/usePaymentRequestConfirmation';
import type { PaymentRequestDirection } from '../types';

const noticeStyle = 'px-5 py-10 text-center text-sm text-slate-500';
const primaryStyle =
  'w-full rounded-xl px-4 py-3.5 text-center text-[15px] font-bold transition';
const secondaryStyle =
  'w-full rounded-xl border border-slate-800 bg-white px-4 py-3.5 text-center text-[15px] font-semibold text-slate-800 active:bg-slate-50';

interface PaymentRequestConfirmationPageProps {
  direction: PaymentRequestDirection;
  id: string;
  onBack?: () => void;
  onDone?: () => void;
}

/**
 * 請求の確認画面（Issue #61）。
 *
 * 受けた請求は承認／拒否、出した請求は取り消しを選ぶ。相手も金額も請求時点で
 * 確定しているため、送金の通常フロー（相手選択→金額入力）は通らない。
 *
 * 確認ダイアログは出さない。既存の送金画面が「金額入力画面 → 送金ボタン → 即実行」
 * で、確認は画面を一段挟むことで担保しているため。この画面自体がその一段にあたる。
 */
export function PaymentRequestConfirmationPage({
  direction,
  id,
  onBack,
  onDone,
}: PaymentRequestConfirmationPageProps) {
  const { request, isLoading, isSubmitting, error, completed, respond } =
    usePaymentRequestConfirmation(direction, id);
  const { currentUser } = useCurrentUser();

  const isReceived = direction === 'received';
  const title = isReceived ? '請求の確認' : '請求の詳細';

  // 完了表示。送金画面の完了表示と同じ形に揃える。
  if (completed !== null) {
    const doneMessage =
      completed.status === 'accepted'
        ? '送金しました'
        : isReceived
          ? '請求を拒否しました'
          : '請求を取り消しました';

    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white">
        <ScreenHeader title="完了" />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <div
            aria-hidden="true"
            className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-slate-800 text-2xl"
          >
            ✓
          </div>
          <p className="m-0 mt-3 text-base font-bold text-slate-900">
            {doneMessage}
          </p>
          <p className="m-0 text-2xl font-bold text-slate-900">
            {completed.amount.toLocaleString()}円
          </p>
          <p className="m-0 text-sm text-slate-500">
            {completed.counterparty.name} さん
            {completed.status === 'accepted' ? 'へ' : 'の請求'}
          </p>
        </div>
        <div className="p-5">
          <button
            type="button"
            onClick={onDone}
            className={`${primaryStyle} bg-slate-800 text-white`}
          >
            ホームに戻る
          </button>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white">
        <ScreenHeader title={title} onBack={onBack} />
        <p className={noticeStyle}>読み込み中…</p>
      </main>
    );
  }

  // 見つからない、またはすでに決着済み。実行できるボタンを出さない。
  if (request === null || request.status !== 'pending') {
    const goneMessage =
      request === null
        ? 'この請求は見つかりませんでした'
        : request.status === 'accepted'
          ? 'この請求は支払い済みです'
          : 'この請求はキャンセルされました';

    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white">
        <ScreenHeader title={title} onBack={onBack} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          {request !== null && (
            <UserAvatar
              name={request.counterparty.name}
              profileUrl={request.counterparty.profileUrl}
            />
          )}
          <p role="alert" className="m-0 text-sm font-semibold text-slate-700">
            {goneMessage}
          </p>
        </div>
        <div className="p-5">
          <button type="button" onClick={onBack} className={secondaryStyle}>
            一覧に戻る
          </button>
        </div>
      </main>
    );
  }

  const balance = currentUser?.balance ?? null;
  const isShort = isReceived && balance !== null && balance < request.amount;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white">
      <ScreenHeader title={title} onBack={onBack} />

      <div className="flex flex-col items-center gap-1 px-5 pt-8 pb-6 text-center">
        <UserAvatar
          name={request.counterparty.name}
          profileUrl={request.counterparty.profileUrl}
          size="large"
        />
        <p className="m-0 mt-2 text-[15px] font-semibold text-slate-900">
          {request.counterparty.name} さん
        </p>
        <p className="m-0 text-xs text-slate-500">
          {isReceived ? 'からの請求' : 'への請求'}
        </p>
        <p className="m-0 mt-3 text-4xl font-bold text-slate-900">
          {request.amount.toLocaleString()}円
        </p>
        <p className="m-0 text-xs text-slate-500">
          請求日 {formatPaymentRequestDate(request.createdAt)}
        </p>
      </div>

      {/* 取り消しはお金が動かないため残高を出さない。 */}
      {isReceived && balance !== null && (
        <div className="flex items-baseline justify-between border-t border-slate-200 px-5 py-4">
          {/* 払えるかを判断する材料なので、小さくしすぎない。 */}
          <span
            className={`text-sm ${
              isShort ? 'font-bold text-red-700' : 'text-slate-500'
            }`}
          >
            {isShort ? '残高が足りません' : '残高'}
          </span>
          <span className="text-base font-bold text-slate-900 tabular-nums">
            {balance.toLocaleString()}円
          </span>
        </div>
      )}

      <div className="flex flex-col gap-2.5 border-t border-slate-200 p-5">
        {error !== null && (
          <p role="alert" className="m-0 text-center text-xs text-red-700">
            {error}
          </p>
        )}

        {isReceived ? (
          <>
            <button
              type="button"
              disabled={isShort || isSubmitting}
              onClick={() => respond('accepted')}
              // お金が出ていく操作なので、送金ボタンと同じ赤にする。
              className={`${primaryStyle} ${
                isShort || isSubmitting
                  ? 'cursor-not-allowed bg-slate-300 text-white'
                  : 'bg-red-600 text-white active:bg-red-700'
              }`}
            >
              {isSubmitting ? '送金中…' : '承認して送金する'}
            </button>
            {/* 払えなくても断る判断はできるべきなので、拒否は押せるままにする。 */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => respond('rejected')}
              className={secondaryStyle}
            >
              拒否する
            </button>
            {isShort && (
              <p className="m-0 text-center text-sm font-semibold text-red-700">
                {(request.amount - (balance ?? 0)).toLocaleString()}円
                足りません
              </p>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => respond('rejected')}
              className={`${primaryStyle} ${
                isSubmitting
                  ? 'cursor-not-allowed bg-slate-300 text-white'
                  : 'bg-slate-800 text-white active:bg-slate-900'
              }`}
            >
              {isSubmitting ? '取り消し中…' : '請求を取り消す'}
            </button>
            <p className="m-0 text-center text-xs text-slate-500">
              取り消すと相手の一覧からも消えます
            </p>
          </>
        )}
      </div>
    </main>
  );
}
