import { RecipientAmountPage } from '../../../components/RecipientAmountPage';
import { sendTransfer } from '../api/transferClient';
import { useRecipientFromLocationState } from '../../../hooks/useRecipientFromLocationState';
import {
  currentUser,
  recipients,
  transferLimitMaxAmount,
} from '../../../lib/mockUsers';
import type { Recipient } from '../../../types/user';

// 送金相手の選択画面は別担当が実装するため、遷移元から渡されなかった場合はモックの相手にフォールバックする。
const defaultRecipient: Recipient = recipients[0] ?? currentUser;

export function TransferAmountPage() {
  const recipient = useRecipientFromLocationState(defaultRecipient);

  return (
    <RecipientAmountPage
      recipient={recipient}
      heading="送金先"
      amountLabel="送金金額"
      submitLabel="送金"
      submittingLabel="送信中..."
      submitErrorMessage="送金に失敗しました。時間をおいて再度お試しください。"
      completeTitle="送金が完了しました"
      renderCompleteDescription={(recipient, amount) =>
        `${recipient.name}さんに${amount.toLocaleString()}円を送金しました。`
      }
      onSubmit={(amount) => sendTransfer({ userId: recipient.id, amount })}
      maxAmount={transferLimitMaxAmount}
      showMessageField
    />
  );
}
