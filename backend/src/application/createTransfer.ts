import type {
  NewTransfer,
  SavedTransfer,
  TransferRepository,
} from '../domain/transferRepository.js';

const MAX_USER_ID_LENGTH = 64;

export class InvalidTransferError extends Error {}

export class CreateTransfer {
  constructor(private readonly repository: TransferRepository) {}

  async execute(input: unknown): Promise<SavedTransfer> {
    return this.repository.save(parseTransfer(input));
  }
}

function parseTransfer(input: unknown): NewTransfer {
  if (typeof input !== 'object' || input === null) {
    throw new InvalidTransferError('userId and amount are required');
  }

  const { userId, amount } = input as Record<string, unknown>;

  if (
    typeof userId !== 'string' ||
    userId.trim().length === 0 ||
    userId.length > MAX_USER_ID_LENGTH
  ) {
    throw new InvalidTransferError(
      `userId must be a non-empty string up to ${MAX_USER_ID_LENGTH} characters`,
    );
  }

  if (!Number.isSafeInteger(amount) || (amount as number) <= 0) {
    throw new InvalidTransferError('amount must be a positive safe integer');
  }

  return { userId, amount: amount as number };
}
