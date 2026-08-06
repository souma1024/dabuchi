import { useNavigate } from 'react-router-dom';

import { BlockedFriendsPage } from '../features/friends/pages/BlockedFriendsPage';

/** ブロックリスト画面をルーティングへ接続するラッパー。戻る→友達管理。 */
export function BlockedFriendsRoute() {
  const navigate = useNavigate();

  // ここだけは戻り先がホームではなく友達管理。呼び出し元へ素直に戻す。
  return <BlockedFriendsPage onBack={() => void navigate(-1)} />;
}
