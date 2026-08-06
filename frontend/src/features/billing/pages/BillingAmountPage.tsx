import { RecipientAmountPage } from '../../../components/RecipientAmountPage';
import { useRecipientFromLocationState } from '../../../hooks/useRecipientFromLocationState';
import { currentUser, recipients } from '../../../lib/mockUsers';
import type { Recipient } from '../../../types/user';
import { sendBillingRequest } from '../api/billingClient';

// 請求相手の選択画面は別担当が実装するため、遷移元から渡されなかった場合はモックの相手にフォールバックする。
const defaultRecipient: Recipient = recipients[0] ?? currentUser;

export function BillingAmountPage() {
  const recipient = useRecipientFromLocationState(defaultRecipient);

  return (
    <RecipientAmountPage
      recipient={recipient}
      heading="請求先"
      amountLabel="請求金額"
      submitLabel="請求"
      submittingLabel="送信中..."
      submitErrorMessage="請求に失敗しました。時間をおいて再度お試しください。"
      completeTitle="請求が完了しました"
      renderCompleteDescription={(recipient, amount) =>
        `${recipient.name}さんに${amount.toLocaleString()}円を請求しました。`
      }
      // 請求は自分の口座からお金が出ないため、残高による上限を設けない。
      // maxAmountを渡さないことで、上限表示と超過チェックの両方を行わない。
      onSubmit={(amount) =>
        sendBillingRequest({ recipientId: recipient.id, amount })
      }
      showMessageField
    />
  );
}
