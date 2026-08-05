import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { BillingAmountPage } from '../features/billing/pages/BillingAmountPage';
import { BillingRequestListPage } from '../features/billing/pages/BillingRequestListPage';
import { TransferAmountPage } from '../features/transfer/pages/TransferAmountPage';
import { HomePage } from './HomePage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/transfer" element={<TransferAmountPage />} />
        <Route path="/billing" element={<BillingAmountPage />} />
        <Route path="/billing/requests" element={<BillingRequestListPage />} />
      </Routes>
    </BrowserRouter>
  );
}
