import { currentUser } from '../../lib/mockUsers';
import type { BillingRequest } from './types';

// バックエンドの請求一覧APIが未確定のため、画面確認用に用意したモック。
export const billingRequests: BillingRequest[] = [
  {
    id: '101',
    requesterUserId: currentUser.id,
    billedUserId: '2',
    amount: 3000,
    createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: '102',
    requesterUserId: currentUser.id,
    billedUserId: '4',
    amount: 1500,
    createdAt: '2026-08-03T18:30:00.000Z',
  },
];
