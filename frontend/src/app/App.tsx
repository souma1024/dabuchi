import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { TransactionsRoute } from './TransactionsRoute';
import { TransferAmountPage } from '../features/transfer/pages/TransferAmountPage';
import { HomePage } from './HomePage';
import { RecipientSelectionRoute } from './RecipientSelectionRoute';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/recipients" element={<RecipientSelectionRoute />} />
        <Route path="/transfer" element={<TransferAmountPage />} />
        <Route path="/transactions" element={<TransactionsRoute />} />
      </Routes>
    </BrowserRouter>
  );
}
