import { Navigate, Outlet } from 'react-router-dom';

import { useCurrentUser } from '../features/currentUser/hooks/useCurrentUser';

/**
 * ログインしていない場合にログイン画面へ送るルートガード。
 *
 * 判定はサーバーの`GET /api/me`に任せる。clientでセッションの有無を持つと、
 * 期限切れやログアウト済みのときに実際の状態とずれるため。
 */
export function RequireSession() {
  const { isLoading, isNotAuthenticated } = useCurrentUser();

  if (isLoading) {
    // 判定前に画面を出すと、ログイン済みでも一瞬ログイン画面が見えてしまう。
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center bg-white">
        <p className="text-slate-500">読み込み中…</p>
      </main>
    );
  }

  if (isNotAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 取得失敗（通信断など）は各画面がそれぞれ表示する。ここでは通す。
  return <Outlet />;
}
