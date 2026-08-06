import { useLocation } from 'react-router-dom';

import type { Recipient } from '../types/user';
import { isRecipient } from './useRecipientFromLocationState';

/**
 * 遷移元で選ばれた請求相手を読む。相手選択画面はstate.recipientsへ配列で渡す。
 * 単一選択の導線から来た場合に備えてstate.recipientも1件の配列として受け付ける。
 *
 * 未選択・不正なstateではnullを返し、既定の相手へフォールバックしない。
 * 請求は金融操作であり、選んでいない相手への請求が登録される事故を防ぐため、
 * 「相手が分からない」ことを呼び出し側へ明示する必要がある。
 */
export function useRecipientsFromLocationState(): Recipient[] | null {
  const location = useLocation();

  return parseRecipientsState(location.state);
}

function parseRecipientsState(state: unknown): Recipient[] | null {
  if (typeof state !== 'object' || state === null) {
    return null;
  }

  const { recipients, recipient } = state as {
    recipients?: unknown;
    recipient?: unknown;
  };

  if (recipients !== undefined) {
    return parseRecipients(recipients);
  }

  return isRecipient(recipient) ? [recipient] : null;
}

function parseRecipients(value: unknown): Recipient[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  if (!value.every(isRecipient)) {
    return null;
  }

  // backendはrecipientIdの重複を400で拒否する。送っても必ず失敗するため、
  // 重複を含むstateは不正として扱い、相手選択からやり直させる。
  const ids = value.map(({ id }) => id.toLowerCase());
  if (new Set(ids).size !== ids.length) {
    return null;
  }

  return value;
}
