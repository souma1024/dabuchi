interface ScreenHeaderProps {
  /** 画面名。中央に表示する。 */
  title: string;
  /** 戻る操作。未指定なら戻るボタンは表示しない。 */
  onBack?: () => void;
}

/**
 * 画面上部の共通ヘッダー。左上に戻るボタン、中央に画面名を置く。
 *
 * 相手選択・送金・請求・取引履歴で戻る導線の位置と見た目を揃えるため、各画面から使い回す。
 * 戻り先は画面ごとに異なるため、遷移そのものは呼び出し側がonBackで受け持つ。
 *
 * スクロールしても残す。一覧を下まで追ったときに、今どの画面にいるのか分からなくなり、
 * 戻る操作も一覧の長さだけ遠くなるため。ヘッダーの下に固定したいものを足す画面は、
 * これを含めてまとめてstickyにする（請求履歴のタブなど）。その場合ここのstickyは
 * 外側に吸収され、二重には効かない。
 */
export function ScreenHeader({ title, onBack }: ScreenHeaderProps) {
  return (
    <header className="sticky top-0 z-10 grid grid-cols-[40px_1fr_40px] items-center border-b border-slate-200 bg-white px-3 py-3.5">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="戻る"
          className="h-10 w-10 border-none bg-transparent text-xl text-slate-500"
        >
          ←
        </button>
      ) : (
        <span />
      )}
      <h1 className="m-0 text-center text-base font-semibold text-slate-900">
        {title}
      </h1>
      <span />
    </header>
  );
}
