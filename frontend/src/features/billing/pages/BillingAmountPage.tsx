import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { ScreenHeader } from '../../../components/ScreenHeader';
import { useRecipientsFromLocationState } from '../../../hooks/useRecipientsFromLocationState';
import { isSubmittableAmount } from '../../../lib/amount';
import type { Recipient } from '../../../types/user';
import {
  MAX_BILLING_RECIPIENTS,
  sendBillingRequests,
  type BillingRequestItem,
} from '../api/billingClient';
import { BillingRecipientRow } from '../components/BillingRecipientRow';
import { useBillingAmounts } from '../hooks/useBillingAmounts';

/** 請求相手を選び直すための画面。相手選択画面は?purpose=billingで請求フローとして動く。
 *  戻るボタンの遷移先と、相手が渡されなかった場合の差し戻し先を兼ねる。 */
const RECIPIENT_SELECTION_PATH = '/recipients?purpose=billing';

const SUBMIT_ERROR_MESSAGE =
  '請求に失敗しました。時間をおいて再度お試しください。';

export function BillingAmountPage() {
  const recipients = useRecipientsFromLocationState();

  // 相手未選択で/billingを直接開いた場合や、選択後に再読み込みした場合にモックの相手へ
  // フォールバックすると、選んでいない相手への請求が登録されうる。
  // 金融操作なので既定の相手を仮定せず、請求相手選択からやり直させる。
  // replaceで置き換え、ブラウザの戻る操作で相手不明の/billingへ戻らないようにする。
  if (recipients === null) {
    return <Navigate to={RECIPIENT_SELECTION_PATH} replace />;
  }

  return <BillingAmountForm recipients={recipients} />;
}

interface BillingAmountFormProps {
  recipients: Recipient[];
}

// 請求は自分の口座からお金が出ないため、送金画面のような残高による上限は設けない。
// ただし金額そのものの上限（AMOUNT_LIMIT）は送金と揃えて課す。共通の金額バリデーション
// （getAmountError / isSubmittableAmount）が担うため、この画面での追加処理は要らない。
function BillingAmountForm({ recipients }: BillingAmountFormProps) {
  const navigate = useNavigate();
  const { amounts, isAutofillActive, setAmount } =
    useBillingAmounts(recipients);
  const [isSent, setIsSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedRequests, setSubmittedRequests] = useState<
    BillingRequestItem[]
  >([]);

  // 戻るは請求相手の選択画面へ。金額入力の履歴を残さないようreplaceで置き換え、
  // 相手選択→請求→戻るを繰り返しても履歴が積み上がらないようにする。
  const handleBack = () =>
    void navigate(RECIPIENT_SELECTION_PATH, { replace: true });

  const isTooManyRecipients = recipients.length > MAX_BILLING_RECIPIENTS;
  const enteredAmounts = recipients.map(
    (recipient) => amounts[recipient.id] ?? '',
  );
  const total = enteredAmounts.reduce(
    (sum, amount) => (isSubmittableAmount(amount) ? sum + Number(amount) : sum),
    0,
  );
  const canSubmit =
    !isTooManyRecipients && enteredAmounts.every(isSubmittableAmount);

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }
    const requests = recipients.map((recipient) => ({
      recipientId: recipient.id,
      amount: Number(amounts[recipient.id]),
    }));
    setSubmitError('');
    setIsSubmitting(true);
    try {
      await sendBillingRequests({ requests });
      setSubmittedRequests(requests);
      setIsSent(true);
    } catch {
      setSubmitError(SUBMIT_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSent) {
    return (
      <BillingCompleteView
        recipients={recipients}
        requests={submittedRequests}
        onBackToHome={() => void navigate('/')}
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-slate-50">
      <ScreenHeader
        title={`請求先（${String(recipients.length)}人）`}
        onBack={handleBack}
      />

      <div className="flex flex-1 flex-col gap-6 px-5 py-8">
        <p className="text-sm text-slate-600">
          {isAutofillActive
            ? '最初に入力した金額が全員に反映されます。人ごとに変更もできます。'
            : '人ごとに請求金額を入力してください。'}
        </p>

        {isTooManyRecipients && (
          <p className="text-sm text-red-600">
            {`一度に請求できるのは${MAX_BILLING_RECIPIENTS}人までです。相手を選び直してください。`}
          </p>
        )}

        <ul className="flex list-none flex-col gap-3 p-0">
          {recipients.map((recipient) => (
            <BillingRecipientRow
              key={recipient.id}
              recipient={recipient}
              amount={amounts[recipient.id] ?? ''}
              disabled={isSubmitting}
              onAmountChange={(value) => setAmount(recipient.id, value)}
            />
          ))}
        </ul>

        <div className="flex items-baseline justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <span className="text-sm font-semibold text-slate-600">合計</span>
          <span className="text-xl font-bold text-slate-900">
            {total.toLocaleString()}円
          </span>
        </div>

        {submitError !== '' && (
          <p className="text-sm text-red-600">{submitError}</p>
        )}

        <button
          type="button"
          disabled={!canSubmit || isSubmitting}
          onClick={() => void handleSubmit()}
          className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSubmitting ? '送信中...' : '請求'}
        </button>
      </div>
    </div>
  );
}

interface BillingCompleteViewProps {
  recipients: Recipient[];
  requests: BillingRequestItem[];
  onBackToHome: () => void;
}

function BillingCompleteView({
  recipients,
  requests,
  onBackToHome,
}: BillingCompleteViewProps) {
  const nameById = new Map(
    recipients.map((recipient) => [recipient.id, recipient.name]),
  );
  const total = requests.reduce((sum, { amount }) => sum + amount, 0);
  const firstRequest = requests[0];
  const description =
    requests.length === 1 && firstRequest !== undefined
      ? `${nameById.get(firstRequest.recipientId) ?? ''}さんに${firstRequest.amount.toLocaleString()}円を請求しました。`
      : `${requests.length}人に合計${total.toLocaleString()}円を請求しました。`;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 bg-slate-50 px-5 py-8 text-center">
      <p className="text-lg font-bold text-slate-900">請求が完了しました</p>
      <p className="text-sm text-slate-600">{description}</p>

      {requests.length > 1 && (
        <ul className="flex w-full list-none flex-col gap-2 p-0">
          {requests.map(({ recipientId, amount }) => (
            <li
              key={recipientId}
              className="flex items-baseline justify-between rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
            >
              <span className="min-w-0 truncate text-slate-700">
                {nameById.get(recipientId) ?? ''}
              </span>
              <span className="flex-none font-semibold text-slate-900">
                {amount.toLocaleString()}円
              </span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onBackToHome}
        className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
      >
        トップへ戻る
      </button>
    </div>
  );
}
