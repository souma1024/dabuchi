import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { signUp } from '../api/authClient';
import { SignUpPage } from './SignUpPage';

vi.mock('../api/authClient', () => ({
  logIn: vi.fn(),
  signUp: vi.fn(),
}));

const mockedSignUp = vi.mocked(signUp);

function renderPage() {
  const onSignedUp = vi.fn();
  const onGoToLogIn = vi.fn();

  render(<SignUpPage onSignedUp={onSignedUp} onGoToLogIn={onGoToLogIn} />);

  return { onSignedUp, onGoToLogIn };
}

function fill() {
  fireEvent.change(screen.getByLabelText('名前'), {
    target: { value: '新井 太郎' },
  });
  fireEvent.change(screen.getByLabelText('ユーザーID'), {
    target: { value: 'arai-taro' },
  });
  fireEvent.change(screen.getByLabelText('パスワード'), {
    target: { value: 'dabuchi-dev' },
  });
}

describe('SignUpPage', () => {
  beforeEach(() => {
    mockedSignUp.mockReset();
  });

  it('入力が揃うまで登録できない', () => {
    renderPage();

    expect(screen.getByRole('button', { name: '登録する' })).toBeDisabled();

    fill();

    expect(screen.getByRole('button', { name: '登録する' })).toBeEnabled();
  });

  it('登録できたら親へ通知する', async () => {
    mockedSignUp.mockResolvedValue(undefined);
    const { onSignedUp } = renderPage();

    fill();
    fireEvent.click(screen.getByRole('button', { name: '登録する' }));

    await waitFor(() => {
      expect(onSignedUp).toHaveBeenCalledTimes(1);
    });
    expect(mockedSignUp).toHaveBeenCalledWith({
      userId: 'arai-taro',
      password: 'dabuchi-dev',
      name: '新井 太郎',
    });
  });

  it('使われているユーザーIDなら理由を表示する', async () => {
    mockedSignUp.mockRejectedValue(
      new Error('そのユーザーIDはすでに使われています'),
    );
    const { onSignedUp } = renderPage();

    fill();
    fireEvent.click(screen.getByRole('button', { name: '登録する' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'そのユーザーIDはすでに使われています',
    );
    expect(onSignedUp).not.toHaveBeenCalled();
  });

  // 友達追加で相手に伝えるIDなので、何に使う値かを入力前に示す。
  it('ユーザーIDの使いみちを添える', () => {
    renderPage();

    expect(
      screen.getByText(/友達追加のときに相手へ伝えるID/),
    ).toBeInTheDocument();
  });
});
