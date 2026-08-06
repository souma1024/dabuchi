import type { PaymentRequestCursor } from '../../application/ports/paymentRequestListRepository.js';
import { isRealMysqlDateTime } from '../../shared/mysqlDateTime.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function encodePaymentRequestCursor(
  cursor: PaymentRequestCursor,
): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodePaymentRequestCursor(
  value: string,
): PaymentRequestCursor | null {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    );

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('createdAt' in parsed) ||
      !('id' in parsed) ||
      typeof parsed.createdAt !== 'string' ||
      typeof parsed.id !== 'string' ||
      !isRealMysqlDateTime(parsed.createdAt) ||
      !isUuid(parsed.id)
    ) {
      return null;
    }

    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return null;
  }
}
