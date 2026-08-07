import { useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { RecipientAmountPage } from '../../../components/RecipientAmountPage';
import { isRecipient } from '../../../hooks/useRecipientFromLocationState';
import type { Recipient } from '../../../types/user';
import { AMOUNT_LIMIT } from '../../../lib/amount';
import { useCurrentUser } from '../../currentUser/hooks/useCurrentUser';
import { sendTransfer } from '../api/transferClient';
import { randomId } from '../../../lib/randomId';

const containerStyle =
  'mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center bg-slate-50 px-5 py-8 text-center';

export function TransferAmountPage() {
  const location = useLocation();
  const stateRecipient = (location.state as { recipient?: unknown } | null)
    ?.recipient;

  // 相手が渡されていない（画面更新などで location.state が失われた）場合、モックへ
  // フォールバックしない。実残高を動かすため、意図しない相手への送金を防ぎ、相手選択へ戻す。
  if (!isRecipient(stateRecipient)) {
    return <Navigate to="/recipients" replace />;
  }

  return <TransferAmountForm recipient={stateRecipient} />;
}

interface LastAttempt {
  recipientId: string;
  amount: number;
  key: string;
}

function TransferAmountForm({ recipient }: { recipient: Recipient }) {
  const { currentUser, isLoading, error } = useCurrentUser();
  // 直前の送金内容(相手・金額)と冪等キーを保持する。
  const lastAttemptRef = useRef<LastAttempt | null>(null);

  if (isLoading) {
    return (
      <div className={containerStyle}>
        <p className="text-sm text-slate-500">読み込み中...</p>
      </div>
    );
  }

  if (error !== null || currentUser === null) {
    return (
      <div className={containerStyle}>
        <p role="alert" className="text-sm text-slate-600">
          {error ?? 'ユーザー情報の取得に失敗しました'}
        </p>
      </div>
    );
  }

  // 同一内容(相手・金額)の再送は同じ冪等キーを使い、内容が変わったら新しいキーを生成する。
  // これにより失敗後の再送は重複排除され、金額を変えた送金は別取引として409にならない。
  const idempotencyKeyFor = (amount: number): string => {
    const last = lastAttemptRef.current;
    if (last && last.recipientId === recipient.id && last.amount === amount) {
      return last.key;
    }
    const key = randomId();
    lastAttemptRef.current = { recipientId: recipient.id, amount, key };
    return key;
  };

  return (
    <RecipientAmountPage
      recipient={recipient}
      heading="送金先"
      amountLabel="送金金額"
      submitLabel="送金"
      submittingLabel="送信中..."
      submitErrorMessage="送金に失敗しました。時間をおいて再度お試しください。"
      completeTitle="送金しました"
      renderCompleteDescription={(recipient, amount) =>
        `${recipient.name}さんへ${amount.toLocaleString()}円を送金しました。`
      }
      onSubmit={(amount) =>
        sendTransfer({
          senderId: currentUser.id,
          recipientId: recipient.id,
          amount,
          idempotencyKey: idempotencyKeyFor(amount),
        })
      }
      maxAmount={{
        // 送金上限額は常に80,000円と表示する。残高は別枠(secondaryMax)で判定する。
        value: AMOUNT_LIMIT,
        label: '送金上限額',
        exceededMessage: '送金上限額を超えています',
      }}
      secondaryMax={{
        // 上限額(80,000円)以内でも、口座残高を超える送金はできない。
        value: currentUser.balance,
        exceededMessage: '残高が不足しています',
      }}
    />
  );
}
