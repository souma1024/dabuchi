import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { useRecipientsFromLocationState } from './useRecipientsFromLocationState';

const jiro = { id: '1', name: '佐藤次郎' };
const saburo = { id: '2', name: '佐藤三郎' };

function renderWithState(state: unknown) {
  return renderHook(() => useRecipientsFromLocationState(), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[{ pathname: '/billing', state }]}>
        {children}
      </MemoryRouter>
    ),
  });
}

describe('useRecipientsFromLocationState', () => {
  it('recipientsで渡された相手をそのまま返す', () => {
    const { result } = renderWithState({ recipients: [jiro, saburo] });
    expect(result.current).toEqual([jiro, saburo]);
  });

  it('単一選択の導線（recipient）は1件の配列として返す', () => {
    const { result } = renderWithState({ recipient: jiro });
    expect(result.current).toEqual([jiro]);
  });

  // 既定の相手へフォールバックすると、選んでいない相手へ請求してしまう。
  // 相手が確定できないことをnullで表し、呼び出し側に選び直させる。
  it.each([
    ['stateが無い', undefined],
    ['stateがnull', null],
    ['recipientsもrecipientも無い', {}],
    ['recipientsが空配列', { recipients: [] }],
    ['recipientsが配列でない', { recipients: jiro }],
    ['recipientsにnullが混ざる', { recipients: [jiro, null] }],
    ['recipientsにnameが無い要素が混ざる', { recipients: [jiro, { id: '3' }] }],
    [
      'recipientsにidが空文字の要素が混ざる',
      { recipients: [{ id: '', name: 'テスト' }] },
    ],
    ['recipientが不正', { recipient: { id: '1' } }],
  ])('%s場合はnullを返す', (_label, state) => {
    const { result } = renderWithState(state);
    expect(result.current).toBeNull();
  });

  // backendはrecipientIdの重複を400で拒否するため、送っても必ず失敗する。
  it('recipientsのidが重複している場合はnullを返す', () => {
    const { result } = renderWithState({
      recipients: [jiro, { id: '1', name: '別名の同一ID' }],
    });
    expect(result.current).toBeNull();
  });

  it('recipientsがある場合はrecipientより優先する', () => {
    const { result } = renderWithState({
      recipients: [saburo],
      recipient: jiro,
    });
    expect(result.current).toEqual([saburo]);
  });
});
