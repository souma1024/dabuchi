import { useCallback, useEffect, useRef, useState } from 'react';

import {
  fetchMockPaymentRequest,
  respondToMockPaymentRequest,
} from '../mockPaymentRequests';
import type {
  PaymentRequest,
  PaymentRequestAction,
  PaymentRequestDirection,
} from '../types';

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
 * 実行時にも状態を確認する。画面の情報がどれだけ新しくても、押した瞬間と
 * 処理される瞬間の間には時間差があるため。実APIは409で弾く（Issue #71）。
 *
 * respondは状態名ではなく操作名で受ける。拒否と取り消しはどちらもrejectedになり、
 * 状態名では区別できないため（実APIは別エンドポイントで、押せる人も逆）。
 */
export function usePaymentRequestConfirmation(
  direction: PaymentRequestDirection,
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

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    void fetchMockPaymentRequest(direction, id)
      .then((found) => {
        if (!active) {
          return;
        }
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
  }, [direction, id]);

  const respond = useCallback(
    (action: PaymentRequestAction) => {
      if (submittingRef.current) {
        return;
      }
      submittingRef.current = true;
      setIsSubmitting(true);
      setError(null);

      void respondToMockPaymentRequest(direction, id, action)
        .then((updated) => {
          if (!mountedRef.current) {
            return;
          }
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
    [direction, id],
  );

  return { request, isLoading, isSubmitting, error, completed, respond };
}
