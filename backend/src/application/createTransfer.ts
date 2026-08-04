import type {
  NewTransfer,
  SavedTransfer,
  TransferRepository,
} from '../domain/transferRepository.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class InvalidTransferError extends Error {}

export class CreateTransfer {
  constructor(private readonly repository: TransferRepository) {}

  async execute(input: unknown): Promise<SavedTransfer> {
    return this.repository.save(parseTransfer(input));
  }
}

function parseTransfer(input: unknown): NewTransfer {
  if (typeof input !== 'object' || input === null) {
    throw new InvalidTransferError(
      'senderId, recipientId and amount are required',
    );
  }

  const { senderId, recipientId, amount } = input as Record<string, unknown>;

  if (typeof senderId !== 'string' || !UUID_PATTERN.test(senderId)) {
    throw new InvalidTransferError('senderId must be a UUID');
  }

  if (typeof recipientId !== 'string' || !UUID_PATTERN.test(recipientId)) {
    throw new InvalidTransferError('recipientId must be a UUID');
  }

  if (senderId.toLowerCase() === recipientId.toLowerCase()) {
    throw new InvalidTransferError(
      'senderId and recipientId must be different',
    );
  }

  if (!Number.isSafeInteger(amount) || (amount as number) <= 0) {
    throw new InvalidTransferError('amount must be a positive safe integer');
  }

  return { senderId, recipientId, amount: amount as number };
}
