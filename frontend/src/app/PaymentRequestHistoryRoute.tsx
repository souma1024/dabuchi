import { useNavigate } from 'react-router-dom';

import { PaymentRequestHistoryPage } from '../features/paymentRequests/pages/PaymentRequestHistoryPage';

/**
 * 請求履歴画面をルーティングへ接続するラッパー。戻る→ホーム。
 * 対象ユーザーはserver側のログイン中ユーザーから決まるため、ここでは渡さない。
 */
export function PaymentRequestHistoryRoute() {
  const navigate = useNavigate();

  return (
    // 取引履歴画面と同じく、戻るは常にホームへ。履歴を積まないようreplaceする。
    <PaymentRequestHistoryPage
      onBack={() => void navigate('/', { replace: true })}
    />
  );
}
