import { RecipientAmountPage } from '../../../components/RecipientAmountPage';
import { useRecipientFromLocationState } from '../../../hooks/useRecipientFromLocationState';
import { MAX_TRANSACTION_AMOUNT } from '../../../lib/amountLimits';
import { currentUser, recipients } from '../../../lib/mockUsers';
import type { Recipient } from '../../../types/user';
import { sendTransfer } from '../api/transferClient';

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
      completeTitle="送金情報を登録しました"
      renderCompleteDescription={(recipient, amount) =>
        `${recipient.name}さんへの${amount.toLocaleString()}円の送金情報を登録しました。`
      }
      completeNote="残高の更新はまだ反映されていません。"
      onSubmit={(amount) =>
        sendTransfer({
          senderId: currentUser.id,
          recipientId: recipient.id,
          amount,
        })
      }
      maxAmount={{
        value: MAX_TRANSACTION_AMOUNT,
        label: '送金上限額',
        exceededMessage: '送金上限額を超えています',
      }}
      showMessageField
    />
  );
}
