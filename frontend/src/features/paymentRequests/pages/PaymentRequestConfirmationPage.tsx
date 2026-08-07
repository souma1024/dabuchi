import { ScreenHeader } from '../../../components/ScreenHeader';
import { UserAvatar } from '../../../components/UserAvatar';
import { useCurrentUser } from '../../currentUser/hooks/useCurrentUser';
import { formatJstDateTime } from '../../../lib/formatJstDate';
import { usePaymentRequestConfirmation } from '../hooks/usePaymentRequestConfirmation';
import type { PaymentRequest, PaymentRequestDirection } from '../types';

const noticeStyle = 'px-5 py-10 text-center text-sm text-slate-500';
const primaryStyle =
  'w-full rounded-xl px-4 py-3.5 text-center text-[15px] font-bold transition';
const secondaryStyle =
  'w-full rounded-xl border border-slate-800 bg-white px-4 py-3.5 text-center text-[15px] font-semibold text-slate-800 active:bg-slate-50';

interface PaymentRequestConfirmationPageProps {
  direction: PaymentRequestDirection;
  id: string;
  /** 一覧へ戻る。来た画面（ホームまたは請求履歴）に応じて呼び出し側が決める。 */
  onBack?: () => void;
  /** 残高が変わったときの戻り先。ホームを想定。 */
  onDone?: () => void;
}

/**
 * 決着済みの請求を開いたときの説明。
 *
 * 「キャンセルされました」だけでは、相手が取り下げたのか自分が何かしたのか
 * 分からない。誰がどの操作で終わらせたかまで出して、次にどうすればよいかを示す。
 *
 * 拒否できるのは被請求者、取り下げられるのは請求者だけなので、endedByMeと
 * directionの組み合わせで操作が一意に決まる。
 */
function settledMessage(request: PaymentRequest, isReceived: boolean): string {
  if (request.status === 'accepted') {
    return isReceived ? 'この請求は支払い済みです' : '相手が支払いました';
  }

  // endedByMeが欠けた場合だけ、行為者を示さない言い方へ落とす。
  if (request.endedByMe === null) {
    return 'この請求はキャンセルされました';
  }

  const endedByRecipient = isReceived ? request.endedByMe : !request.endedByMe;

  if (endedByRecipient) {
    return isReceived ? 'この請求を拒否しました' : '相手が請求を拒否しました';
  }

  return isReceived
    ? '相手が請求を取り下げました'
    : 'この請求は取り下げ済みです';
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
    usePaymentRequestConfirmation(id);
  const { currentUser } = useCurrentUser();

  const isReceived = direction === 'received';
  const title = isReceived ? '請求の確認' : '請求の詳細';

  // 完了表示。送金・請求画面（RecipientAmountPage）の完了表示に揃える。
  // 読んで判断する画面ではないため、ヘッダーを置かずボタンまで中央に収める。
  if (completed !== null) {
    const doneMessage =
      completed.status === 'accepted'
        ? '送金しました'
        : isReceived
          ? '請求を拒否しました'
          : '請求を取り消しました';
    // 承認は残高が変わるためホームへ。拒否・取り消しは来た一覧へ戻して
    // 作業を続けられるようにする。取り消しは請求履歴からしか来ないため、
    // ホームへ戻すと来た場所と違う画面に置き去りになる。
    const isPaid = completed.status === 'accepted';

    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col items-center justify-center gap-4 bg-white px-5 py-8 text-center">
        <div
          aria-hidden="true"
          className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-slate-800 text-2xl"
        >
          ✓
        </div>
        <p className="m-0 text-base font-bold text-slate-900">{doneMessage}</p>
        <p className="m-0 text-2xl font-bold text-slate-900">
          {completed.amount.toLocaleString()}円
        </p>
        <p className="m-0 text-sm text-slate-500">
          {completed.counterparty.name} さん{isPaid ? 'へ' : 'の請求'}
        </p>
        <button
          type="button"
          onClick={isPaid ? onDone : onBack}
          // 確認画面のボタンと同じ幅にする。中央寄せでも押しやすさを保つため。
          className={`${primaryStyle} mt-4 bg-slate-800 text-white active:bg-slate-900`}
        >
          {isPaid ? 'ホームに戻る' : '一覧に戻る'}
        </button>
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
        : settledMessage(request, isReceived);

    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white">
        <ScreenHeader title={title} onBack={onBack} />
        {/*
          できることが「戻る」しかない画面なので、完了表示と同じく中央へ収める。
          最下部へ置くと、実行した直後の完了表示との間で押す場所が飛ぶ。
        */}
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
          {/* 確認画面のボタンと同じ幅にする。中央寄せでも押しやすさを保つため。 */}
          <button
            type="button"
            onClick={onBack}
            className={`${secondaryStyle} mt-4`}
          >
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
      {/*
        実行中は戻る矢印を出さない。ボタンは無効化しているのに矢印だけ生きていると、
        送金の最中に画面を離れられてしまう。処理はサーバー側で完了するが、
        利用者は結果を見ないまま去ることになる。
      */}
      <ScreenHeader title={title} onBack={isSubmitting ? undefined : onBack} />

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
          請求日時 {formatJstDateTime(request.createdAt)}
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
              onClick={() => respond('accept')}
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
              onClick={() => respond('reject')}
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
              onClick={() => respond('cancel')}
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
