import { useState } from 'react';

import type { Recipient } from '../../../types/user';

interface BillingAmountsState {
  /** 被請求者IDごとの入力値。未入力の相手はキー自体を持たない。 */
  amounts: Record<string, string>;
  /** 一括入力の起点になっている欄。まだ誰も入力していなければnull。 */
  autofillSourceId: string | null;
  /** 一括入力が有効か。個別編集が始まると二度と戻らない。 */
  isAutofillActive: boolean;
}

export interface UseBillingAmountsResult {
  /** 被請求者IDごとの入力値。未入力は空文字。 */
  amounts: Record<string, string>;
  /** 一括入力が有効な間はtrue。案内文の出し分けに使う。 */
  isAutofillActive: boolean;
  setAmount: (recipientId: string, value: string) => void;
}

/**
 * 請求金額の入力状態。人数が多いとき同額を何度も打たせないよう、
 * 最初に入力した欄の値を全員へ反映する。
 *
 * 「一度だけ」の実現方法: 最初に触れた欄を一括入力の起点として覚え、
 * その欄の編集中だけ全員へ同期する。別の欄を編集した時点で同期を終了し、
 * 以降はすべて個別編集になる（起点の欄を編集し直しても再開しない）。
 * 1文字ずつchangeが発火するため、「最初の1イベントだけ同期」にすると
 * 「1000」と打っても「1」しか配られない。起点の欄という単位で扱う必要がある。
 */
export function useBillingAmounts(
  recipients: Recipient[],
): UseBillingAmountsResult {
  const [state, setState] = useState<BillingAmountsState>({
    amounts: {},
    autofillSourceId: null,
    isAutofillActive: true,
  });

  const setAmount = (recipientId: string, value: string) => {
    setState((previous) => {
      const isAutofillTarget =
        previous.isAutofillActive &&
        (previous.autofillSourceId === null ||
          previous.autofillSourceId === recipientId);

      if (!isAutofillTarget) {
        return {
          amounts: { ...previous.amounts, [recipientId]: value },
          autofillSourceId: previous.autofillSourceId,
          isAutofillActive: false,
        };
      }

      return {
        amounts: Object.fromEntries(
          recipients.map((recipient) => [recipient.id, value]),
        ),
        autofillSourceId: recipientId,
        isAutofillActive: true,
      };
    });
  };

  return {
    amounts: state.amounts,
    isAutofillActive: state.isAutofillActive,
    setAmount,
  };
}
