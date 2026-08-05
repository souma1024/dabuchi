import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BillingRequestListPage } from './BillingRequestListPage';

describe('BillingRequestListPage', () => {
  it('請求した相手・金額・日時を一覧表示する', () => {
    render(<BillingRequestListPage />);

    expect(screen.getByText('佐藤次郎')).toBeInTheDocument();
    expect(screen.getByText('3,000円')).toBeInTheDocument();
    expect(screen.getByText('佐々木花子')).toBeInTheDocument();
    expect(screen.getByText('1,500円')).toBeInTheDocument();
    expect(screen.getAllByText(/2026/)).toHaveLength(2);
  });
});
