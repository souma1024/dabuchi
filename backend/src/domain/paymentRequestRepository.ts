export type PaymentRequestStatus = 'pending';

export interface NewPaymentRequest {
  id: string;
  requesterId: string;
  recipientId: string;
  amount: number;
}

export interface SavedPaymentRequest extends NewPaymentRequest {
  status: PaymentRequestStatus;
}

export interface PaymentRequestRepository {
  saveAll: (
    paymentRequests: readonly NewPaymentRequest[],
  ) => Promise<SavedPaymentRequest[]>;
}
