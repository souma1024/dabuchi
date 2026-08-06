import { useNavigate } from 'react-router-dom';

import { TransactionsPage } from '../features/transactions/pages/TransactionsPage';

const CURRENT_USER_ID: string =
  import.meta.env.VITE_CURRENT_USER_ID ??
  '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001';

/** 取引履歴画面をルーティングへ接続するラッパー。戻る→ホーム。 */
export function TransactionsRoute() {
  const navigate = useNavigate();

  return (
    // 相手選択画面と同じく、戻るは常にホームへ。履歴を積まないようreplaceする。
    <TransactionsPage
      currentUserId={CURRENT_USER_ID}
      onBack={() => void navigate('/', { replace: true })}
    />
  );
}
