import { BrowserRouter, Route, Routes } from 'react-router-dom';

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
      </Routes>
    </BrowserRouter>
  );
}
