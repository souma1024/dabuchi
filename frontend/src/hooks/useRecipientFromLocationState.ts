import { useLocation } from 'react-router-dom';

import type { Recipient } from '../types/user';

interface RecipientLocationState {
  recipient: Recipient;
}

function isRecipient(value: unknown): value is Recipient {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { id?: unknown }).id === 'string' &&
    typeof (value as { name?: unknown }).name === 'string'
  );
}

function isRecipientLocationState(
  state: unknown,
): state is RecipientLocationState {
  return (
    typeof state === 'object' &&
    state !== null &&
    'recipient' in state &&
    isRecipient((state as { recipient?: unknown }).recipient)
  );
}

// 相手選択画面は別担当が実装するため、遷移元から渡されなかった／不正な場合はdefaultRecipientにフォールバックする。
export function useRecipientFromLocationState(
  defaultRecipient: Recipient,
): Recipient {
  const location = useLocation();

  return isRecipientLocationState(location.state)
    ? location.state.recipient
    : defaultRecipient;
}
