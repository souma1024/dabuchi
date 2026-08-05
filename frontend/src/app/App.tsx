import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';

import { RecipientSelectionScreen } from '../features/recipientSelection/RecipientSelectionScreen';
import type { Recipient } from '../features/recipientSelection/types';
import { TransferAmountPage } from '../features/transfer/pages/TransferAmountPage';
import { HomePage } from './HomePage';

// 認証が未実装のため、暫定で環境変数（未設定なら開発シードfriend-001のUUID）を現在ユーザーとして扱う。
// バックエンドはcurrentUserIdにUUID（内部id）を要求する。
const CURRENT_USER_ID: string =
  import.meta.env.VITE_CURRENT_USER_ID ??
  '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001';

function RecipientSelectionRoute() {
  const navigate = useNavigate();

  return (
    <RecipientSelectionScreen
      currentUserId={CURRENT_USER_ID}
      onBack={() => void navigate('/')}
      onSelectRecipient={(recipient: Recipient) =>
        // TransferAmountPage は location.state.recipient({id,name,profileUrl}) を読む。
        void navigate('/transfer', {
          state: {
            recipient: {
              id: recipient.id,
              name: recipient.name,
              profileUrl: recipient.imageUrl,
            },
          },
        })
      }
    />
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/recipients" element={<RecipientSelectionRoute />} />
        <Route path="/transfer" element={<TransferAmountPage />} />
      </Routes>
    </BrowserRouter>
  );
}
