import { useNavigate } from 'react-router-dom';

import { RecipientSelectionScreen } from '../features/recipientSelection/RecipientSelectionScreen';
import type { Recipient } from '../features/recipientSelection/types';

// 認証が未実装のため、暫定で環境変数（未設定なら開発シードfriend-001のUUID）を現在ユーザーとして扱う。
// バックエンドはcurrentUserIdにUUID（内部id）を要求する。
const CURRENT_USER_ID: string =
  import.meta.env.VITE_CURRENT_USER_ID ??
  '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001';

/** 相手選択画面をルーティングへ接続するラッパー。選択→送金画面、戻る→ホーム。 */
export function RecipientSelectionRoute() {
  const navigate = useNavigate();

  return (
    <RecipientSelectionScreen
      currentUserId={CURRENT_USER_ID}
      // 戻るは常にホームへ。履歴を積まないようreplaceし、ブラウザの戻る操作で相手選択画面へ戻らないようにする。
      onBack={() => void navigate('/', { replace: true })}
      onSelectRecipient={(recipient: Recipient) =>
        // TransferAmountPage は location.state.recipient({id,name,profileUrl}) を読む。
        void navigate('/transfer', {
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
