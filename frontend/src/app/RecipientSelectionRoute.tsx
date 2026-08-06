import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { MAX_BILLING_RECIPIENTS } from '../features/billing/api/billingClient';
import { RecipientSelectionScreen } from '../features/recipientSelection/RecipientSelectionScreen';
import {
  DEFAULT_RECIPIENT_SORT,
  type Recipient,
  type RecipientSort,
} from '../features/recipientSelection/types';

// 認証が未実装のため、暫定で環境変数（未設定なら開発シードfriend-001のUUID）を現在ユーザーとして扱う。
// バックエンドはcurrentUserIdにUUID（内部id）を要求する。
const CURRENT_USER_ID: string =
  import.meta.env.VITE_CURRENT_USER_ID ??
  '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001';

// ?purpose=billingのときだけ請求フロー、それ以外（未指定含む）は送金フローとして扱う。
type Purpose = 'transfer' | 'billing';

const PURPOSE_CONFIG: Record<
  Purpose,
  { path: string; title: string; emptyMessage: string }
> = {
  transfer: {
    path: '/transfer',
    title: '送金相手を選ぶ',
    emptyMessage: '送金できる相手がいません。',
  },
  billing: {
    path: '/billing',
    title: '請求相手を選ぶ',
    emptyMessage: '請求できる相手がいません。',
  },
};

/** 送金・請求画面が読むlocation.state用の形へ変換する。 */
function toStateRecipient({ id, name, imageUrl }: Recipient) {
  return { id, name, profileUrl: imageUrl };
}

/** 相手選択画面をルーティングへ接続するラッパー。選択→送金/請求画面、戻る→ホーム。 */
export function RecipientSelectionRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sort, setSort] = useState<RecipientSort>(DEFAULT_RECIPIENT_SORT);
  const purpose: Purpose =
    searchParams.get('purpose') === 'billing' ? 'billing' : 'transfer';
  const { path, title, emptyMessage } = PURPOSE_CONFIG[purpose];

  // 戻るは常にホームへ。履歴を積まないようreplaceし、ブラウザの戻る操作で相手選択画面へ戻らないようにする。
  const handleBack = () => void navigate('/', { replace: true });

  // 請求は複数人へまとめて出せる。BillingAmountPageはlocation.state.recipientsを配列で読む。
  if (purpose === 'billing') {
    return (
      <RecipientSelectionScreen
        currentUserId={CURRENT_USER_ID}
        title={title}
        emptyMessage={emptyMessage}
        sort={sort}
        onSortChange={setSort}
        onBack={handleBack}
        selectionMode="multiple"
        maxSelectionCount={MAX_BILLING_RECIPIENTS}
        onConfirmSelection={(recipients: Recipient[]) =>
          void navigate(path, {
            state: { recipients: recipients.map(toStateRecipient) },
          })
        }
      />
    );
  }

  // 送金は1人へ送るため、行タップで即座に金額入力へ進む。
  return (
    <RecipientSelectionScreen
      currentUserId={CURRENT_USER_ID}
      title={title}
      emptyMessage={emptyMessage}
      sort={sort}
      onSortChange={setSort}
      onBack={handleBack}
      onSelectRecipient={(recipient: Recipient) =>
        void navigate(path, {
          state: { recipient: toStateRecipient(recipient) },
        })
      }
    />
  );
}
