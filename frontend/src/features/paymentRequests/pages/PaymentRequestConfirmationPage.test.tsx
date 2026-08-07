import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as currentUserModule from '../../currentUser/api/fetchCurrentUser';
import {
  fetchPaymentRequest,
  respondToPaymentRequest,
} from '../api/paymentRequestsClient';
import type {
  PaymentRequest,
  PaymentRequestDirection,
  RespondedPaymentRequest,
} from '../types';
import { PaymentRequestConfirmationPage } from './PaymentRequestConfirmationPage';

vi.mock('../api/paymentRequestsClient', () => ({
  fetchPaymentRequest: vi.fn(),
  respondToPaymentRequest: vi.fn(),
}));

const mockedFetch = vi.mocked(fetchPaymentRequest);
const mockedRespond = vi.mocked(respondToPaymentRequest);

const request: PaymentRequest = {
  id: 'payment-request-1',
  counterparty: {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002',
    name: '佐藤 花子',
    profileUrl: '/assets/profiles/human2.png',
  },
  amount: 3000,
  status: 'pending',
  endedByMe: null,
  createdAt: '2026-08-03T01:00:00.000Z',
  respondedAt: null,
};

function stubCurrentUser(balance: number) {
  vi.spyOn(currentUserModule, 'fetchCurrentUser').mockResolvedValue({
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001',
    userId: 'friend-001',
    name: '山田 太郎',
    profileUrl: '/assets/profiles/human1.png',
    balance,
  });
}

const onBack = vi.fn();
const onDone = vi.fn();

function renderPage(
  overrides: Partial<PaymentRequest> | null = {},
  direction: PaymentRequestDirection = 'received',
  balance = 120000,
) {
  stubCurrentUser(balance);
  const found = overrides === null ? null : { ...request, ...overrides };
  mockedFetch.mockResolvedValue(found);
  // 実APIは相手と請求日を返さない。画面は取得済みの請求へ重ねて表示する。
  mockedRespond.mockImplementation((_id, action) =>
    found === null
      ? Promise.reject(new Error('この請求は見つかりませんでした'))
      : Promise.resolve({
          id: found.id,
          amount: found.amount,
          // 拒否も取り消しもrejectedになる。
          status: action === 'accept' ? 'accepted' : 'rejected',
          respondedAt: '2026-08-06T03:00:00.000Z',
        }),
  );

  return render(
    <PaymentRequestConfirmationPage
      direction={direction}
      id={request.id}
      onBack={onBack}
      onDone={onDone}
    />,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  mockedFetch.mockReset();
  mockedRespond.mockReset();
  onBack.mockClear();
  onDone.mockClear();
});

describe('PaymentRequestConfirmationPage', () => {
  it('相手・金額・請求日時を表示する', async () => {
    renderPage();

    expect(await screen.findByText('佐藤 花子 さん')).toBeInTheDocument();
    expect(screen.getByText('3,000円')).toBeInTheDocument();
    expect(screen.getByText('請求日時 8/3 10:00')).toBeInTheDocument();
  });

  it('受けた請求では承認と拒否を出す', async () => {
    renderPage();

    expect(
      await screen.findByRole('button', { name: '承認して送金する' }),
    ).toBeEnabled();
    expect(screen.getByRole('button', { name: '拒否する' })).toBeEnabled();
  });

  // 払えなくても断る判断はできるべきなので、拒否は押せるままにする。
  it('残高が足りなければ承認だけ無効にする', async () => {
    renderPage({}, 'received', 500);

    await screen.findByText('佐藤 花子 さん');

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: '承認して送金する' }),
      ).toBeDisabled();
    });
    expect(screen.getByRole('button', { name: '拒否する' })).toBeEnabled();
    expect(screen.getByText('残高が足りません')).toBeInTheDocument();
    expect(screen.getByText('2,500円 足りません')).toBeInTheDocument();
  });

  it('承認すると送金完了を表示する', async () => {
    renderPage();

    await userEvent.click(
      await screen.findByRole('button', { name: '承認して送金する' }),
    );

    expect(await screen.findByText('送金しました')).toBeInTheDocument();
    // 残高が変わったので、確認できるホームへ戻す。
    await userEvent.click(screen.getByRole('button', { name: 'ホームに戻る' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('拒否すると拒否した旨を表示する', async () => {
    renderPage();

    await userEvent.click(
      await screen.findByRole('button', { name: '拒否する' }),
    );

    expect(await screen.findByText('請求を拒否しました')).toBeInTheDocument();
    // 残高は変わらないので、来た一覧へ戻して作業を続けられるようにする。
    await userEvent.click(screen.getByRole('button', { name: '一覧に戻る' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onDone).not.toHaveBeenCalled();
  });

  // 取り消しは請求履歴からしか来ないため、ホームへ戻すと来た場所と違う画面になる。
  it('取り消し後は一覧へ戻す', async () => {
    renderPage({}, 'sent');

    await userEvent.click(
      await screen.findByRole('button', { name: '請求を取り消す' }),
    );

    expect(await screen.findByText('請求を取り消しました')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '一覧に戻る' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onDone).not.toHaveBeenCalled();
  });

  // 拒否と取り消しはどちらもrejectedになるため、状態だけ見ていると同じに見える。
  // 実APIは別エンドポイントで、押せる人も逆（rejectは被請求者、cancelは請求者）。
  // 取り消しをrejectで送ると403になるため、送っている操作名まで固定する。
  it('拒否と取り消しを別の操作として送る', async () => {
    renderPage();
    const respond = mockedRespond;

    await userEvent.click(
      await screen.findByRole('button', { name: '拒否する' }),
    );
    await screen.findByText('請求を拒否しました');
    expect(respond).toHaveBeenLastCalledWith(request.id, 'reject');

    cleanup();
    renderPage({}, 'sent');

    await userEvent.click(
      await screen.findByRole('button', { name: '請求を取り消す' }),
    );
    await screen.findByText('請求を取り消しました');
    expect(respond).toHaveBeenLastCalledWith(request.id, 'cancel');
  });

  // 取り消しはお金が動かないため、残高を出さず操作も1つだけにする。
  it('出した請求では取り消しだけを出し、残高を出さない', async () => {
    renderPage({}, 'sent');

    expect(
      await screen.findByRole('button', { name: '請求を取り消す' }),
    ).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: '承認して送金する' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('残高')).not.toBeInTheDocument();
  });

  // 一覧を読み込んだ後に相手が処理した場合。実行できるボタンを出さない。
  it('すでに支払い済みなら実行させない', async () => {
    renderPage({ status: 'accepted' });

    expect(
      await screen.findByText('この請求は支払い済みです'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '承認して送金する' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '一覧に戻る' }),
    ).toBeInTheDocument();
  });

  // endedByMeが欠けたときだけ、行為者を示さない言い方へ落とす。
  it('誰が終わらせたか不明なら行為者を示さない言い方にする', async () => {
    renderPage({ status: 'rejected', endedByMe: null });

    expect(
      await screen.findByText('この請求はキャンセルされました'),
    ).toBeInTheDocument();
  });

  // 「キャンセルされました」だけでは、相手が取り下げたのか自分が何かしたのか
  // 分からない。拒否できるのは被請求者、取り下げられるのは請求者だけなので、
  // directionとendedByMeの組み合わせで操作が一意に決まる。
  it.each([
    ['received', true, 'この請求を拒否しました'],
    ['received', false, '相手が請求を取り下げました'],
    ['sent', true, 'この請求は取り下げ済みです'],
    ['sent', false, '相手が請求を拒否しました'],
  ] as const)(
    '%s で endedByMe=%s なら「%s」と伝える',
    async (direction, endedByMe, message) => {
      renderPage({ status: 'rejected', endedByMe }, direction);

      expect(await screen.findByText(message)).toBeInTheDocument();
    },
  );

  // 承認できるのは被請求者だけなので、endedByMeを見るまでもなく行為者は決まる。
  // 出した請求側は、取り下げようとして相手の支払いに負けたときにここへ来る。
  it('出した請求が支払われていれば相手が支払ったと伝える', async () => {
    renderPage({ status: 'accepted', endedByMe: false }, 'sent');

    expect(await screen.findByText('相手が支払いました')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '請求を取り消す' }),
    ).not.toBeInTheDocument();
  });

  // 取り下げと支払いが同時なら、後着はサーバーが409で弾く。
  // 取り下げた側の画面は、残高が動いたことまで分かるようにする。
  it('取り下げに失敗したら相手が支払ったことを伝える', async () => {
    stubCurrentUser(120000);
    mockedFetch
      .mockResolvedValueOnce(request)
      .mockResolvedValue({ ...request, status: 'accepted', endedByMe: false });
    mockedRespond.mockRejectedValue(
      new Error('この請求はすでに処理されています'),
    );

    render(
      <PaymentRequestConfirmationPage
        direction="sent"
        id={request.id}
        onBack={onBack}
        onDone={onDone}
      />,
    );

    await userEvent.click(
      await screen.findByRole('button', { name: '請求を取り消す' }),
    );

    expect(await screen.findByText('相手が支払いました')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '請求を取り消す' }),
    ).not.toBeInTheDocument();
  });

  // 実行が弾かれる原因の多くは、画面の情報が古いこと（相手が先に終わらせた等）。
  // 古いまま残すと決着済みの請求に実行ボタンが出たままになり、押しても同じ失敗を
  // 繰り返す。実データでも、取り消しと承認が同時なら後着はサーバーが409で弾く。
  it('実行に失敗したら取り直して決着済みの画面にする', async () => {
    stubCurrentUser(120000);
    mockedFetch
      .mockResolvedValueOnce(request)
      .mockResolvedValue({ ...request, status: 'rejected', endedByMe: false });
    mockedRespond.mockRejectedValue(
      new Error('この請求はすでに処理されています'),
    );

    render(
      <PaymentRequestConfirmationPage
        direction="received"
        id={request.id}
        onBack={onBack}
        onDone={onDone}
      />,
    );

    await userEvent.click(
      await screen.findByRole('button', { name: '承認して送金する' }),
    );

    // 何が起きたのかを、行為者まで含めて伝える。
    expect(
      await screen.findByText('相手が請求を取り下げました'),
    ).toBeInTheDocument();
    // 押しても同じ失敗を繰り返すだけのボタンは残さない。
    expect(
      screen.queryByRole('button', { name: '承認して送金する' }),
    ).not.toBeInTheDocument();
  });

  it('請求が見つからなければ実行させない', async () => {
    renderPage(null);

    expect(
      await screen.findByText('この請求は見つかりませんでした'),
    ).toBeInTheDocument();
  });

  // ボタンだけ無効化しても、矢印が生きていれば送金の最中に画面を離れられる。
  // 処理はサーバー側で完了するため、利用者は結果を見ないまま去ることになる。
  it('実行中は戻る矢印を出さない', async () => {
    stubCurrentUser(120000);
    mockedFetch.mockResolvedValue(request);
    // 送信中の状態で止めて観察する。
    mockedRespond.mockReturnValue(new Promise(() => {}));

    render(
      <PaymentRequestConfirmationPage
        direction="received"
        id={request.id}
        onBack={onBack}
        onDone={onDone}
      />,
    );
    expect(
      await screen.findByRole('button', { name: '戻る' }),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: '承認して送金する' }),
    );

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: '戻る' }),
      ).not.toBeInTheDocument();
    });
  });

  // お金が動く操作なので、連打しても1度しか実行されないようにする。
  it('連打しても1度しか実行しない', async () => {
    renderPage();
    const spy = mockedRespond;
    const button = await screen.findByRole('button', {
      name: '承認して送金する',
    });

    await userEvent.click(button);
    await userEvent.click(button);

    await screen.findByText('送金しました');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  // 押した瞬間と処理される瞬間の間にも時間差があるため、実行時にも状態を見る。
  it('実行時に処理済みだったらエラーを伝える', async () => {
    renderPage();
    mockedRespond.mockRejectedValue(
      new Error('この請求はすでに処理されています'),
    );

    await userEvent.click(
      await screen.findByRole('button', { name: '承認して送金する' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'この請求はすでに処理されています',
    );
  });

  // 確認画面はidが変わっても再描画で済むため、フックの状態が持ち越される。
  // 前の請求が残ると、新しい請求の取得中に古い金額のまま操作できてしまう。
  it('idが変わったら前の請求を表示しない', async () => {
    stubCurrentUser(120000);
    const other: PaymentRequest = {
      ...request,
      id: 'payment-request-2',
      amount: 8800,
      counterparty: { ...request.counterparty, name: '鈴木 一郎' },
    };
    // 2件目の取得は保留し、切り替え直後の表示を観察する。
    let resolveOther: (value: PaymentRequest) => void = () => {};
    mockedFetch.mockResolvedValueOnce(request).mockReturnValueOnce(
      new Promise<PaymentRequest>((resolve) => {
        resolveOther = resolve;
      }),
    );

    const { rerender } = render(
      <PaymentRequestConfirmationPage
        direction="received"
        id={request.id}
        onBack={onBack}
        onDone={onDone}
      />,
    );
    await screen.findByText('佐藤 花子 さん');

    rerender(
      <PaymentRequestConfirmationPage
        direction="received"
        id={other.id}
        onBack={onBack}
        onDone={onDone}
      />,
    );

    // 取得が終わるまでは、前の相手も金額も出さない。
    expect(screen.queryByText('佐藤 花子 さん')).not.toBeInTheDocument();
    expect(screen.queryByText('3,000円')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '承認して送金する' }),
    ).not.toBeInTheDocument();

    resolveOther(other);
    expect(await screen.findByText('鈴木 一郎 さん')).toBeInTheDocument();
  });

  // 操作の結果は相手と請求日を返さないため、取得済みの請求へ重ねている。
  // 送信中にidが変わると、前の請求の結果を新しい請求へ重ねてしまう。
  it('送信中にidが変わったら前の請求の結果を混ぜない', async () => {
    stubCurrentUser(120000);
    const other: PaymentRequest = {
      ...request,
      id: 'payment-request-2',
      amount: 8800,
      counterparty: { ...request.counterparty, name: '鈴木 一郎' },
    };
    mockedFetch.mockImplementation((id) =>
      Promise.resolve(id === request.id ? request : other),
    );
    // 1件目の操作は、切り替えた後に返す。
    let resolveRespond: (value: RespondedPaymentRequest) => void = () => {};
    mockedRespond.mockReturnValueOnce(
      new Promise<RespondedPaymentRequest>((resolve) => {
        resolveRespond = resolve;
      }),
    );

    const { rerender } = render(
      <PaymentRequestConfirmationPage
        direction="received"
        id={request.id}
        onBack={onBack}
        onDone={onDone}
      />,
    );
    await userEvent.click(
      await screen.findByRole('button', { name: '承認して送金する' }),
    );

    rerender(
      <PaymentRequestConfirmationPage
        direction="received"
        id={other.id}
        onBack={onBack}
        onDone={onDone}
      />,
    );
    await screen.findByText('鈴木 一郎 さん');

    resolveRespond({
      id: request.id,
      amount: request.amount,
      status: 'accepted',
      respondedAt: '2026-08-06T03:00:00.000Z',
    });

    // 前の請求の結果で完了表示に切り替わらず、金額も混ざらない。
    await waitFor(() => {
      expect(screen.getByText('8,800円')).toBeInTheDocument();
    });
    expect(screen.queryByText('送金しました')).not.toBeInTheDocument();
    expect(screen.queryByText('3,000円')).not.toBeInTheDocument();
  });
});
