import type {
  NewTransfer,
  SavedTransfer,
  TransferRepository,
} from '../domain/transferRepository.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class InvalidTransferError extends Error {}
export class TransferParticipantNotFoundError extends Error {
  constructor() {
    super('senderId or recipientId was not found.');
    this.name = 'TransferParticipantNotFoundError';
  }
}
export class InsufficientBalanceError extends Error {
  constructor() {
    super('sender does not have enough balance.');
    this.name = 'InsufficientBalanceError';
  }
}
// 同じ冪等性キーが、内容の異なる送金に再利用された場合の競合（HTTPでは409相当）。
export class IdempotencyKeyConflictError extends Error {
  constructor() {
    super('idempotencyKey was reused for a different transfer.');
    this.name = 'IdempotencyKeyConflictError';
  }
}

export class CreateTransfer {
  constructor(private readonly repository: TransferRepository) {}

  /**
   * 送金する。送信者は認証済みユーザーで固定し、request bodyからは受け取らない。
   * bodyで指定できると、他人になりすまして送金できてしまうため。
   */
  async execute(
    senderId: string,
    input: unknown,
    idempotencyKey: unknown,
  ): Promise<SavedTransfer> {
    const transfer = parseTransfer(senderId, input);
    return this.repository.save({
      ...transfer,
      idempotencyKey: parseIdempotencyKey(idempotencyKey),
    });
  }
}

// 冪等性キー(Idempotency-Keyヘッダ)。送金の重複実行を防ぐため必須とする。
const MAX_IDEMPOTENCY_KEY_LENGTH = 64;

function parseIdempotencyKey(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidTransferError('Idempotency-Key header is required');
  }
  if (value.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    throw new InvalidTransferError(
      `Idempotency-Key must be at most ${MAX_IDEMPOTENCY_KEY_LENGTH} characters`,
    );
  }
  return value;
}

function parseTransfer(senderId: string, input: unknown): NewTransfer {
  if (typeof input !== 'object' || input === null) {
    throw new InvalidTransferError('recipientId and amount are required');
  }

  // bodyにsenderIdがあっても読まない。送信者は認証済みユーザーで決まる。
  const { recipientId, amount } = input as Record<string, unknown>;

  if (!UUID_PATTERN.test(senderId)) {
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
