import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { currentUser } from '../features/transfer/mockUsers';
import { HomePage } from './HomePage';

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

describe('HomePage', () => {
  it('現在ユーザーの名前と残高を表示する', () => {
    renderHomePage();

    expect(screen.getByText(`${currentUser.name} さん`)).toBeInTheDocument();
    // 送金画面の残高表示と同じ「N円」形式で揃える。
    expect(screen.getByText('80,000円')).toBeInTheDocument();
  });

  it('「送金する」から相手選択画面のパスへ遷移できる', () => {
    renderHomePage();

    expect(screen.getByRole('link', { name: '送金する' })).toHaveAttribute(
      'href',
      '/recipients',
    );
  });

  it('遷移先が未実装のボタンは配置するが押せない', () => {
    renderHomePage();

    for (const label of [
      '請求する',
      '請求されている',
      '履歴一覧',
      '友達管理',
    ]) {
      const button = screen.getByText(label).closest('button');

      expect(button).toBeInTheDocument();
      expect(button).toBeDisabled();
      expect(
        screen.queryByRole('link', { name: label }),
      ).not.toBeInTheDocument();
    }
  });
});
