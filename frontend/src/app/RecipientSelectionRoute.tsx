import { useNavigate, useSearchParams } from 'react-router-dom';

import { RecipientSelectionScreen } from '../features/recipientSelection/RecipientSelectionScreen';
import type { Recipient } from '../features/recipientSelection/types';

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

/** 相手選択画面をルーティングへ接続するラッパー。選択→送金/請求画面、戻る→ホーム。 */
export function RecipientSelectionRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const purpose: Purpose =
    searchParams.get('purpose') === 'billing' ? 'billing' : 'transfer';
  const { path, title, emptyMessage } = PURPOSE_CONFIG[purpose];

  return (
    <RecipientSelectionScreen
      currentUserId={CURRENT_USER_ID}
      title={title}
      emptyMessage={emptyMessage}
      // 戻るは常にホームへ。履歴を積まないようreplaceし、ブラウザの戻る操作で相手選択画面へ戻らないようにする。
      onBack={() => void navigate('/', { replace: true })}
      onSelectRecipient={(recipient: Recipient) =>
        // TransferAmountPage / BillingAmountPage は共通してlocation.state.recipient({id,name,profileUrl})を読む。
        void navigate(path, {
          state: {
            recipient: {
              id: recipient.id,
              name: recipient.name,
              profileUrl: recipient.imageUrl,
            },
          },
        })
      }
    />
  );
}
