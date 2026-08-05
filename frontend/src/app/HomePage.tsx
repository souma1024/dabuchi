import { Link } from 'react-router-dom';

import { UserAvatar } from '../features/transfer/components/UserAvatar';
import { currentUser } from '../features/transfer/mockUsers';

// currentUserはprofileUrlを持たないため、暫定で提供画像の1枚を割り当てる。
// 認証を実装したらログインユーザーの画像を使う。画像が無い環境では頭文字表示にフォールバックする。
const currentUserProfileUrl = '/assets/profiles/human1.png';

// お金が出ていく操作はsend、入ってくる操作はrequestとして色を分ける。
// 押し間違いを防ぐため、送金と請求は同じ色にしない。
// noticeは自分が起こす操作ではなく未対応の通知なので、別の色で気づかせる。
type Tone = 'send' | 'request' | 'notice' | 'quiet';

interface MenuItem {
  label: string;
  // 遷移先の画面が未実装の間はnullとし、無効表示にする。
  to: string | null;
  tone: Tone;
}

// お金を動かす操作。対になるため横に並べる。
const actions: MenuItem[] = [
  { label: '送金する', to: '/recipients', tone: 'send' },
  { label: '請求する', to: null, tone: 'request' },
];

// 自分宛の通知。
const notice: MenuItem = {
  label: '請求されている',
  to: null,
  tone: 'notice',
};

// 見る・管理する。
const links: MenuItem[] = [
  { label: '履歴一覧', to: null, tone: 'quiet' },
  { label: '友達管理', to: null, tone: 'quiet' },
];

// 送金画面のボタンと同じ角丸・字面に揃える。
const baseStyle =
  'flex flex-col items-center justify-center rounded-2xl px-4 py-3 text-center font-semibold transition';

// 赤をプロダクトの基調色とし、対になる請求は濃紺で受ける。
const enabledStyles: Record<Tone, string> = {
  send: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
  request: 'bg-slate-800 text-white shadow-sm hover:bg-slate-900',
  notice: 'bg-amber-500 text-white shadow-sm hover:bg-amber-600',
  quiet: 'border border-slate-300 text-slate-700 hover:bg-slate-50',
};

const disabledStyles: Record<Tone, string> = {
  send: 'cursor-not-allowed bg-slate-300 text-white',
  request: 'cursor-not-allowed bg-slate-300 text-white',
  notice: 'cursor-not-allowed bg-slate-300 text-white',
  quiet: 'cursor-not-allowed border border-slate-200 text-slate-400',
};

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

export function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col bg-white">
      <header className="border-b border-slate-200 px-5 py-4">
        <h1 className="m-0 text-base font-semibold text-slate-900">dabuchi</h1>
      </header>

      <section
        aria-label="残高"
        className="flex items-center gap-5 border-b border-slate-200 px-5 py-8"
      >
        {/* アイコンは飾りでタップできない。 */}
        <UserAvatar
          name={currentUser.name}
          profileUrl={currentUserProfileUrl}
          size="large"
        />
        <div>
          <p className="m-0 text-sm text-slate-500">{currentUser.name} さん</p>
          {/* 送金画面の残高表示と同じ「N円」形式に揃える。 */}
          <p className="m-0 text-4xl font-bold tracking-tight text-slate-900">
            {currentUser.zandaka.toLocaleString()}円
          </p>
        </div>
      </section>

      <nav aria-label="メニュー" className="flex flex-1 flex-col gap-3 p-5">
        <div className="grid grid-cols-2 gap-3">
          {actions.map((item) => (
            <MenuButton key={item.label} item={item} />
          ))}
        </div>

        <MenuButton item={notice} />

        <hr className="border-slate-200" />

        {links.map((item) => (
          <MenuButton key={item.label} item={item} />
        ))}
      </nav>
    </main>
  );
}
