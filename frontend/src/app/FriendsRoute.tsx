import { useNavigate } from 'react-router-dom';

import { FriendsPage } from '../features/friends/pages/FriendsPage';

/**
 * 友達管理画面をルーティングへ接続するラッパー。戻る→ホーム。
 * 対象ユーザーはserver側のログイン中ユーザーから決まるため、ここでは渡さない。
 */
export function FriendsRoute() {
  const navigate = useNavigate();

  return (
    // 他の画面と同じく、戻るは常にホームへ。履歴を積まないようreplaceする。
    <FriendsPage
      onBack={() => void navigate('/', { replace: true })}
      onOpenBlockedFriends={() => void navigate('/friends/blocked')}
    />
  );
}
