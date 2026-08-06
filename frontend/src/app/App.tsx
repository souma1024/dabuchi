import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { BillingAmountPage } from '../features/billing/pages/BillingAmountPage';
import { TransferAmountPage } from '../features/transfer/pages/TransferAmountPage';
import { HomePage } from './HomePage';
import { RecipientSelectionRoute } from './RecipientSelectionRoute';
import { TransactionsRoute } from './TransactionsRoute';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/recipients" element={<RecipientSelectionRoute />} />
        <Route path="/transfer" element={<TransferAmountPage />} />
        <Route path="/billing" element={<BillingAmountPage />} />
        <Route path="/transactions" element={<TransactionsRoute />} />
      </Routes>
    </BrowserRouter>
  );
}
