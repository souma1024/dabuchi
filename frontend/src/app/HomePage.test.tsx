import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchCurrentUser } from '../features/currentUser/api/fetchCurrentUser';
import { HomePage } from './HomePage';

// NotAuthenticatedErrorはuseCurrentUserがinstanceofで判定するため、実物を残す。
vi.mock(
  '../features/currentUser/api/fetchCurrentUser',
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import('../features/currentUser/api/fetchCurrentUser')
    >()),
    fetchCurrentUser: vi.fn(),
  }),
);

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
      userId: 'friend-001',
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

  it('友達追加で伝えるための自分のuser_idを表示する', async () => {
    renderHomePage();

    expect(await screen.findByText('ID: friend-001')).toBeInTheDocument();
  });

  it.each([
    ['送金する', '/recipients'],
    ['履歴一覧', '/transactions'],
    ['友達管理', '/friends'],
  ])('「%s」から%sへ遷移できる', async (label, path) => {
    renderHomePage();

    await screen.findByText('山田 太郎 さん');

    expect(screen.getByRole('link', { name: label })).toHaveAttribute(
      'href',
      path,
    );
  });

  it('「請求する」は相手選択画面へ請求目的で遷移する', async () => {
    renderHomePage();

    await screen.findByText('山田 太郎 さん');

    expect(screen.getByRole('link', { name: '請求する' })).toHaveAttribute(
      'href',
      '/recipients?purpose=billing',
    );
  });

  it('請求されているはボタンではなく一覧として表示する', async () => {
    renderHomePage();

    await screen.findByText('山田 太郎 さん');

    // ボタンは廃止し、下部のセクションが役割を引き継いでいる（Issue #44）。
    expect(screen.queryByText('請求されている')).not.toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: /請求されています/ }),
    ).toBeInTheDocument();
  });
});
