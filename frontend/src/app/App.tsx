import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { TransferAmountPage } from '../features/transfer/pages/TransferAmountPage';
import { HomePage } from './HomePage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/transfer" element={<TransferAmountPage />} />
      </Routes>
    </BrowserRouter>
  );
}
