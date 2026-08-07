import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  stubAuthenticatedSession,
  stubUnauthenticatedSession,
} from '../test/session';
import { App } from './App';

describe('RequireSession', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('未ログインならログイン画面へ送る', async () => {
    stubUnauthenticatedSession();

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'ログイン' }),
    ).toBeInTheDocument();
    // 戻る操作でログインが要る画面へ戻らないよう、履歴は置き換える。
    expect(window.location.pathname).toBe('/login');
  });

  it('ログイン済みならそのまま画面を出す', async () => {
    stubAuthenticatedSession();

    render(<App />);

    expect(await screen.findByText('山田 太郎 さん')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('判定が終わるまでは画面を出さない', () => {
    // 応答しないfetchで、判定中の状態を作る。
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {})),
    );

    render(<App />);

    // ログイン済みでも一瞬ログイン画面が見えると誤解を招くため、どちらも出さない。
    expect(screen.getByText('読み込み中…')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'ログイン' }),
    ).not.toBeInTheDocument();
  });

  it('ログイン画面は未ログインでも開ける', async () => {
    stubUnauthenticatedSession();
    window.history.pushState({}, '', '/signup');

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'アカウントを作る' }),
    ).toBeInTheDocument();
  });
});
