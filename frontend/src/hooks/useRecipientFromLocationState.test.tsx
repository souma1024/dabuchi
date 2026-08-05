import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { useRecipientFromLocationState } from './useRecipientFromLocationState';

const defaultRecipient = { id: '1', name: 'デフォルト太郎' };

function renderWithState(state: unknown) {
  return renderHook(() => useRecipientFromLocationState(defaultRecipient), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[{ pathname: '/', state }]}>
        {children}
      </MemoryRouter>
    ),
  });
}

describe('useRecipientFromLocationState', () => {
  it('stateが渡されない場合はdefaultRecipientを返す', () => {
    const { result } = renderWithState(undefined);
    expect(result.current).toEqual(defaultRecipient);
  });

  it('有効なrecipientが渡された場合はそれを返す', () => {
    const recipient = { id: '9', name: 'テスト花子' };
    const { result } = renderWithState({ recipient });
    expect(result.current).toEqual(recipient);
  });

  it.each([
    ['recipientがnull', { recipient: null }],
    ['recipientが空オブジェクト', { recipient: {} }],
    ['recipientにnameがない', { recipient: { id: '9' } }],
  ])('不正なstate（%s）の場合はdefaultRecipientを返す', (_label, state) => {
    const { result } = renderWithState(state);
    expect(result.current).toEqual(defaultRecipient);
  });
});
