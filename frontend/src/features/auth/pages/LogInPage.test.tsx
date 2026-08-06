import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logIn } from '../api/authClient';
import { LogInPage } from './LogInPage';

vi.mock('../api/authClient', () => ({
  logIn: vi.fn(),
  signUp: vi.fn(),
}));

const mockedLogIn = vi.mocked(logIn);

function renderPage(overrides: Partial<Parameters<typeof LogInPage>[0]> = {}) {
  const onLoggedIn = overrides.onLoggedIn ?? vi.fn();
  const onGoToSignUp = overrides.onGoToSignUp ?? vi.fn();

  render(<LogInPage onLoggedIn={onLoggedIn} onGoToSignUp={onGoToSignUp} />);

  return { onLoggedIn, onGoToSignUp };
}

function fill(userId: string, password: string) {
  fireEvent.change(screen.getByLabelText('ユーザーID'), {
    target: { value: userId },
  });
  fireEvent.change(screen.getByLabelText('パスワード'), {
    target: { value: password },
  });
}

describe('LogInPage', () => {
  beforeEach(() => {
    mockedLogIn.mockReset();
  });

  it('入力が揃うまでログインできない', () => {
    renderPage();

    expect(screen.getByRole('button', { name: 'ログイン' })).toBeDisabled();

    fill('friend-001', 'dabuchi-dev');

    expect(screen.getByRole('button', { name: 'ログイン' })).toBeEnabled();
  });

  it('ログインできたら親へ通知する', async () => {
    mockedLogIn.mockResolvedValue(undefined);
    const { onLoggedIn } = renderPage();

    fill('friend-001', 'dabuchi-dev');
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() => {
      expect(onLoggedIn).toHaveBeenCalledTimes(1);
    });
    expect(mockedLogIn).toHaveBeenCalledWith('friend-001', 'dabuchi-dev');
  });

  it('失敗したら理由を表示し、画面はそのままにする', async () => {
    mockedLogIn.mockRejectedValue(
      new Error('ユーザーIDかパスワードが違います'),
    );
    const { onLoggedIn } = renderPage();

    fill('friend-001', 'wrong');
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'ユーザーIDかパスワードが違います',
    );
    expect(onLoggedIn).not.toHaveBeenCalled();
  });

  it('パスワードは伏せ字で入力させる', () => {
    renderPage();

    expect(screen.getByLabelText('パスワード')).toHaveAttribute(
      'type',
      'password',
    );
  });

  it('新規登録への導線から親へ通知する', () => {
    const { onGoToSignUp } = renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'アカウントを作る' }));

    expect(onGoToSignUp).toHaveBeenCalledTimes(1);
  });
});
