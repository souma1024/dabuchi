import { CurrentUserNotFoundError } from './errors/currentUserNotFoundError.js';
import type { CurrentUserRepository } from './ports/currentUserRepository.js';
import type {
  NewPaymentRequest,
  PaymentRequestRepository,
  SavedPaymentRequest,
} from '../domain/paymentRequestRepository.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_REQUESTS_PER_CALL = 50;

interface PaymentRequestItem {
  recipientId: string;
  amount: number;
}

export class InvalidPaymentRequestError extends Error {}

export class PaymentRequestParticipantNotFoundError extends Error {
  constructor() {
    super('One or more recipients were not found.');
    this.name = 'PaymentRequestParticipantNotFoundError';
  }
}

export type PaymentRequestIdGenerator = () => string;

export class CreatePaymentRequests {
  constructor(
    private readonly currentUserRepository: CurrentUserRepository,
    private readonly paymentRequestRepository: PaymentRequestRepository,
    private readonly generateId: PaymentRequestIdGenerator,
  ) {}

  async execute(
    currentUserId: string,
    input: unknown,
  ): Promise<SavedPaymentRequest[]> {
    const items = parsePaymentRequestItems(input);
    const currentUser =
      await this.currentUserRepository.findByUserId(currentUserId);

    if (!currentUser) {
      throw new CurrentUserNotFoundError();
    }

    if (
      items.some(
        ({ recipientId }) =>
          recipientId.toLowerCase() === currentUser.id.toLowerCase(),
      )
    ) {
      throw new InvalidPaymentRequestError(
        'The current user cannot request payment from themselves.',
      );
    }

    const paymentRequests: NewPaymentRequest[] = items.map((item) => ({
      id: this.generateId(),
      requesterId: currentUser.id,
      ...item,
    }));

    return this.paymentRequestRepository.saveAll(paymentRequests);
  }
}

function parsePaymentRequestItems(input: unknown): PaymentRequestItem[] {
  if (typeof input !== 'object' || input === null) {
    throw new InvalidPaymentRequestError('requests must be an array.');
  }

  const { requests } = input as Record<string, unknown>;

  if (!Array.isArray(requests) || requests.length === 0) {
    throw new InvalidPaymentRequestError(
      'requests must contain at least one item.',
    );
  }

  if (requests.length > MAX_REQUESTS_PER_CALL) {
    throw new InvalidPaymentRequestError(
      `requests must contain at most ${MAX_REQUESTS_PER_CALL} items.`,
    );
  }

  const items = requests.map(parsePaymentRequestItem);
  const recipientIds = items.map(({ recipientId }) =>
    recipientId.toLowerCase(),
  );

  if (new Set(recipientIds).size !== recipientIds.length) {
    throw new InvalidPaymentRequestError('recipientId must be unique.');
  }

  return items;
}

function parsePaymentRequestItem(
  value: unknown,
  index: number,
): PaymentRequestItem {
  if (typeof value !== 'object' || value === null) {
    throw new InvalidPaymentRequestError(`requests[${index}] is invalid.`);
  }

  const { recipientId, amount } = value as Record<string, unknown>;

  if (typeof recipientId !== 'string' || !UUID_PATTERN.test(recipientId)) {
    throw new InvalidPaymentRequestError(
      `requests[${index}].recipientId must be a UUID.`,
    );
  }

  if (!Number.isSafeInteger(amount) || (amount as number) <= 0) {
    throw new InvalidPaymentRequestError(
      `requests[${index}].amount must be a positive safe integer.`,
    );
  }

  return { recipientId, amount: amount as number };
}
