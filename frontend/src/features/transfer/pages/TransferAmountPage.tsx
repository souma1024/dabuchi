import { useState } from 'react';

import { RecipientAmountPage } from '../../../components/RecipientAmountPage';
import { useRecipientFromLocationState } from '../../../hooks/useRecipientFromLocationState';
import {
  currentUser as fallbackUser,
  recipients,
} from '../../../lib/mockUsers';
import type { Recipient } from '../../../types/user';
import { useCurrentUser } from '../../currentUser/hooks/useCurrentUser';
import { sendTransfer } from '../api/transferClient';

// 送金相手の選択画面は別担当が実装するため、遷移元から渡されなかった場合はモックの相手にフォールバックする。
const defaultRecipient: Recipient = recipients[0] ?? fallbackUser;

const containerStyle =
  'mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center bg-slate-50 px-5 py-8 text-center';

export function TransferAmountPage() {
  const recipient = useRecipientFromLocationState(defaultRecipient);
  const { currentUser, isLoading, error } = useCurrentUser();
  // 送金1件につき冪等キーを1つ生成し、失敗後の再送でも同じキーを使う（二重送金防止）。
  const [idempotencyKey] = useState(() => crypto.randomUUID());

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
          idempotencyKey,
        })
      }
      maxAmount={{
        // 口座残高を超える送金はできない。
        value: currentUser.balance,
        label: '送金上限額',
        exceededMessage: '送金上限額を超えています',
      }}
    />
  );
}
