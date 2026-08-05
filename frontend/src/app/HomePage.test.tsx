import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchCurrentUser } from '../features/currentUser/api/fetchCurrentUser';
import { HomePage } from './HomePage';

vi.mock('../features/currentUser/api/fetchCurrentUser', () => ({
  fetchCurrentUser: vi.fn(),
}));

const mockedFetchCurrentUser = vi.mocked(fetchCurrentUser);

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    mockedFetchCurrentUser.mockReset();
    mockedFetchCurrentUser.mockResolvedValue({
      id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001',
      name: '山田 太郎',
      profileUrl: '/assets/profiles/human1.png',
      balance: 120000,
    });
  });

  it('現在ユーザーの名前と残高を表示する', async () => {
    renderHomePage();

    expect(await screen.findByText('山田 太郎 さん')).toBeInTheDocument();
    expect(screen.getByText('120,000円')).toBeInTheDocument();
  });

  it('取得に失敗したらエラーを表示し、メニューは操作できる', async () => {
    mockedFetchCurrentUser.mockRejectedValue(
      new Error('ユーザー情報の取得に失敗しました (HTTP 500)'),
    );

    renderHomePage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'ユーザー情報の取得に失敗しました (HTTP 500)',
    );
    expect(screen.getByRole('link', { name: '送金する' })).toBeInTheDocument();
  });

  it('「送金する」から相手選択画面のパスへ遷移できる', async () => {
    renderHomePage();

    await screen.findByText('山田 太郎 さん');

    expect(screen.getByRole('link', { name: '送金する' })).toHaveAttribute(
      'href',
      '/recipients',
    );
  });

  it('遷移先が未実装のボタンは配置するが押せない', async () => {
    renderHomePage();

    await screen.findByText('山田 太郎 さん');

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
