import { useNavigate } from 'react-router-dom';

import { TransactionsPage } from '../features/transactions/pages/TransactionsPage';

/** 取引履歴画面をルーティングへ接続するラッパー。戻る→ホーム。 */
export function TransactionsRoute() {
  const navigate = useNavigate();

  return (
    // 相手選択画面と同じく、戻るは常にホームへ。履歴を積まないようreplaceする。
    <TransactionsPage onBack={() => void navigate('/', { replace: true })} />
  );
}
