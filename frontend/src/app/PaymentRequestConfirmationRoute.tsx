import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { PaymentRequestConfirmationPage } from '../features/paymentRequests/pages/PaymentRequestConfirmationPage';
import type { PaymentRequestDirection } from '../features/paymentRequests/types';

/**
 * 請求の確認画面をルーティングへ接続するラッパー。
 * 受けた請求（ホーム・請求履歴）と出した請求（請求履歴）のどちらからも入る。
 */
export function PaymentRequestConfirmationRoute() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  // 向きが不正でも画面を壊さず、受けた請求として扱う。
  const direction: PaymentRequestDirection =
    searchParams.get('direction') === 'sent' ? 'sent' : 'received';

  if (id === undefined) {
    // ルート定義上は必ず入るが、型の絞り込みのために扱う。
    return null;
  }

  return (
    <PaymentRequestConfirmationPage
      direction={direction}
      id={id}
      // 一覧へは来た経路で戻る。ホームからでも請求履歴からでも同じ操作で済む。
      onBack={() => void navigate(-1)}
      // 残高が変わったときだけホームへ。送金画面の完了後と揃える。
      onDone={() => void navigate('/', { replace: true })}
    />
  );
}
