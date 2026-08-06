export type TransactionDirection = 'sent' | 'received';

export interface TransactionCounterparty {
  id: string;
  name: string;
  profileUrl: string;
}

export interface Transaction {
  id: string;
  counterparty: TransactionCounterparty;
  amount: number;
  direction: TransactionDirection;
  createdAt: string;
}

export interface TransactionRecord {
  id: string;
  counterpartyId: string;
  counterpartyName: string;
  counterpartyProfileUrl: string;
  amount: number;
  direction: TransactionDirection;
  createdAt: string;
}
