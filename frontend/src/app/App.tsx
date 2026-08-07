import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { BillingAmountPage } from '../features/billing/pages/BillingAmountPage';
import { TransferAmountPage } from '../features/transfer/pages/TransferAmountPage';
import { BlockedFriendsRoute } from './BlockedFriendsRoute';
import { LogInRoute } from './LogInRoute';
import { RequireSession } from './RequireSession';
import { SignUpRoute } from './SignUpRoute';
import { FriendsRoute } from './FriendsRoute';
import { HomePage } from './HomePage';
import { PaymentRequestHistoryRoute } from './PaymentRequestHistoryRoute';
import { RecipientSelectionRoute } from './RecipientSelectionRoute';
import { TransactionsRoute } from './TransactionsRoute';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LogInRoute />} />
        <Route path="/signup" element={<SignUpRoute />} />

        {/* 以降はログインが要る画面。未ログインならログイン画面へ送る。 */}
        <Route element={<RequireSession />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/recipients" element={<RecipientSelectionRoute />} />
          <Route path="/transfer" element={<TransferAmountPage />} />
          <Route path="/billing" element={<BillingAmountPage />} />
          <Route path="/transactions" element={<TransactionsRoute />} />
          <Route
            path="/payment-requests"
            element={<PaymentRequestHistoryRoute />}
          />
          <Route path="/friends" element={<FriendsRoute />} />
          <Route path="/friends/blocked" element={<BlockedFriendsRoute />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
