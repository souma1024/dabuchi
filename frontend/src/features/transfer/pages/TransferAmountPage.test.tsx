import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TransferAmountPage } from './TransferAmountPage';

// /api/me が返す現在ユーザー（送金者）。残高で送金上限を判定する。
const CURRENT_USER = {
  id: '11111111-1111-4111-8111-111111111111',
  userId: 'friend-001',
  name: 'テスト送金者',
  profileUrl: '/assets/profiles/human1.png',
  balance: 50000,
};

// 遷移元から渡す実在想定の相手。
const RECIPIENT = {
  id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf009',
  name: 'テスト花子',
};

function meResponse(user: object = CURRENT_USER): Response {
  return new Response(JSON.stringify({ user }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function urlOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') {
    return input;
  }
  return input instanceof URL ? input.href : input.url;
}

function mockApi(options: {
  me?: () => Response | Promise<Response>;
  transfer?: () => Response | Promise<Response>;
}): void {
  vi.mocked(fetch).mockImplementation((input) => {
    const url = urlOf(input);
    if (url.includes('/api/me')) {
      return Promise.resolve(options.me ? options.me() : meResponse());
    }
    if (url.includes('/api/transfers')) {
      return options.transfer
        ? Promise.resolve(options.transfer())
        : Promise.reject(new Error('unexpected transfer call'));
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`));
  });
}

function renderPage(recipient?: { id: string; name: string }) {
  const entries = recipient
    ? [{ pathname: '/transfer', state: { recipient } }]
    : ['/transfer'];
  return render(
    <MemoryRouter initialEntries={entries}>
      <Routes>
        <Route path="/transfer" element={<TransferAmountPage />} />
        <Route path="/recipients" element={<div>相手選択画面へ移動</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function transferCalls() {
  return vi
    .mocked(fetch)
    .mock.calls.filter(([input]) => urlOf(input).includes('/api/transfers'));
}

function idempotencyKeyOf(init: RequestInit | undefined): string | undefined {
  const headers = (init?.headers ?? {}) as Record<string, string>;
  return headers['Idempotency-Key'];
}

describe('TransferAmountPage', () => {
  let uuidCounter = 0;

  beforeEach(() => {
    uuidCounter = 0;
    vi.stubGlobal('fetch', vi.fn());
    // 冪等キーを決定的にし、内容ごとに1回だけ生成されることを検証できるようにする。
    vi.stubGlobal('crypto', {
      randomUUID: () => `test-key-${(uuidCounter += 1)}`,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('現在ユーザーの取得中はローディングを表示する', () => {
    mockApi({ me: () => new Promise<Response>(() => undefined) });
    renderPage(RECIPIENT);

    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('現在ユーザーの取得に失敗したらエラーを表示する', async () => {
    mockApi({ me: () => new Response(null, { status: 500 }) });
    renderPage(RECIPIENT);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('相手が渡されていなければ相手選択画面へリダイレクトする', async () => {
    mockApi({});
    renderPage();

    expect(await screen.findByText('相手選択画面へ移動')).toBeInTheDocument();
    // 送金フォーム（＝モック相手へのフォールバック）は表示しない。
    expect(screen.queryByLabelText('送金金額')).not.toBeInTheDocument();
  });

  it('遷移元から渡された相手を表示する', async () => {
    mockApi({});
    renderPage(RECIPIENT);

    expect(await screen.findByText('テスト花子')).toBeInTheDocument();
  });

  it('左上の戻るボタンで送金相手の選択画面へ戻る', async () => {
    mockApi({});
    const user = userEvent.setup();
    renderPage(RECIPIENT);

    await user.click(await screen.findByRole('button', { name: '戻る' }));

    expect(screen.getByText('相手選択画面へ移動')).toBeInTheDocument();
  });

  it('送金上限額は残高に関わらず常に80,000円と表示する', async () => {
    // 残高は50,000円だが、上限額の表示は80,000円で固定。
    mockApi({});
    renderPage(RECIPIENT);

    expect(await screen.findByText('80,000円')).toBeInTheDocument();
  });

  it('残高ちょうどは送金でき、残高を超えると残高不足で無効になる', async () => {
    // 残高50,000円。上限額(80,000円)以内でも残高を超えたら送れない。
    mockApi({});
    const user = userEvent.setup();
    renderPage(RECIPIENT);

    const input = await screen.findByLabelText('送金金額');
    await user.type(input, '50000');
    expect(screen.queryByText('残高が不足しています')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '送金' })).toBeEnabled();

    await user.clear(input);
    await user.type(input, '50001');
    expect(screen.getByText('残高が不足しています')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '送金' })).toBeDisabled();
  });

  it('残高が十分でも上限額（80,000円）ちょうどまでしか送金できない', async () => {
    // 残高100,000円なら残高は足りるが、1回の上限80,000円で頭打ちになる。
    mockApi({ me: () => meResponse({ ...CURRENT_USER, balance: 100000 }) });
    const user = userEvent.setup();
    renderPage(RECIPIENT);

    const input = await screen.findByLabelText('送金金額');
    await user.type(input, '80000');
    expect(
      screen.queryByText('送金上限額を超えています'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '送金' })).toBeEnabled();

    await user.clear(input);
    await user.type(input, '80001');
    expect(screen.getByText('送金上限額を超えています')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '送金' })).toBeDisabled();
  });

  it('実senderId・recipientId・金額・Idempotency-Keyヘッダで送金し、完了表示する', async () => {
    mockApi({ transfer: () => new Response(null, { status: 201 }) });
    const user = userEvent.setup();
    renderPage(RECIPIENT);

    await user.type(await screen.findByLabelText('送金金額'), '1000');
    await user.click(screen.getByRole('button', { name: '送金' }));

    expect(await screen.findByText('送金しました')).toBeInTheDocument();
    // 残高は反映済みなので「反映されていません」は表示しない。
    expect(
      screen.queryByText('残高の更新はまだ反映されていません。'),
    ).not.toBeInTheDocument();

    const calls = transferCalls();
    expect(calls).toHaveLength(1);
    const [, init] = calls[0] ?? [];
    expect(init?.method).toBe('POST');
    expect(idempotencyKeyOf(init)).toBe('test-key-1');
    expect(init?.body).toBe(
      JSON.stringify({
        senderId: CURRENT_USER.id,
        recipientId: RECIPIENT.id,
        amount: 1000,
      }),
    );
  });

  it('送金APIが失敗したらエラーメッセージを表示する', async () => {
    mockApi({ transfer: () => new Response(null, { status: 500 }) });
    const user = userEvent.setup();
    renderPage(RECIPIENT);

    await user.type(await screen.findByLabelText('送金金額'), '1000');
    await user.click(screen.getByRole('button', { name: '送金' }));

    expect(
      await screen.findByText(
        '送金に失敗しました。時間をおいて再度お試しください。',
      ),
    ).toBeInTheDocument();
  });

  it('残高不足(422)でもエラーメッセージを表示する', async () => {
    mockApi({ transfer: () => new Response(null, { status: 422 }) });
    const user = userEvent.setup();
    renderPage(RECIPIENT);

    await user.type(await screen.findByLabelText('送金金額'), '1000');
    await user.click(screen.getByRole('button', { name: '送金' }));

    expect(
      await screen.findByText(
        '送金に失敗しました。時間をおいて再度お試しください。',
      ),
    ).toBeInTheDocument();
  });

  it('失敗後に再送しても同じIdempotency-Keyを使う', async () => {
    let attempt = 0;
    mockApi({
      transfer: () => {
        attempt += 1;
        return new Response(null, { status: attempt === 1 ? 500 : 201 });
      },
    });
    const user = userEvent.setup();
    renderPage(RECIPIENT);

    await user.type(await screen.findByLabelText('送金金額'), '1000');
    await user.click(screen.getByRole('button', { name: '送金' }));
    await screen.findByText(
      '送金に失敗しました。時間をおいて再度お試しください。',
    );

    await user.click(screen.getByRole('button', { name: '送金' }));
    await screen.findByText('送金しました');

    const keys = transferCalls().map(([, init]) => idempotencyKeyOf(init));
    expect(keys).toEqual(['test-key-1', 'test-key-1']);
  });

  it('金額を変えて再送すると新しいIdempotency-Keyを使う', async () => {
    let attempt = 0;
    mockApi({
      transfer: () => {
        attempt += 1;
        return new Response(null, { status: attempt === 1 ? 500 : 201 });
      },
    });
    const user = userEvent.setup();
    renderPage(RECIPIENT);

    const input = await screen.findByLabelText('送金金額');
    await user.type(input, '1000');
    await user.click(screen.getByRole('button', { name: '送金' }));
    await screen.findByText(
      '送金に失敗しました。時間をおいて再度お試しください。',
    );

    // 金額を変更してから再送 → 別内容なので新しいキーになる。
    await user.clear(input);
    await user.type(input, '2000');
    await user.click(screen.getByRole('button', { name: '送金' }));
    await screen.findByText('送金しました');

    const keys = transferCalls().map(([, init]) => idempotencyKeyOf(init));
    expect(keys).toEqual(['test-key-1', 'test-key-2']);
  });

  it('送信されないメッセージ欄は表示しない', async () => {
    mockApi({});
    renderPage(RECIPIENT);

    await screen.findByLabelText('送金金額');
    expect(
      screen.queryByLabelText('メッセージ（任意）'),
    ).not.toBeInTheDocument();
  });
});
