import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { PaymentRequest } from '../types';
import { PaymentRequestListItem } from './PaymentRequestListItem';

const baseRequest: PaymentRequest = {
  id: 'payment-request-1',
  counterparty: {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002',
    name: '佐藤 花子',
    profileUrl: '/assets/profiles/human2.png',
  },
  amount: 3000,
  status: 'pending',
  createdAt: '2026-08-03T01:00:00.000Z',
  respondedAt: null,
};

function renderItem(request: PaymentRequest = baseRequest) {
  return render(
    <MemoryRouter>
      <ul>
        <PaymentRequestListItem request={request} direction="received" />
      </ul>
    </MemoryRouter>,
  );
}

describe('PaymentRequestListItem', () => {
  it('相手の氏名を表示する', () => {
    renderItem();

    expect(screen.getByText('佐藤 花子')).toBeInTheDocument();
  });

  it('金額を3桁区切りで表示する', () => {
    renderItem({ ...baseRequest, amount: 1234567 });

    expect(screen.getByText('1,234,567円')).toBeInTheDocument();
  });

  it('請求日時をJSTで表示する', () => {
    renderItem();

    expect(screen.getByText('8/3 10:00')).toBeInTheDocument();
  });

  // 自分が払う側なので、送金と同じ「出ていくお金」の色にする。
  it('金額を送金と同じ赤で表示する', () => {
    renderItem();

    expect(screen.getByText('3,000円')).toHaveClass('text-red-700');
  });

  // 決着していない請求だけ、確認画面へ進める（Issue #61）。
  it('未払いなら確認画面へのリンクにする', () => {
    renderItem();

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/payment-requests/payment-request-1?direction=received',
    );
  });

  it('決着済みならリンクにしない', () => {
    renderItem({ ...baseRequest, status: 'accepted' });

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
