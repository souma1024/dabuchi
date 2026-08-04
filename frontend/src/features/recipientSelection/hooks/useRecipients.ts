import { useEffect, useState } from 'react';

import { fetchRecipients } from '../api/fetchRecipients';
import type { Recipient } from '../types';

/** 送金相手一覧の読み込み状態。 */
export type RecipientsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; recipients: Recipient[] };

/** 送金相手一覧を取得し、読み込み状態とともに返すフック。 */
export function useRecipients(currentUserId: string): RecipientsState {
  const [state, setState] = useState<RecipientsState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    fetchRecipients(currentUserId, controller.signal)
      .then((recipients) => {
        setState({ status: 'success', recipients });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        const message =
          error instanceof Error ? error.message : '不明なエラーが発生しました';
        setState({ status: 'error', message });
      });

    return () => {
      controller.abort();
    };
  }, [currentUserId]);

  return state;
}
