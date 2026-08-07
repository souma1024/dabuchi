import { useCallback, useEffect, useRef, useState } from 'react';

import {
  fetchPaymentRequest,
  respondToPaymentRequest,
} from '../api/paymentRequestsClient';
import type { PaymentRequest, PaymentRequestAction } from '../types';

/** 確認画面が扱う結果と操作。 */
export interface UsePaymentRequestConfirmationResult {
  request: PaymentRequest | null;
  isLoading: boolean;
  /** 承認・拒否・取り消しの送信中。 */
  isSubmitting: boolean;
  error: string | null;
  /** 実行が完了したら、確定後の請求。未実行ならnull。 */
  completed: PaymentRequest | null;
  respond: (action: PaymentRequestAction) => void;
}

function toErrorMessage(caught: unknown): string {
  return caught instanceof Error
    ? caught.message
    : '不明なエラーが発生しました';
}

/**
 * 請求1件を取り直し、承認・拒否・取り消しを実行するフック（Issue #61）。
 *
 * 一覧を読み込んだ時刻と行をタップする時刻の間に状態が変わりうるため、
 * 画面を開いた時点でもう一度取得する。すでに処理済みなら実行ボタンを出さない。
 *
 * directionは受け取らない。相手はserverがログイン中ユーザーから決めるため、
 * 取得にも操作にも要らない。画面がどちらのボタンを出すかだけに使う。
 *
 * 実行時にも状態を確認する。画面の情報がどれだけ新しくても、押した瞬間と
 * 処理される瞬間の間には時間差があるため。実APIは409で弾く（Issue #71）。
 *
 * respondは状態名ではなく操作名で受ける。拒否と取り消しはどちらもrejectedになり、
 * 状態名では区別できないため（実APIは別エンドポイントで、押せる人も逆）。
 */
export function usePaymentRequestConfirmation(
  id: string,
): UsePaymentRequestConfirmationResult {
  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<PaymentRequest | null>(null);

  // 送信はeffectの外から呼ばれるためcleanupを持てない。
  const mountedRef = useRef(true);
  // stateの更新は非同期のため、連打すると両方がガードをすり抜ける。
  // お金が動く操作なので、同期的に判定できるrefで二重送信を防ぐ。
  const submittingRef = useRef(false);
  // 承認・拒否のレスポンスは相手と請求日を返さないため、取得済みの請求へ重ねる。
  // respondの中から今の値を読む必要があり、stateだと古い値を掴むためrefで持つ。
  const requestRef = useRef<PaymentRequest | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    void fetchPaymentRequest(id)
      .then((found) => {
        if (!active) {
          return;
        }
        requestRef.current = found;
        setRequest(found);
        setError(found === null ? 'この請求は見つかりませんでした' : null);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(toErrorMessage(caught));
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  const respond = useCallback(
    (action: PaymentRequestAction) => {
      if (submittingRef.current) {
        return;
      }
      submittingRef.current = true;
      setIsSubmitting(true);
      setError(null);

      void respondToPaymentRequest(id, action)
        .then((responded) => {
          if (!mountedRef.current || requestRef.current === null) {
            return;
          }
          // 相手と請求日は操作で変わらないため返らない。元の請求へ重ねる。
          const updated: PaymentRequest = {
            ...requestRef.current,
            ...responded,
          };
          requestRef.current = updated;
          setRequest(updated);
          setCompleted(updated);
        })
        .catch((caught: unknown) => {
          if (mountedRef.current) {
            setError(toErrorMessage(caught));
          }
        })
        .finally(() => {
          submittingRef.current = false;
          if (mountedRef.current) {
            setIsSubmitting(false);
          }
        });
    },
    [id],
  );

  return { request, isLoading, isSubmitting, error, completed, respond };
}
