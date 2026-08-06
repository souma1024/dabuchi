import { Link } from 'react-router-dom';

import { UserAvatar } from '../components/UserAvatar';
import { useCurrentUser } from '../features/currentUser/hooks/useCurrentUser';
import { ReceivedPaymentRequestSection } from '../features/paymentRequests/components/ReceivedPaymentRequestSection';

// お金が出ていく操作はsend、入ってくる操作はrequestとして色を分ける。
// 押し間違いを防ぐため、送金と請求は同じ色にしない。
type Tone = 'send' | 'request' | 'quiet';

interface MenuItem {
  label: string;
  // 遷移先の画面が未実装の間はnullとし、無効表示にする。
  to: string | null;
  tone: Tone;
}

// お金を動かす操作。対になるため横に並べる。
const actions: MenuItem[] = [
  { label: '送金する', to: '/recipients', tone: 'send' },
  { label: '請求する', to: '/recipients?purpose=billing', tone: 'request' },
];

// 見る・管理する。
const links: MenuItem[] = [
  { label: '履歴一覧', to: '/transactions', tone: 'quiet' },
  { label: '友達管理', to: '/friends', tone: 'quiet' },
];

// 送金画面のボタンと同じ角丸・字面に揃える。
const baseStyle =
  'flex flex-col items-center justify-center rounded-2xl px-4 py-3 text-center font-semibold transition';

// 赤をプロダクトの基調色とし、対になる請求は濃紺で受ける。
const enabledStyles: Record<Tone, string> = {
  send: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
  request: 'bg-slate-800 text-white shadow-sm hover:bg-slate-900',
  quiet: 'border border-slate-300 text-slate-700 hover:bg-slate-50',
};

const disabledStyles: Record<Tone, string> = {
  send: 'cursor-not-allowed bg-slate-300 text-white',
  request: 'cursor-not-allowed bg-slate-300 text-white',
  quiet: 'cursor-not-allowed border border-slate-200 text-slate-400',
};

const balanceSectionStyle =
  'flex min-h-[7.5rem] items-center gap-5 border-b border-slate-200 px-5 py-8';

function MenuButton({ item }: { item: MenuItem }) {
  const sizeStyle = item.tone === 'quiet' ? 'text-sm' : 'text-base';

  // 遷移先が未実装のボタンは、文言を足さず押せないことだけで示す。
  if (item.to === null) {
    return (
      <button
        type="button"
        disabled
        className={`${baseStyle} ${sizeStyle} ${disabledStyles[item.tone]}`}
      >
        {item.label}
      </button>
    );
  }

  return (
    <Link
      to={item.to}
      className={`${baseStyle} ${sizeStyle} ${enabledStyles[item.tone]}`}
    >
      {item.label}
    </Link>
  );
}

/** 現在ユーザーの氏名・残高・アイコンを表示する。取得中と失敗時も高さを保つ。 */
function BalanceSection() {
  const { currentUser, isLoading, error } = useCurrentUser();

  if (isLoading) {
    return (
      <section aria-label="残高" className={balanceSectionStyle}>
        <div
          aria-hidden="true"
          className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-slate-200"
        />
        <div className="flex-1">
          <div
            aria-hidden="true"
            className="h-4 w-24 animate-pulse rounded bg-slate-200"
          />
          <div
            aria-hidden="true"
            className="mt-2 h-8 w-44 animate-pulse rounded bg-slate-200"
          />
        </div>
        <span className="sr-only">残高を読み込み中</span>
      </section>
    );
  }

  if (error !== null || currentUser === null) {
    return (
      <section aria-label="残高" className={balanceSectionStyle}>
        <p role="alert" className="m-0 text-sm text-slate-500">
          {error ?? 'ユーザー情報の取得に失敗しました'}
        </p>
      </section>
    );
  }

  return (
    <section aria-label="残高" className={balanceSectionStyle}>
      {/* アイコンは飾りでタップできない。 */}
      <UserAvatar
        name={currentUser.name}
        profileUrl={currentUser.profileUrl}
        size="large"
      />
      <div>
        <p className="m-0 text-sm text-slate-500">{currentUser.name} さん</p>
        {/* 送金画面の残高表示と同じ「N円」形式に揃える。 */}
        <p className="m-0 text-4xl font-bold tracking-tight text-slate-900">
          {currentUser.balance.toLocaleString()}円
        </p>
      </div>
    </section>
  );
}

export function HomePage() {
  return (
    // 残高とメニューは常に見えるようにし、請求リストだけをスクロールさせる。
    // ページ全体がスクロールすると、一覧に入った時点で残高が画面外へ消えるため。
    <main className="mx-auto flex h-dvh w-full max-w-[420px] flex-col overflow-hidden bg-white">
      <header className="border-b border-slate-200 px-5 py-4">
        <h1 className="m-0 text-base font-semibold text-slate-900">dabuchi</h1>
      </header>

      <BalanceSection />

      <nav aria-label="メニュー" className="flex flex-col gap-3 p-5">
        <div className="grid grid-cols-2 gap-3">
          {actions.map((item) => (
            <MenuButton key={item.label} item={item} />
          ))}
        </div>

        <hr className="border-slate-200" />

        {links.map((item) => (
          <MenuButton key={item.label} item={item} />
        ))}
      </nav>

      <ReceivedPaymentRequestSection />
    </main>
  );
}
