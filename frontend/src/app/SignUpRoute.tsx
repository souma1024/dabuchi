import { useNavigate } from 'react-router-dom';

import { SignUpPage } from '../features/auth/pages/SignUpPage';

/** 新規登録画面をルーティングへ接続するラッパー。 */
export function SignUpRoute() {
  const navigate = useNavigate();

  return (
    <SignUpPage
      onSignedUp={() => void navigate('/', { replace: true })}
      onGoToLogIn={() => void navigate('/login', { replace: true })}
    />
  );
}
