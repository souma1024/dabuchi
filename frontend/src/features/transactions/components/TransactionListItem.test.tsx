import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Transaction } from '../types';
import { TransactionListItem } from './TransactionListItem';

const baseTransaction: Transaction = {
  id: 'mock-transaction-01',
  counterparty: {
    id: 'friend-002',
    name: '佐藤 花子',
    profileUrl: '/assets/profiles/human2.png',
  },
  amount: 3000,
  // APIと同じISO 8601のUTC。JSTでは8/5 14:30。
  createdAt: '2026-08-05T05:30:00.000Z',
  direction: 'sent',
};

function renderItem(transaction: Transaction) {
  return render(
    <ul>
      <TransactionListItem transaction={transaction} />
    </ul>,
  );
}

describe('TransactionListItem', () => {
  it('相手の名前・金額・日時を表示する', () => {
    renderItem(baseTransaction);

    expect(screen.getByText('佐藤 花子')).toBeInTheDocument();
    expect(screen.getByText('3,000円')).toBeInTheDocument();
    expect(screen.getByText('8/5 14:30')).toBeInTheDocument();
  });

  it('相手のアイコンを表示する', () => {
    renderItem(baseTransaction);

    expect(screen.getByAltText('佐藤 花子')).toHaveAttribute(
      'src',
      '/assets/profiles/human2.png',
    );
  });

  it('送金は「送金」バッジを表示する', () => {
    renderItem(baseTransaction);

    expect(screen.getByText('送金')).toBeInTheDocument();
    expect(screen.queryByText('受取')).not.toBeInTheDocument();
  });

  it('受取は「受取」バッジを表示する', () => {
    renderItem({ ...baseTransaction, direction: 'received' });

    expect(screen.getByText('受取')).toBeInTheDocument();
    expect(screen.queryByText('送金')).not.toBeInTheDocument();
  });

  it('送金と受取で金額の色を変える', () => {
    const { unmount } = renderItem(baseTransaction);
    expect(screen.getByText('3,000円')).toHaveClass('text-red-700');
    unmount();

    renderItem({ ...baseTransaction, direction: 'received' });
    expect(screen.getByText('3,000円')).toHaveClass('text-emerald-700');
  });

  it('遷移先が無いため行はボタンやリンクにしない', () => {
    renderItem(baseTransaction);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
