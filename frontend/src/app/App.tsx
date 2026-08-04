import { RecipientSelectionScreen } from '../features/recipientSelection/RecipientSelectionScreen';
import type { Recipient } from '../features/recipientSelection/types';

// 認証が未実装のため、暫定で環境変数（未設定なら開発シードfriend-001のUUID）を現在ユーザーとして扱う。
// バックエンドはcurrentUserIdにUUID（内部id）を要求する。
const CURRENT_USER_ID: string =
  import.meta.env.VITE_CURRENT_USER_ID ??
  '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001';

export function App() {
  const handleSelectRecipient = (recipient: Recipient) => {
    // TODO: 送金画面への遷移（ルーターと送金画面の実装後に接続する）。
    console.info('選択された送金相手:', recipient);
  };

  return (
    <RecipientSelectionScreen
      currentUserId={CURRENT_USER_ID}
      onSelectRecipient={handleSelectRecipient}
    />
  );
}
