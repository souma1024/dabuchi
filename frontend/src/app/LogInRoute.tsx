import { useNavigate } from 'react-router-dom';

import { LogInPage } from '../features/auth/pages/LogInPage';

/** ログイン画面をルーティングへ接続するラッパー。 */
export function LogInRoute() {
  const navigate = useNavigate();

  return (
    <LogInPage
      // ログイン前の画面へ戻さないよう、履歴を置き換えてホームへ送る。
      onLoggedIn={() => void navigate('/', { replace: true })}
      onGoToSignUp={() => void navigate('/signup')}
    />
  );
}
